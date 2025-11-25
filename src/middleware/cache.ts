import { NextFunction, Request, Response } from 'express';
import { cacheService } from '../cache/CacheService';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/**
 * Cache middleware for GET requests
 * 
 * Caches successful GET responses and serves from cache on subsequent requests.
 * Adds X-Cache header (HIT or MISS) to indicate cache status.
 * 
 * @param options - Cache configuration options
 * @param options.ttl - Time to live in seconds (default: from cacheConfig)
 * @param options.keyGenerator - Custom function to generate cache key
 * @param options.condition - Condition function to determine if request should be cached
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateCacheKey(req);
    
    try {
      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        logger.debug({ cacheKey }, 'Cache HIT - serving from cache');
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }
      
      // Cache miss - intercept response to cache it
      logger.debug({ cacheKey }, 'Cache MISS - will cache response');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache the response
      res.json = function(data: unknown) {
        // Only cache successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, options.ttl)
            .then(() => logger.debug({ cacheKey, ttl: options.ttl }, 'Response cached'))
            .catch(error => logger.error({ cacheKey, error }, 'Failed to cache response'));
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      logger.error({ cacheKey, error }, 'Cache middleware error');
      next(); // Continue even if cache fails
    }
  };
}

/**
 * Generate a consistent cache key from request
 * 
 * Format: {path}:{userId}:{queryHash}
 * 
 * @param req - Express request object
 * @returns Cache key string
 */
function generateCacheKey(req: Request): string {
  // Get user ID from request (if authenticated)
  const userId = (req as any).user?.userId || 'anonymous';
  
  // Sort query parameters for consistent keys
  const sortedQuery = Object.keys(req.query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = req.query[key];
      return acc;
    }, {} as Record<string, unknown>);
  
  const queryString = JSON.stringify(sortedQuery);
  
  return `${req.path}:${userId}:${queryString}`;
}

/**
 * Cache invalidation middleware for write operations
 * 
 * Invalidates cache entries matching a pattern after successful write operations.
 * Should be used on POST, PUT, PATCH, DELETE routes.
 * 
 * @param pattern - Glob pattern to match cache keys (e.g., "mdl:*\/metrics:*")
 */
export function invalidateCache(pattern: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.send.bind(res);
    
    // Override send to invalidate cache after response
    res.send = function(data: unknown) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache asynchronously (don't block response)
        cacheService.deletePattern(pattern)
          .then(count => {
            if (count > 0) {
              logger.info({ pattern, count }, 'Cache invalidated');
            }
          })
          .catch(error => logger.error({ pattern, error }, 'Failed to invalidate cache'));
      }
      
      return originalSend(data);
    };
    
    next();
  };
}

/**
 * Clear all cache entries
 * 
 * Utility middleware for admin routes to clear entire cache.
 */
export function clearCache() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    
    res.send = function(data: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.clear()
          .then(() => logger.info('Entire cache cleared'))
          .catch(error => logger.error({ error }, 'Failed to clear cache'));
      }
      
      return originalSend(data);
    };
    
    next();
  };
}
