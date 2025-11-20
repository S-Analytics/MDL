import { NextFunction, Request, Response } from 'express';
import { isOperationalError, sendErrorResponse } from '../utils/errors';
import { createRequestLogger, generateRequestId } from '../utils/logger';

import { Logger } from 'pino';

// Extend Express Request to include custom properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      log?: Logger;
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 * Adds request ID and logger to every request
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Create request-scoped logger
  req.log = createRequestLogger(requestId, {
    method: req.method,
    url: req.url,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  });

  // Log incoming request
  req.log.info(
    {
      method: req.method,
      url: req.url,
      query: req.query,
      userAgent: req.headers['user-agent'],
    },
    'Incoming request'
  );

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    if (req.log) {
      req.log[logLevel](
        {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        },
        'Request completed'
      );
    }
  });

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Error handling middleware
 * Must be added after all routes
 */
export function errorHandlingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Send error response using utility function
  sendErrorResponse(res, err, req.requestId);

  // If it's a programming error (not operational), log and potentially exit
  if (!isOperationalError(err) && process.env.NODE_ENV === 'production') {
    req.log?.fatal({ err }, 'Programming error detected - shutting down');
    
    // Give time to flush logs, then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

/**
 * 404 handler middleware
 */
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
}
