import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage.js";
import { requireAuth } from "./lib/auth.js";
import { and, eq, desc, sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import { db } from "./lib/database.js";
import { supabaseAdmin } from "./lib/supabase.js";     // service-role client
import { queue } from "./lib/queue.js";                // your job queue
import { randomUUID } from "crypto";
import Busboy from 'busboy';
import { createClient } from "@supabase/supabase-js";
import multer from "multer";


const upload = multer({ storage: multer.memoryStorage() });
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_BUCKET = process.env.SUPABASE_CSV_BUCKET ?? "ingestion";
const uploadMw = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});


// const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
//   auth: { persistSession: false },
// });
// --- small helpers ---

function modeDir(mode?: string) {
  const m = String(mode || "").toLowerCase();
  if (m.startsWith("product")) return "product";
  if (m.startsWith("customer")) return "customers";
  if (m.startsWith("api")) return "apis";
  return "others";
}

function computeStoragePath(vendorId: string, jobId: string, mode?: string) {
  const dir = modeDir(mode);
  return `vendors/${vendorId}/${dir}/${jobId}_${dir}.csv`;
}

function sniffCsvHeadersFromBuffer(buf: Buffer): string[] {
  const firstLine = buf.toString("utf8").split(/\r?\n/)[0] || "";
  // simple CSV split with quotes
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (inQ && firstLine[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}


async function ensureBucket(name: string) {
  const { data, error } = await supabaseAdmin.storage.listBuckets();
  if (!error && !data?.some(b => b.name === name)) {
    await supabaseAdmin.storage.createBucket(name, { public: false });
  }
}

function ok(res: Response, data: any) {
  res.status(200).json(data);
}

// NORMALIZE service/fallback outputs to a plain array
const asArray = (x: any) => (Array.isArray(x) ? x : (x?.data ?? x?.items ?? []));

// Render a JS string[] as a Postgres text[] literal for Drizzle's sql template
const textArray = (a: string[]) =>
  (a && a.length)
    ? sql`ARRAY[${sql.join(a.map(x => sql`${x}`), sql`, `)}]::text[]`
    : sql`ARRAY[]::text[]`;

// GUARANTEE both _score (0..1) and score_pct (0..100) for the client
const withScorePct = (p: any) => {
  const raw01 =
    typeof p?._score === "number" ? p._score :
    typeof p?.score  === "number" ? p.score  :
    (typeof p?.score_pct === "number" ? p.score_pct / 100 : undefined);
  if (raw01 == null) return p;
  const pct = Math.round(raw01 * 100);
  return { ...p, _score: raw01, score_pct: pct };
};

function problem(res: Response, status: number, detail: string, req: Request) {
  return res
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title: status === 401 ? "Unauthorized" : status === 404 ? "Not Found" : "Error",
      status,
      detail,
      instance: req.path,
    });
}

/**
 * Correct auth wrapper:
 * - delegates to requireAuth(req,res,next)
 * - surfaces auth on both res.locals.auth and req.auth (for backwards compatibility)
 */
const withAuth = (handler: RequestHandler): RequestHandler => {
  return (req: Request & { auth?: any }, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      // mirror onto req.auth for existing code that expects it
      try {
        if (!req.auth) req.auth = (res as any).locals?.auth;
      } catch {}
      return handler(req, res, next);
    });
  };
};

// ---------- ROUTES ----------

