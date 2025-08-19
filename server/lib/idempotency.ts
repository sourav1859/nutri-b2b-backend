import crypto from 'crypto';
import { db } from './database';
import { idempotencyKeys } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';

export interface IdempotencyResult {
  isReplay: boolean;
  response?: any;
}

// Create hash of request for duplicate detection
function createRequestHash(method: string, path: string, body: any): string {
  const content = `${method}:${path}:${JSON.stringify(body || {})}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Handle idempotency for requests
export async function handleIdempotency(
  req: Request,
  vendorId: string
): Promise<IdempotencyResult> {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    throw new Error('Idempotency-Key header is required for POST/PUT/PATCH requests');
  }

  // Validate idempotency key format
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(idempotencyKey)) {
    throw new Error('Idempotency-Key must be 1-64 characters and contain only alphanumeric characters, hyphens, and underscores');
  }

  const method = req.method;
  const path = req.path;
  const requestHash = createRequestHash(method, path, req.body);

  try {
    // Check if we've seen this idempotency key before
    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, idempotencyKey),
          eq(idempotencyKeys.vendorId, vendorId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0];
      
      // Check if the request hash matches (same request)
      if (record.requestHash !== requestHash) {
        throw new Error('Idempotency key reused with different request parameters');
      }

      // If we have a completed response, return it
      if (record.status === 'completed' && record.responseHash) {
        return {
          isReplay: true,
          response: JSON.parse(record.responseHash)
        };
      }

      // If still processing, return conflict
      if (record.status === 'processing') {
        throw new Error('Request with this idempotency key is still being processed');
      }
    } else {
      // Create new idempotency record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      await db.insert(idempotencyKeys).values({
        key: idempotencyKey,
        vendorId,
        method,
        path,
        requestHash,
        status: 'processing',
        expiresAt
      });
    }

    return { isReplay: false };
  } catch (error) {
    // If it's a constraint violation, the key was inserted by another request
    if ((error as any).code === '23505') { // unique constraint violation
      throw new Error('Concurrent request with same idempotency key detected');
    }
    throw error;
  }
}

// Store successful response for replay
export async function storeIdempotencyResponse(
  idempotencyKey: string,
  vendorId: string,
  response: any
): Promise<void> {
  try {
    await db
      .update(idempotencyKeys)
      .set({
        responseHash: JSON.stringify(response),
        status: 'completed'
      })
      .where(
        and(
          eq(idempotencyKeys.key, idempotencyKey),
          eq(idempotencyKeys.vendorId, vendorId)
        )
      );
  } catch (error) {
    console.error('Failed to store idempotency response:', error);
  }
}

// Mark idempotency key as failed
export async function markIdempotencyFailed(
  idempotencyKey: string,
  vendorId: string,
  error: string
): Promise<void> {
  try {
    await db
      .update(idempotencyKeys)
      .set({
        status: 'failed',
        responseHash: JSON.stringify({ error })
      })
      .where(
        and(
          eq(idempotencyKeys.key, idempotencyKey),
          eq(idempotencyKeys.vendorId, vendorId)
        )
      );
  } catch (err) {
    console.error('Failed to mark idempotency as failed:', err);
  }
}

// Clean up expired idempotency keys
export async function cleanupExpiredKeys(): Promise<void> {
  try {
    const result = await db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, sql`now()`));
    
    console.log(`Cleaned up ${result.rowCount} expired idempotency keys`);
  } catch (error) {
    console.error('Failed to cleanup expired idempotency keys:', error);
  }
}

// Middleware wrapper for idempotent endpoints
export function withIdempotency(handler: Function) {
  return async (req: Request, res: Response, vendorId: string, ...args: any[]) => {
    // Only apply to mutation methods
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return handler(req, res, vendorId, ...args);
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    try {
      const result = await handleIdempotency(req, vendorId);
      
      if (result.isReplay) {
        // Return cached response
        return res.json(result.response);
      }

      // Execute the handler
      const response = await handler(req, res, vendorId, ...args);
      
      // Store successful response
      if (idempotencyKey && res.statusCode >= 200 && res.statusCode < 300) {
        await storeIdempotencyResponse(idempotencyKey, vendorId, response);
      }

      return response;
    } catch (error) {
      // Mark as failed
      if (idempotencyKey) {
        await markIdempotencyFailed(idempotencyKey, vendorId, (error as Error).message);
      }
      throw error;
    }
  };
}
