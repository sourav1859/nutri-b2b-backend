import type { Response } from 'express';

// RFC 9457 Problem Details for HTTP APIs
export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: FieldError[];
  [key: string]: any;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly title: string;
  public readonly type?: string;
  public readonly detail?: string;
  public readonly errors?: FieldError[];

  constructor(
    status: number,
    title: string,
    detail?: string,
    type?: string,
    errors?: FieldError[]
  ) {
    super(title);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = type;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

// Common error constructors
export class ValidationError extends ApiError {
  constructor(message: string, errors?: FieldError[]) {
    super(
      400,
      'Validation Failed',
      message,
      'https://api.odyssey.com/problems/validation-failed',
      errors
    );
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(
      401,
      'Authentication Required',
      message,
      'https://api.odyssey.com/problems/authentication-required'
    );
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(
      403,
      'Authorization Failed',
      message,
      'https://api.odyssey.com/problems/authorization-failed'
    );
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const detail = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(
      404,
      'Resource Not Found',
      detail,
      'https://api.odyssey.com/problems/not-found'
    );
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(
      409,
      'Conflict',
      message,
      'https://api.odyssey.com/problems/conflict'
    );
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      429,
      'Rate Limit Exceeded',
      'Too many requests',
      'https://api.odyssey.com/problems/rate-limit-exceeded'
    );
    if (retryAfter) {
      (this as any).retryAfter = retryAfter;
    }
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'An internal server error occurred') {
    super(
      500,
      'Internal Server Error',
      message,
      'https://api.odyssey.com/problems/internal-server-error'
    );
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(
      503,
      'Service Unavailable',
      message,
      'https://api.odyssey.com/problems/service-unavailable'
    );
  }
}

// Error response formatter
export function formatErrorResponse(error: ApiError, instance?: string): ProblemDetails {
  return {
    type: error.type,
    title: error.title,
    status: error.status,
    detail: error.detail,
    instance,
    ...(error.errors && { errors: error.errors }),
    ...(error as any).retryAfter && { retryAfter: (error as any).retryAfter }
  };
}

// Express error handler
export function handleError(error: any, req: any, res: Response): void {
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error.name === 'ValidationError') {
    // Handle Zod validation errors
    const fieldErrors: FieldError[] = error.errors?.map((err: any) => ({
      field: err.path?.join('.') || 'unknown',
      code: err.code || 'invalid',
      message: err.message,
      value: err.received
    })) || [];

    apiError = new ValidationError('Request validation failed', fieldErrors);
  } else if (error.code === '23505') {
    // PostgreSQL unique constraint violation
    apiError = new ConflictError('Resource already exists');
  } else if (error.code === '23503') {
    // PostgreSQL foreign key constraint violation
    apiError = new ValidationError('Referenced resource does not exist');
  } else if (error.code === '23514') {
    // PostgreSQL check constraint violation
    apiError = new ValidationError('Data violates business rules');
  } else {
    // Unknown error - don't expose details in production
    console.error('Unhandled error:', error);
    apiError = new InternalServerError(
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }

  const problemDetails = formatErrorResponse(apiError, req.originalUrl);

  res.status(apiError.status)
    .type('application/problem+json')
    .json(problemDetails);
}

// Helper to validate required fields
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missing.length > 0) {
    const errors: FieldError[] = missing.map(field => ({
      field,
      code: 'required',
      message: `${field} is required`
    }));

    throw new ValidationError('Required fields missing', errors);
  }
}

// Helper to validate pagination parameters
export function validatePagination(cursor?: string, limit?: number): { cursor?: string; limit: number } {
  const maxLimit = 200;
  const defaultLimit = 50;

  if (limit && (limit < 1 || limit > maxLimit)) {
    throw new ValidationError(`Limit must be between 1 and ${maxLimit}`);
  }

  return {
    cursor: cursor || undefined,
    limit: limit || defaultLimit
  };
}
