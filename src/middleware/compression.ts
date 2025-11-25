/**
 * Response Compression Middleware
 * 
 * Implements gzip/deflate compression for API responses to reduce bandwidth usage
 * and improve network performance. Part of Phase 2C Task 4.
 * 
 * Features:
 * - Configurable compression level (0-9)
 * - Minimum threshold to avoid compressing small responses
 * - Custom filter function for fine-grained control
 * - Supports gzip and deflate encodings
 * - Environment-based configuration
 * 
 * Performance Impact:
 * - Typical compression ratio: 70-85% for JSON responses
 * - CPU overhead: ~2-5ms per request at level 6
 * - Network bandwidth savings: 50-80% depending on payload
 * 
 * @module middleware/compression
 */

import compression from 'compression';
import { NextFunction, Request, Response } from 'express';

/**
 * Configuration options for response compression
 */
export interface CompressionConfig {
  /**
   * Compression level (0-9)
   * 0 = no compression, 1 = fastest, 9 = best compression
   * Default: 6 (good balance between speed and compression ratio)
   */
  level?: number;

  /**
   * Minimum response size in bytes to trigger compression
   * Responses smaller than this will not be compressed
   * Default: 1024 (1KB)
   */
  threshold?: number;

  /**
   * Whether compression is enabled
   * Default: true in production, false in development
   */
  enabled?: boolean;

  /**
   * Memory level for compression (1-9)
   * Higher values use more memory but may improve compression
   * Default: 8
   */
  memLevel?: number;
}

/**
 * Default compression configuration
 */
const DEFAULT_CONFIG: Required<CompressionConfig> = {
  level: 6,
  threshold: 1024,
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_COMPRESSION === 'true',
  memLevel: 8,
};

/**
 * Custom filter function to determine which responses should be compressed
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns true if response should be compressed, false otherwise
 */
function shouldCompress(req: Request, res: Response): boolean {
  // Don't compress if client explicitly requests no compression
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Don't compress if response already has Content-Encoding
  if (res.getHeader('Content-Encoding')) {
    return false;
  }

  // Don't compress images, videos, or already compressed formats
  const contentType = res.getHeader('Content-Type');
  const contentTypeStr = typeof contentType === 'string' ? contentType : undefined;

  // Don't compress if response is a stream
  if (contentTypeStr?.includes('stream')) {
    return false;
  }
  if (contentTypeStr) {
    const noCompressTypes = [
      'image/',
      'video/',
      'audio/',
      'application/zip',
      'application/gzip',
      'application/x-compressed',
    ];
    
    if (noCompressTypes.some(type => contentTypeStr.includes(type))) {
      return false;
    }
  }

  // Use default compression filter for other cases
  return compression.filter(req, res);
}

/**
 * Creates and configures the compression middleware
 * 
 * @param config - Optional configuration overrides
 * @returns Configured compression middleware
 * 
 * @example
 * ```typescript
 * // Use default configuration
 * app.use(compressionMiddleware());
 * 
 * // Custom configuration
 * app.use(compressionMiddleware({
 *   level: 9,
 *   threshold: 2048,
 *   enabled: true
 * }));
 * ```
 */
export function compressionMiddleware(config?: CompressionConfig) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // If compression is disabled, return a no-op middleware
  if (!finalConfig.enabled) {
    return (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Compression', 'disabled');
      next();
    };
  }

  // Create and return the compression middleware
  return compression({
    level: finalConfig.level,
    threshold: finalConfig.threshold,
    memLevel: finalConfig.memLevel,
    filter: shouldCompress,
  });
}

/**
 * Export configured compression middleware with environment-based defaults
 */
export default compressionMiddleware;