export function registerRoutes(app: Express) {
  // health
  app.get("/health", (_req, res) => {
    ok(res, {
      status: "healthy",
      timestamp: sql`now()`,
      version: process.env.npm_package_version ?? "dev",
    });
  });

  // metrics (stub if not implemented in storage)
  app.get("/metrics", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    const vendorId = req.auth?.vendorId ?? null;

    if (typeof s.getSystemMetrics === "function") {
      const metrics = await s.getSystemMetrics(vendorId);
      return ok(res, metrics);
    }

    // fallback stub so the page renders
    return ok(res, {
      uptimeSec: Math.floor(process.uptime()),
      api: "ok",
      vendorId,
      notes: "metrics stub (implement storage.getSystemMetrics to replace)",
    });
  }));

  // vendors (stub if storage.getVendors missing)
  app.get("/vendors", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    if (typeof s.getVendors === "function") {
      const vendors = await s.getVendors();
      return ok(res, { data: vendors });
    }
    return ok(res, { data: [] }); // empty list is fine for the Vendors page
  }));

  // products (list/search)
  app.get("/products", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    const vendorId = req.auth?.vendorId;
  
    const page  = Math.max(1, parseInt((req.query.page  as string) || "1"));
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || "50")));
  
    const q          = (req.query.q as string) || undefined;
    const brand      = (req.query.brand as string) || undefined;
    const status     = (req.query.status as string) || undefined;
    const categoryId = (req.query.category_id as string) || undefined;
  
    // If there's a search term or any filter, use the search path
    if ((q || brand || status || categoryId) && typeof s.searchProducts === "function") {
      // NOTE: if your searchProducts signature is (vendorId, q, opts), this works.
      // If your impl expects a single object, change to: s.searchProducts(vendorId, { q, brand, status, categoryId, page, pageSize: limit })
      const itemsOrResult = await s.searchProducts(
        vendorId,
        q,
        { brand, status, categoryId, page, pageSize: limit }
      );
  
      // Normalize to { data, page, pageSize, total }
      const data  = (itemsOrResult?.items ?? itemsOrResult) || [];
      const total = itemsOrResult?.total ?? (Array.isArray(data) ? data.length : 0);
  
      return ok(res, { data, page, pageSize: limit, total });
    }
  
    // Fallback: plain list (no search/filter)
    if (typeof s.getProducts === "function") {
      const result = await s.getProducts(vendorId, { page, pageSize: limit });
      return ok(res, result);
    }
  
    return ok(res, { data: [], page, pageSize: limit, total: 0 });
  }));

  // product by id
  app.get("/products/:id", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    const vendorId = req.auth?.vendorId;
    if (typeof s.getProduct === "function") {
      const product = await s.getProduct(req.params.id, vendorId);
      if (!product) return problem(res, 404, "Product not found", req);
      return ok(res, product);
    }
    return problem(res, 404, "Product not found", req);
  }));

  // --- CREATE product ---
  app.post("/products", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId;
    if (!vendorId) return problem(res, 403, "No vendor access", req);

    const b = req.body ?? {};

    // helpers
    const toArr = (v: any): string[] | undefined => {
      if (v == null) return undefined;
      if (Array.isArray(v)) return v.filter(Boolean).map(String);
      if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
      return undefined;
    };
    const toNumStr = (n: any): string | undefined => {
      if (n === undefined || n === null || n === "") return undefined;
      const s = String(n);
      return isNaN(Number(s)) ? undefined : s;
    };

    // accept sku/external_id/externalId, require both externalId and name
    const externalId = (b.external_id ?? b.externalId ?? b.sku ?? "").toString().trim();
    const name = (b.name ?? "").toString().trim();
    if (!externalId || !name) {
      return problem(res, 400, "Fields 'name' and 'external_id' (or 'sku') are required", req);
    }

    // map request -> InsertProduct (camelCase)
    const insert: schema.InsertProduct = {
      vendorId,
      externalId,
      name,
      description: b.description ?? null,
      brand: b.brand ?? null,
      status: (b.status ?? "active") as any,                // product_status enum: "active" | "inactive"

      categoryId: b.category_id ?? b.categoryId ?? null,
      subCategoryId: b.sub_category_id ?? b.subCategoryId ?? null,
      cuisineId: b.cuisine_id ?? b.cuisineId ?? null,
      marketId: b.market_id ?? b.marketId ?? null,

      barcode: b.barcode ?? null,
      gtinType: b.gtin_type ?? b.gtinType ?? null,          // enum: "UPC" | "EAN" | "ISBN" (or null)

      price: toNumStr(b.price) ?? null,                     // NUMERIC → send as string
      currency: (b.currency ?? undefined),                  // DB default 'USD' will apply if omitted

      servingSize: b.serving_size ?? b.servingSize ?? null,
      packageWeight: b.package_weight ?? b.packageWeight ?? null,

      nutrition: b.nutrition ?? null,                       // must be an object if provided

      dietaryTags: toArr(b.dietary_tags ?? b.dietaryTags ?? b.tags) ?? null,
      allergens: toArr(b.allergens) ?? null,
      certifications: toArr(b.certifications) ?? null,
      regulatoryCodes: toArr(b.regulatory_codes ?? b.regulatoryCodes) ?? null,

      // your schema has ingredients as a single text field
      ingredients: toArr(b.ingredients) ?? null,

      sourceUrl: b.source_url ?? b.sourceUrl ?? null,
    };

    try {
      const created = await storage.createProducts([insert]);
      return res.status(201).json(created[0]);
    } catch (e: any) {
      console.error("[POST /products]", e);
      return problem(res, 400, e?.message || "Create failed", req);
    }
  }));

  // customers (paged)
  app.get("/customers", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    const vendorId = req.auth?.vendorId ?? null;
    const id = (req.query.id as string) ?? "";
    if (id) {
      if (typeof s.getCustomer === "function") {
        const one = await storage.getCustomerWithProfile(id, vendorId);
        if (!one) return problem(res, 404, "Customer not found", req);
        return ok(res, one); // object payload
      }
      return problem(res, 404, "Customer not found", req);
    }
    const qRaw  = (req.query.q as string) ?? "";
    const q     = qRaw.trim();
    const page  = Math.max(1, parseInt((req.query.page  as string) || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || "50", 10)));
  
    // DEBUG (keep if you need to verify branch)
    // console.log("[/customers] q:", q, "vendorId:", vendorId);
  
    if (q) {
      // Use the adapter's implemented search
      const itemsOrArray =
        typeof s.searchCustomers === "function"
          ? await s.searchCustomers(vendorId, q, { limit, page })
          : await s.getCustomers(vendorId, { limit, page }); // fallback (non-search)
    
      // Frontend accepts array or {data:[...]} — keep it simple here
      return ok(res, (itemsOrArray?.items ?? itemsOrArray) || []);
    }
  
    // Fall back to the list (still supports pagination)
    const items = await s.getCustomers(vendorId, { page, pageSize: limit });
    return ok(res, items);
  }));

  // customer by id
  app.get("/customers/:id", withAuth(async (req: any, res) => {
    const s: any = storage as any;
    const vendorId = req.auth?.vendorId;
    if (typeof s.getCustomer === "function") {
      const customer = await storage.getCustomerWithProfile(req.params.id, vendorId);
      if (!customer) return problem(res, 404, "Customer not found", req);
      return ok(res, customer);
    }
    return problem(res, 404, "Customer not found", req);
  }));

  // UPDATE customer (profile fields)
  app.patch("/customers/:id", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId;
    const userId   = req.auth?.userId ?? null;
    const id       = String(req.params.id);
    if (!vendorId) return problem(res, 403, "No vendor access", req);

    const b = (req.body ?? {}) as any;

    // Normalize tags from multiple shapes → array
    const normalizeTags = (v: any): string[] | undefined => {
      if (Array.isArray(v)) return v.filter(Boolean);
      if (Array.isArray(b.customTags)) return b.customTags.filter(Boolean);
      if (typeof v === "string") {
        return v.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return undefined;
    };

    // Build DB update object (snake_case column names)
    const updates: Partial<typeof schema.customers.$inferInsert> = {};

    if (b.fullName !== undefined || b.name !== undefined) {
      updates.fullName = String(b.fullName ?? b.name).trim();
    }
    if (b.email !== undefined) updates.email = String(b.email).trim();
    if (b.phone !== undefined) updates.phone = String(b.phone).trim();

    const tags = Array.isArray(b.tags) ? b.tags : b.customTags;
    if (tags !== undefined) updates.customTags = tags;

    // Location (jsonb)
    if (b.location && typeof b.location === "object") {
      const l = b.location;
      updates.location = {
        city: typeof l.city === "string" ? l.city.trim() : null,
        state: typeof l.state === "string" ? l.state.trim() : null,
        postal: typeof l.postal === "string" ? l.postal.trim() : null,
        country: typeof l.country === "string" ? l.country.trim().toUpperCase() : null,
      } as any;
    }

    if (req.user?.id) updates.updatedBy = req.user.id;

    // 🔎 Debug
    console.log('[PATCH /customers/:id] body=', b);
    console.log('[PATCH /customers/:id] updates=', updates);
        
    const base = await storage.updateCustomer(id, vendorId, updates);
    if (!base) return problem(res, 404, "Customer not found", req);

    try {
      const withHealth = await storage.getCustomerWithProfile(id, vendorId);
      return ok(res, withHealth ?? base);
    } catch (e: any) {
      console.error("[PATCH /customers/:id]", e);
      return problem(res, 400, e?.message || "Update failed", req);
    }
  }));

  // UPSERT health profile for a customer
  app.patch("/customers/:id/health", withAuth(async (req: any, res) => {
    const vendorId   = req.auth?.vendorId;
    const userId     = req.auth?.userId ?? null;
    const customerId = String(req.params.id);
    if (!vendorId) return problem(res, 403, "No vendor access", req);

    const b = req.body ?? {};

    // Coerce numbers reliably
    const toNum = (v: any) =>
      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
        ? undefined
        : Number(v);

    // Normalize request -> camelCase fields expected by Drizzle
    const patch = {
      heightCm:       toNum(b.heightCm ?? b.height_cm),
      weightKg:       toNum(b.weightKg ?? b.weight_kg),
      age:            b.age !== undefined ? toNum(b.age) : undefined,
      gender:         b.gender ?? undefined,
      activityLevel:  b.activityLevel ?? b.activity_level ?? undefined,
      conditions:     Array.isArray(b.conditions) ? b.conditions : undefined,
      dietGoals:      Array.isArray(b.dietGoals)  ? b.dietGoals  : undefined,
      macroTargets:   b.macroTargets ?? b.macro_targets ?? undefined, // jsonb
      avoidAllergens: Array.isArray(b.avoidAllergens) ? b.avoidAllergens : undefined,
      bmi:            toNum(b.bmi),
      bmr:            toNum(b.bmr),
      tdeeCached:     toNum(b.tdeeCached ?? b.tdee_cached),
      derivedLimits:  b.derivedLimits ?? b.derived_limits ?? undefined,
      updatedBy:      userId,
    };

    // Drop only undefined (so 0 / empty-arrays still update)
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );

    try {
      const row = await storage.upsertCustomerHealth(customerId, vendorId, clean);
      return res.status(200).json(row); // return the updated row in camelCase
    } catch (e: any) {
      return problem(res, 400, e?.message ?? "Health update failed", req);
    }
  }));

  // routes.ts
  app.post("/customers", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId;
    const userId   = req.auth?.userId ?? null;
    if (!vendorId) return problem(res, 403, "No vendor access", req);

    const b = req.body ?? {};

    // Basic customer fields the form already collects
    const customerInput = {
      fullName: b.name ?? b.fullName,    // UI uses "name"
      email: b.email,
      phone: b.phone ?? null,
      customTags: Array.isArray(b.tags) ? b.tags : [],  // tags[]
      // optional sync of age/gender to customers table if given in health
      age: b.health?.age ?? null,
      gender: b.health?.gender ?? null,
      // status is UI-only in your codebase; ignore or map if you add a column later
    };

    // Normalize health (optional block)
    const h = b.health ?? null;
    const toStr = (v: any) =>
      v === undefined || v === null ? null : typeof v === "number" ? String(v) : String(v);
    const toNum = (v: any) =>
      v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? undefined : Number(v);

    const healthInput = h
      ? {
          age: toNum(h.age),
          gender: h.gender ?? undefined,
          activityLevel: h.activityLevel ?? undefined,
          heightCm: h.heightCm !== undefined ? toStr(h.heightCm) : undefined, // numeric -> string
          weightKg: h.weightKg !== undefined ? toStr(h.weightKg) : undefined, // numeric -> string
          conditions: Array.isArray(h.conditions) ? h.conditions : [],
          dietGoals: Array.isArray(h.dietGoals) ? h.dietGoals : [],
          avoidAllergens: Array.isArray(h.avoidAllergens) ? h.avoidAllergens : [],
          macroTargets: h.macroTargets ?? { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 },
          bmi: h.bmi !== undefined ? toStr(h.bmi) : null,
          bmr: h.bmr !== undefined ? toStr(h.bmr) : null,
          tdeeCached: h.tdeeCached !== undefined ? toStr(h.tdeeCached) : null,
          derivedLimits: h.derivedLimits ?? null,
        }
      : null;

    try {
      const created = await storage.createCustomerWithHealth({
        vendorId,
        userId,
        customer: customerInput,
        health: healthInput,
      });
      return res.status(201).json(created);
    } catch (e: any) {
      return problem(res, 400, e?.message ?? "Create customer failed", req);
    }
  }));


  // customer matches (uses services/matching if available)
  app.get("/matching/:customerId", withAuth(async (req: any, res) => {
    const customerId = String(req.params.customerId);
  
    // 1) Source of truth: vendor from the *customer* row
    const row = await db
      .select({ vendorId: schema.customers.vendorId })
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .limit(1);
  
    const vendorId: string | undefined = row?.[0]?.vendorId ?? req.auth?.vendorId;
    if (!vendorId) return ok(res, { data: [] });
  
    // 2) Try the service first
    const USE_SERVICE = process.env.USE_MATCHING_SERVICE === "1";
    if (USE_SERVICE) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const svc = require("./services/matching");
        if (typeof svc.getMatchesForCustomer === "function") {
          const raw = await svc.getMatchesForCustomer(vendorId, customerId, 24);
          const items = asArray(raw).map(withScorePct);
          if (items.length) return ok(res, { data: items });
        }
      } catch {
        // swallow & continue to fallback
      }
    }
  
    // 3) Fallback: simple but faithful prefilter + scoring
    const p = schema.products;
  
    // Bring in a bit of the profile (avoid + limits)
    const chp = schema.customerHealthProfiles;
    const cx = await db
      .select({
        avoidAllergens: chp.avoidAllergens,
        dietGoals:     chp.dietGoals,
        derivedLimits: chp.derivedLimits,
      })
      .from(chp)
      .where(eq(chp.customerId, customerId))
      .limit(1);
  
    const avoidRaw = cx?.[0]?.avoidAllergens ?? [];
    const avoid: string[] = Array.isArray(avoidRaw) ? avoidRaw : [avoidRaw].filter(Boolean);
    const goals  = cx?.[0]?.dietGoals ?? [];
    const limits = (cx?.[0]?.derivedLimits as any) ?? {};
  
    // vendor + active + NOT allergen conflicts
    const base = await db
      .select()
      .from(p)
      .where(and(
        eq(p.vendorId, vendorId),
        eq(p.status, "active"),
        sql`NOT (coalesce(${p.allergens}, '{}') && ${textArray(avoid)})`
      ))
      .orderBy(desc(p.updatedAt))
      .limit(200);
  
    // score like the service: preferences + small sodium penalty; only drop on *known* hard-limit exceed
    const now = Date.now();
    const items = base
      .map((r: any) => {
        // hard-limit reject only if value is known and exceeds (unchanged)
        for (const [k, lim] of Object.entries(limits as Record<string, number>)) {
          const v = r?.nutrition?.[k];
          if (v != null && Number.isFinite(Number(v)) && Number(v) > Number(lim)) return null;
        }

        // preference hit (unchanged)
        const tags: string[] = r.dietaryTags ?? [];
        const hit = goals.length ? goals.filter(g => tags.includes(g)).length / goals.length : 0;

        // sodium soft penalty (unchanged)
        let penalty = 0;
        if (r?.nutrition?.sodium_mg != null && limits?.sodium_mg) {
          const v = Number(r.nutrition.sodium_mg), L = Number(limits.sodium_mg);
          if (Number.isFinite(v) && Number.isFinite(L) && L > 0) {
            penalty = Math.min(0.2, Math.max(0, ((v - 0.5 * L) / (0.5 * L)) * 0.2));
          }
        }

        // small recency boost
        const updated = r.updatedAt ? new Date(r.updatedAt).getTime() : now;
        const ageDays = Math.max(0, (now - updated) / 86_400_000);
        const recency = Math.max(0, 1 - Math.min(ageDays / 90, 1));

        const score01 = Math.max(0, Math.min(1, 0.6 + 0.4 * hit - penalty + 0.05 * recency));
        return { ...r, _score: score01, score_pct: Math.round(score01 * 100), _updatedAtMs: updated };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (b._score - a._score) || (b._updatedAtMs - a._updatedAtMs))
      .slice(0, 24);
  
    return ok(res, { data: items });
  }));
  
  app.delete("/customers/:id", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId;
    const id = String(req.params.id);
    if (!vendorId) return problem(res, 403, "No vendor access", req);
  
    const okDel = await storage.deleteCustomer(id, vendorId);
    if (!okDel) return problem(res, 404, "Customer not found", req);
  
    return res.status(204).send(); // Frontend accepts 204 or 200
  }));


