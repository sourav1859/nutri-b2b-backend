import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, hasPermission, requirePermission, requireRole } from "./lib/auth";
import { handleError, ValidationError, NotFoundError, AuthenticationError, AuthorizationError, ConflictError } from "./lib/errors";
import { handleIdempotency, storeIdempotencyResponse, withIdempotency } from "./lib/idempotency";
import { auditAction, auditHealthAccess, auditHealthMiddleware } from "./lib/audit";
import { calculateHealthMetrics, DEFAULT_CONDITION_RULES, scoreProductForHealth } from "./lib/health";
import { createResumableUpload } from "./lib/supabase";
import { queue } from "./lib/queue";
import { readDb } from "./lib/database";
import { queueProcessor } from "./workers/queue-processor";
import { insertProductSchema, insertCustomerSchema, insertCustomerHealthProfileSchema, insertIngestionJobSchema, insertWebhookEndpointSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Start queue processor
  await queueProcessor.start();

  // Middleware for authentication and vendor context
  async function withAuth(req: any, res: any, next: any) {
    try {
      const context = await requireAuth(req);
      req.auth = context;
      next();
    } catch (error) {
      handleError(new AuthenticationError((error as Error).message), req, res);
    }
  }

  // Route: GET /api/v1/health - Health check
  app.get('/api/v1/health', async (req, res) => {
    try {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/metrics - System metrics
  app.get('/api/v1/metrics', withAuth, async (req, res) => {
    try {
      const metrics = await storage.getSystemMetrics();
      const dbHealth = await storage.getDatabaseHealth();
      
      res.json({
        ...metrics,
        database: dbHealth
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/vendors - List vendors
  app.get('/api/v1/vendors', withAuth, async (req, res) => {
    try {
      requireRole(req.auth, 'superadmin');
      const vendors = await storage.getVendors();
      
      await auditAction(req.auth, 'list_vendors', 'vendors', undefined, undefined, undefined, req);
      
      res.json({ data: vendors });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: POST /api/v1/vendors - Create vendor
  app.post('/api/v1/vendors', withAuth, async (req, res) => {
    try {
      requireRole(req.auth, 'superadmin');
      
      const validated = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validated);
      
      await auditAction(req.auth, 'create_vendor', 'vendors', vendor.id, undefined, vendor, req);
      
      res.status(201).json({ data: vendor });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/products - List products with filters
  app.get('/api/v1/products', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:products');
      
      const { q, brand, category_id, tags, allergens, updated_after, sort = '-updated_at', cursor, limit = 50 } = req.query;
      
      // Use read replica for search queries
      const isSearchQuery = q || brand || tags || allergens;
      
      let products;
      if (isSearchQuery && q) {
        products = await storage.searchProducts(req.auth.vendorId, q as string, {
          brand: brand as string,
          categoryId: category_id as string,
          tags: tags ? (tags as string).split(',') : undefined,
          allergens: allergens ? (allergens as string).split(',') : undefined,
          limit: parseInt(limit as string)
        });
      } else {
        products = await storage.getProducts(req.auth.vendorId, {
          brand: brand as string,
          categoryId: category_id as string,
          updatedAfter: updated_after as string,
          sort: sort as string,
          limit: parseInt(limit as string)
        });
      }

      // Include freshness indicator for read replica queries
      const response: any = { data: products };
      if (isSearchQuery) {
        response.freshness = 'fresh'; // In production, check actual replica lag
      }
      
      res.json(response);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: POST /api/v1/products - Batch create/update products
  app.post('/api/v1/products', withAuth, withIdempotency(async (req: any, res: any, vendorId: string) => {
    try {
      requirePermission(req.auth, 'write:products');
      
      const products = Array.isArray(req.body) ? req.body : [req.body];
      
      if (products.length === 0) {
        throw new ValidationError('Request body must contain at least one product');
      }
      
      if (products.length > 10000) {
        throw new ValidationError('Cannot process more than 10,000 products per batch');
      }

      const validated = products.map(product => 
        insertProductSchema.parse({ ...product, vendorId })
      );

      const result = await storage.createProducts(validated);
      
      await auditAction(req.auth, 'batch_create_products', 'products', undefined, undefined, { count: result.length }, req);
      
      const response = { data: result, count: result.length };
      res.status(201).json(response);
      return response;
    } catch (error) {
      throw error;
    }
  }), async (req, res) => {
    handleError(error, req, res);
  });

  // Route: GET /api/v1/products/:id - Get single product
  app.get('/api/v1/products/:id', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:products');
      
      const product = await storage.getProduct(req.params.id, req.auth.vendorId);
      if (!product) {
        throw new NotFoundError('Product', req.params.id);
      }
      
      res.json({ data: product });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: PATCH /api/v1/products/:id - Update product
  app.patch('/api/v1/products/:id', withAuth, withIdempotency(async (req: any, res: any, vendorId: string) => {
    try {
      requirePermission(req.auth, 'write:products');
      
      const before = await storage.getProduct(req.params.id, req.auth.vendorId);
      if (!before) {
        throw new NotFoundError('Product', req.params.id);
      }

      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, req.auth.vendorId, updates);
      
      await auditAction(req.auth, 'update_product', 'products', req.params.id, before, product, req);
      
      const response = { data: product };
      res.json(response);
      return response;
    } catch (error) {
      throw error;
    }
  }), async (req, res) => {
    handleError(error, req, res);
  });

  // Route: DELETE /api/v1/products/:id - Soft delete product
  app.delete('/api/v1/products/:id', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'write:products');
      
      const before = await storage.getProduct(req.params.id, req.auth.vendorId);
      if (!before) {
        throw new NotFoundError('Product', req.params.id);
      }

      const success = await storage.deleteProduct(req.params.id, req.auth.vendorId);
      if (!success) {
        throw new NotFoundError('Product', req.params.id);
      }
      
      await auditAction(req.auth, 'delete_product', 'products', req.params.id, before, undefined, req);
      
      res.status(204).send();
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/customers - List customers
  app.get('/api/v1/customers', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:customers');
      
      const { q, limit = 50 } = req.query;
      
      let customers;
      if (q) {
        customers = await storage.searchCustomers(req.auth.vendorId, q as string, {
          limit: parseInt(limit as string)
        });
      } else {
        customers = await storage.getCustomers(req.auth.vendorId, {
          limit: parseInt(limit as string)
        });
      }
      
      res.json({ data: customers });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: POST /api/v1/customers - Batch create/update customers
  app.post('/api/v1/customers', withAuth, withIdempotency(async (req: any, res: any, vendorId: string) => {
    try {
      requirePermission(req.auth, 'write:customers');
      
      const customers = Array.isArray(req.body) ? req.body : [req.body];
      const validated = customers.map(customer => 
        insertCustomerSchema.parse({ ...customer, vendorId })
      );

      const result = await storage.createCustomers(validated);
      
      await auditAction(req.auth, 'batch_create_customers', 'customers', undefined, undefined, { count: result.length }, req);
      
      const response = { data: result, count: result.length };
      res.status(201).json(response);
      return response;
    } catch (error) {
      throw error;
    }
  }), async (req, res) => {
    handleError(error, req, res);
  });

  // Route: GET /api/v1/customers/:id - Get customer
  app.get('/api/v1/customers/:id', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:customers');
      
      const customer = await storage.getCustomer(req.params.id, req.auth.vendorId);
      if (!customer) {
        throw new NotFoundError('Customer', req.params.id);
      }
      
      res.json({ data: customer });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/customers/:id/health - Get customer health profile
  app.get('/api/v1/customers/:id/health', withAuth, auditHealthMiddleware(async (req: any, res: any, context: any) => {
    try {
      requireRole(context, 'vendor_admin', 'vendor_operator');
      
      // In production, this would fetch from customer_health_profiles table
      const healthProfile = {
        customerId: req.params.id,
        heightCm: 175,
        weightKg: 70,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        conditions: ['diabetes'],
        bmi: 22.86,
        bmr: 1680,
        tdeeCached: 2604,
        derivedLimits: {
          calories: 2604,
          sodium: 1500,
          sugar: 25,
          fiber: 35
        }
      };
      
      res.json({ data: healthProfile });
    } catch (error) {
      throw error;
    }
  }));

  // Route: PUT /api/v1/customers/:id/health - Update customer health profile
  app.put('/api/v1/customers/:id/health', withAuth, auditHealthMiddleware(async (req: any, res: any, context: any) => {
    try {
      requireRole(context, 'vendor_admin', 'vendor_operator');
      
      const validated = insertCustomerHealthProfileSchema.parse({
        ...req.body,
        customerId: req.params.id
      });

      const metrics = calculateHealthMetrics(validated, DEFAULT_CONDITION_RULES);
      
      const healthProfile = {
        ...validated,
        ...metrics
      };
      
      // In production, this would update the customer_health_profiles table
      
      res.json({ data: healthProfile });
    } catch (error) {
      throw error;
    }
  }));

  // Route: POST /api/v1/ingest/csv - Start CSV ingestion
  app.post('/api/v1/ingest/csv', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'write:ingestion');
      
      const { mode } = req.query;
      if (!mode || !['products', 'customers'].includes(mode as string)) {
        throw new ValidationError('Mode must be either "products" or "customers"');
      }

      // Create ingestion job
      const job = await storage.createIngestionJob({
        vendorId: req.auth.vendorId,
        mode: mode as any,
        status: 'queued',
        progressPct: 0,
        attempt: 1,
        params: req.body || {}
      });

      // Create TUS resumable upload URL
      const filePath = `${req.auth.vendorId}/${job.id}/data.csv`;
      const uploadData = await createResumableUpload('csv-uploads', filePath, 10 * 1024 * 1024 * 1024); // 10GB

      // Enqueue the job
      await queue.enqueue(req.auth.vendorId, mode as string, { jobId: job.id });
      
      await auditAction(req.auth, 'start_csv_ingestion', 'ingestion_jobs', job.id, undefined, { mode, jobId: job.id }, req);
      
      res.status(201).json({
        job_id: job.id,
        upload_url: uploadData.signedUrl,
        resumable: true,
        max_file_size: 10 * 1024 * 1024 * 1024
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/jobs/:id - Get job status
  app.get('/api/v1/jobs/:id', withAuth, async (req, res) => {
    try {
      const job = await storage.getIngestionJob(req.params.id);
      if (!job || job.vendorId !== req.auth.vendorId) {
        throw new NotFoundError('Ingestion job', req.params.id);
      }
      
      res.json({ data: job });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/jobs - List ingestion jobs
  app.get('/api/v1/jobs', withAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const jobs = await storage.getIngestionJobs(req.auth.vendorId, status as string);
      
      res.json({ data: jobs });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/search/products - Full-text search products
  app.get('/api/v1/search/products', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:products');
      
      const { q, limit = 50 } = req.query;
      if (!q) {
        throw new ValidationError('Search query "q" is required');
      }

      // Use read replica for search
      const products = await storage.searchProducts(req.auth.vendorId, q as string, {
        limit: parseInt(limit as string)
      });
      
      res.json({
        data: products,
        query: q,
        freshness: 'fresh' // In production, check replica lag
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/matches/:customerId - Get health-aware product matches
  app.get('/api/v1/matches/:customerId', withAuth, async (req, res) => {
    try {
      requirePermission(req.auth, 'read:products');
      requirePermission(req.auth, 'read:customers');
      
      const { k = 20 } = req.query;
      
      // Check if customer exists and belongs to vendor
      const customer = await storage.getCustomer(req.params.customerId, req.auth.vendorId);
      if (!customer) {
        throw new NotFoundError('Customer', req.params.customerId);
      }

      // Get matches (simplified - in production this would use sophisticated health-aware scoring)
      const matches = await storage.getMatches(req.params.customerId, req.auth.vendorId, parseInt(k as string));
      
      res.json({
        data: matches,
        customer_id: req.params.customerId,
        k: parseInt(k as string),
        cached: false // In production, check matches_cache table
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: GET /api/v1/audit - Get audit logs
  app.get('/api/v1/audit', withAuth, async (req, res) => {
    try {
      requireRole(req.auth, 'vendor_admin', 'superadmin');
      
      const { limit = 50, offset = 0 } = req.query;
      const vendorId = req.auth.role === 'superadmin' ? undefined : req.auth.vendorId;
      
      const logs = await storage.getAuditLogs(vendorId, parseInt(limit as string), parseInt(offset as string));
      
      res.json({
        data: logs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Route: POST /api/v1/webhooks/endpoints - Create webhook endpoint
  app.post('/api/v1/webhooks/endpoints', withAuth, withIdempotency(async (req: any, res: any, vendorId: string) => {
    try {
      requireRole(req.auth, 'vendor_admin');
      
      const validated = insertWebhookEndpointSchema.parse({
        ...req.body,
        vendorId
      });

      // In production, store webhook secret in Supabase Vault
      const endpoint = {
        ...validated,
        id: crypto.randomUUID(),
        secretRef: 'vault_secret_id', // Would be actual vault reference
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await auditAction(req.auth, 'create_webhook_endpoint', 'webhook_endpoints', endpoint.id, undefined, endpoint, req);
      
      const response = { data: endpoint };
      res.status(201).json(response);
      return response;
    } catch (error) {
      throw error;
    }
  }), async (req, res) => {
    handleError(error, req, res);
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    handleError(err, req, res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
