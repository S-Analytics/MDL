/**
 * Performance Monitoring Middleware
 * 
 * Tracks request performance metrics including duration, memory usage, and identifies slow requests.
 * Part of Phase 2C Task 5 - Load Testing and Optimization.
 * 
 * Features:
 * - Request duration tracking (in milliseconds)
 * - Memory usage monitoring (heap used)
 * - Slow request detection and alerting
 * - Performance metrics logging
 * - Response time headers
 * 
 * @module middleware/performance
 */

import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Configuration options for performance monitoring
 */
export interface PerformanceConfig {
  /**
   * Enable/disable performance monitoring
   * Default: true in production
   */
  enabled?: boolean;

  /**
   * Threshold in ms for slow request warnings
   * Default: 1000ms (1 second)
   */
  slowRequestThreshold?: number;

  /**
   * Add X-Response-Time header to responses
   * Default: true
   */
  addResponseTimeHeader?: boolean;

  /**
   * Log all requests (can be verbose)
   * Default: false
   */
  logAllRequests?: boolean;
}

/**
 * Default performance monitoring configuration
 */
const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10),
  addResponseTimeHeader: true,
  logAllRequests: process.env.LOG_ALL_REQUESTS === 'true',
};

/**
 * Performance statistics tracker
 */
class PerformanceTracker {
  private requestCounts: Map<string, number> = new Map();
  private totalDurations: Map<string, number> = new Map();
  private slowRequests: number = 0;
  private totalRequests: number = 0;

  /**
   * Record a request
   */
  record(path: string, duration: number, isSlow: boolean): void {
    const current = this.requestCounts.get(path) || 0;
    const totalDuration = this.totalDurations.get(path) || 0;

    this.requestCounts.set(path, current + 1);
    this.totalDurations.set(path, totalDuration + duration);
    this.totalRequests++;

    if (isSlow) {
      this.slowRequests++;
    }
  }

  /**
   * Get statistics summary
   */
  getStats(): {
    totalRequests: number;
    slowRequests: number;
    slowRequestRate: number;
    topEndpoints: Array<{ path: string; count: number; avgDuration: number }>;
  } {
    const topEndpoints = Array.from(this.requestCounts.entries())
      .map(([path, count]) => ({
        path,
        count,
        avgDuration: (this.totalDurations.get(path) || 0) / count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.totalRequests,
      slowRequests: this.slowRequests,
      slowRequestRate: this.totalRequests > 0 ? (this.slowRequests / this.totalRequests) * 100 : 0,
      topEndpoints,
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.requestCounts.clear();
    this.totalDurations.clear();
    this.slowRequests = 0;
    this.totalRequests = 0;
  }
}

// Global performance tracker instance
const performanceTracker = new PerformanceTracker();

/**
 * Performance monitoring middleware
 * 
 * Tracks request performance and logs slow requests
 * 
 * @param config - Optional configuration overrides
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * // Use default configuration
 * app.use(performanceMonitoring());
 * 
 * // Custom configuration
 * app.use(performanceMonitoring({
 *   slowRequestThreshold: 500,
 *   logAllRequests: true
 * }));
 * ```
 */
export function performanceMonitoring(config?: PerformanceConfig) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if disabled
    if (!finalConfig.enabled) {
      return next();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;

    // Add response time header before headers are sent
    const originalSend = res.send;
    res.send = function(data?: any) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      
      // Add response time header if enabled and headers not sent
      if (finalConfig.addResponseTimeHeader && !res.headersSent) {
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
      }
      
      return originalSend.call(this, data);
    };

    // Capture response when finished
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (endMemory - startMemory) / 1024 / 1024; // Convert to MB

      const isSlow = duration > finalConfig.slowRequestThreshold;

      // Record in tracker
      const path = req.route?.path || req.path;
      performanceTracker.record(path, duration, isSlow);

      // Log slow requests
      if (isSlow) {
        logger.warn({
          msg: 'Slow request detected',
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode,
          memoryDelta: `${memoryDelta.toFixed(2)}MB`,
          threshold: `${finalConfig.slowRequestThreshold}ms`,
        });
      }

      // Log all requests if enabled
      if (finalConfig.logAllRequests) {
        logger.info({
          msg: 'Request completed',
          method: req.method,
          path: req.path,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode,
          memoryUsed: `${(endMemory / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    });

    next();
  };
}

/**
 * Get current performance statistics
 * 
 * @returns Performance statistics object
 */
export function getPerformanceStats() {
  return performanceTracker.getStats();
}

/**
 * Reset performance statistics
 */
export function resetPerformanceStats() {
  performanceTracker.reset();
}

/**
 * Express endpoint to expose performance stats
 * Add this to your server:
 * ```typescript
 * app.get('/api/performance/stats', getPerformanceStatsEndpoint);
 * ```
 */
export function getPerformanceStatsEndpoint(req: Request, res: Response) {
  const stats = getPerformanceStats();
  const memUsage = process.memoryUsage();
  
  res.json({
    success: true,
    data: {
      performance: stats,
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      },
      uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
    },
  });
}

/**
 * Export configured performance monitoring middleware
 */
export default performanceMonitoring;
