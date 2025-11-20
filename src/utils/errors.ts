import { Response } from 'express';
import { logger } from './logger';

/**
 * Standard error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

/**
 * Application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: any,
    isOperational = true
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error types
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorCode.AUTHENTICATION_ERROR, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCode.AUTHORIZATION_ERROR, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.CONFLICT, 409, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, details);
  }
}

/**
 * Send error response
 */
export function sendErrorResponse(
  res: Response,
  error: AppError | Error,
  requestId?: string
): void {
  const timestamp = new Date().toISOString();

  // Handle AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: process.env.VERBOSE_ERRORS === 'true' ? error.details : undefined,
      },
      requestId,
      timestamp,
    };

    // Log error
    logger.error(
      {
        requestId,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          stack: error.stack,
        },
      },
      `Error: ${error.message}`
    );

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: process.env.VERBOSE_ERRORS === 'true'
        ? error.message
        : 'An unexpected error occurred',
      details: process.env.VERBOSE_ERRORS === 'true'
        ? { stack: error.stack }
        : undefined,
    },
    requestId,
    timestamp,
  };

  logger.error(
    {
      requestId,
      error: {
        message: error.message,
        stack: error.stack,
      },
    },
    'Unhandled error'
  );

  res.status(500).json(response);
}

/**
 * Create validation error from Joi validation result
 */
export function createValidationError(joiError: any): ValidationError {
  const details = joiError.details.map((detail: any) => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
  }));

  return new ValidationError('Validation failed', details);
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<any>
) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