// ─────────────────────────────────────────────────────────────────────────────
// Ingestion endpoints
// ─────────────────────────────────────────────────────────────────────────────

  // Create a job and tell the client where to upload the CSV
  app.post("/jobs", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId as string | undefined;
    if (!vendorId) return res.status(401).json({ message: "Missing vendor" });
    const mode = ((req.query.mode as string) || "products") as "products" | "customers" | "api_sync";

    // create job
    const [job] = await db.insert(schema.ingestionJobs).values({
      vendorId,               // NOTE: camelCase – matches your other tables (e.g., customerId usage)
      mode,
      status: "queued",       // enum-safe; we'll flip to "running" in /start
      progressPct: 0,
      params: { source: "csv" },
    }).returning({ id: schema.ingestionJobs.id });

    const jobId = job.id as string;
    const storagePath = computeStoragePath(vendorId, jobId, mode);
    // after computing storagePath:
    await ensureBucket(CSV_BUCKET); // <— add
    // pre-store exact location so the UI knows and the worker doesn't guess
    await db.update(schema.ingestionJobs)
      .set({ params: { source: "csv", bucket: CSV_BUCKET, path: storagePath } })
      .where(eq(schema.ingestionJobs.id, jobId));

    return ok(res, { jobId, bucket: CSV_BUCKET, path: storagePath });
  }));

  type MulterRequest = Request & {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  };  
  // Upload the CSV (multipart/form-data; field name MUST be 'file')
  app.post("/jobs/:id/upload",
    uploadMw.single("file"),        // <— field name MUST be "file"
    withAuth(async (req: any, res) => {
      const vendorId = req.auth?.vendorId as string | undefined;
      const jobId = String(req.params.id);
      const mode = String(req.query.mode || "products") as "products" | "customers" | "api_sync";
      if (!vendorId) return res.status(401).json({ message: "Missing vendor" });
  
      // 1) Read job and its planned bucket/path
      const [row] = await db
        .select({
          id: schema.ingestionJobs.id,
          vendorId: schema.ingestionJobs.vendorId,
          mode: schema.ingestionJobs.mode,
          params: schema.ingestionJobs.params,
        })
        .from(schema.ingestionJobs)
        .where(and(
          eq(schema.ingestionJobs.id, jobId),
          eq(schema.ingestionJobs.vendorId, vendorId),
        ));
  
      if (!row) return res.status(404).json({ message: "Job not found" });
  
      const p = (row.params || {}) as any;
      const bucket = String(p.bucket || process.env.SUPABASE_CSV_BUCKET || "ingestion");
      // If /jobs created 'path' already, use it; otherwise generate a sane default
      const storagePath = computeStoragePath(vendorId, jobId, mode);
  
      // 2) Validate file
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file || !file.buffer?.length) {
        return res.status(400).json({ message: "Missing CSV file in 'file' field" });
      }
  
      // 3) Ensure bucket exists
      try { await ensureBucket(bucket); } catch (_) {}
  
      // 4) Upload bytes using SERVICE-ROLE client
      const { error: upErr } = await supabaseAdmin
        .storage
        .from(bucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype || "text/csv",
          upsert: true,
        });

      if (upErr) {
        console.error("[upload] Supabase upload failed:", upErr);
        return res.status(502).json({ message: `Storage upload failed: ${upErr.message}` });
      }
        
      // 5) Mark the job as 'uploaded'
      await db.update(schema.ingestionJobs)
        .set({
          params: {
            ...p,
            bucket,
            path: storagePath,
            contentType: file.mimetype || "text/csv",
            fileSize: file.size,
            uploaded: true,               // <— THIS IS WHAT THE WORKER READS
            source: p.source || "csv",
          },
          progressPct: 25,
        })
        .where(eq(schema.ingestionJobs.id, jobId));
  
      return ok(res, {
        ok: true,
        bucket,
        path: storagePath,
        size: file.size,
        mime: file.mimetype || "text/csv",
      });
    })
  );

  // Start processing (mark running and enqueue)
  app.post("/jobs/:id/start", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId as string | undefined;
    const jobId = String(req.params.id);
    if (!vendorId) return res.status(401).json({ message: "Missing vendor" });
  
    const [row] = await db.select({
      params: schema.ingestionJobs.params
    }).from(schema.ingestionJobs)
      .where(and(
        eq(schema.ingestionJobs.id, jobId),
        eq(schema.ingestionJobs.vendorId, vendorId),
      ));
  
    const p = (row?.params || {}) as any;
    if (!p.bucket || !p.path || !p.uploaded) {
      return res.status(409).json({ message: "CSV not uploaded yet" });
    }
  
    const mapping = (req.body && (req.body.mapping || (req.body as any).map)) || null;
  
    await db.update(schema.ingestionJobs)
      .set({ status: "queued", startedAt: null, params: { ...p, ...(mapping ? { mapping } : {}) } })
      .where(eq(schema.ingestionJobs.id, jobId));
  
    return ok(res, { ok: true });
  }));

  // Single job (polled by the wizard)
  app.get("/jobs/:id", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId as string | undefined;
    const jobId = String(req.params.id);
    if (!vendorId) return res.status(401).json({ message: "Missing vendor" });

    const [job] = await db
      .select()
      .from(schema.ingestionJobs)
      .where(and(
        eq(schema.ingestionJobs.id, jobId),
        eq(schema.ingestionJobs.vendorId, vendorId),
      ));
    if (!job) return res.status(404).json({ message: "Job not found" });

    return ok(res, job);
  }));

  // Jobs list (used by the Jobs page)
  app.get("/jobs", withAuth(async (req: any, res) => {
    const vendorId = req.auth?.vendorId as string;
    const items = await db.select().from(schema.ingestionJobs)
      .where(eq(schema.ingestionJobs.vendorId, vendorId))
      .orderBy(desc(schema.ingestionJobs.createdAt ?? sql`now()`)) // adjust if column name differs
      .limit(100);

    return ok(res, { data: items, page: 1, pageSize: items.length, total: items.length });
  }));

  // database health (if implemented)
  app.get("/database/health", withAuth(async (_req: any, res) => {
    const s: any = storage as any;
    if (typeof s.getDatabaseHealth === "function") {
      const health = await s.getDatabaseHealth(true);
      return ok(res, health);
    }
    return ok(res, { status: "unknown" });
  }));
}
