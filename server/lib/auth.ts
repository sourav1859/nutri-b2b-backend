import { type Request } from "express";
import { Client } from 'appwrite';

if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID) {
  throw new Error("APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID environment variables are required");
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

export interface AuthContext {
  userId: string;
  email: string;
  vendorId: string;
  role: string;
  permissions: string[];
}

export async function validateJWT(token: string): Promise<AuthContext> {
  try {
    // In a real implementation, this would validate the JWT and extract user info
    // For now, we'll simulate the validation
    
    if (!token || token === 'invalid') {
      throw new Error('Invalid or missing token');
    }

    // Mock user context - in production this would come from JWT claims
    return {
      userId: 'user-123',
      email: 'admin@example.com',
      vendorId: 'vendor-123',
      role: 'vendor_admin',
      permissions: ['read:products', 'write:products', 'read:customers', 'write:customers']
    };
  } catch (error) {
    throw new Error(`JWT validation failed: ${(error as Error).message}`);
  }
}

export function extractAuthFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  
  return token;
}

export function requireAuth(req: Request): Promise<AuthContext> {
  const token = extractAuthFromRequest(req);
  if (!token) {
    throw new Error('Authorization token required');
  }
  
  return validateJWT(token);
}

export function hasPermission(context: AuthContext, permission: string): boolean {
  return context.permissions.includes(permission) || context.role === 'superadmin';
}

export function requirePermission(context: AuthContext, permission: string): void {
  if (!hasPermission(context, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function requireRole(context: AuthContext, ...allowedRoles: string[]): void {
  if (!allowedRoles.includes(context.role) && context.role !== 'superadmin') {
    throw new Error(`Role not authorized: ${context.role}`);
  }
}
