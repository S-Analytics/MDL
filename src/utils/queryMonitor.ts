/**
 * Query Performance Monitor
 * 
 * Tracks database query execution times, identifies slow queries,
 * and collects statistics for performance optimization.
 */

import { logger } from './logger';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: unknown[];
  stack?: string;
}

export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Query Performance Monitor
 * Singleton pattern for tracking query performance across the application
 */
export class QueryMonitor {
  private static instance: QueryMonitor;
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold: number;
  private maxMetricsSize: number;
  private enabled: boolean;

  private constructor() {
    this.slowQueryThreshold = parseInt(
      process.env.SLOW_QUERY_THRESHOLD_MS || '100'
    );
    this.maxMetricsSize = parseInt(process.env.QUERY_METRICS_SIZE || '1000');
    this.enabled = process.env.ENABLE_QUERY_MONITORING !== 'false';

    if (this.enabled) {
      logger.info({
        slowQueryThreshold: `${this.slowQueryThreshold}ms`,
        maxMetricsSize: this.maxMetricsSize,
      }, 'Query monitoring enabled');
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): QueryMonitor {
    if (!QueryMonitor.instance) {
      QueryMonitor.instance = new QueryMonitor();
    }
    return QueryMonitor.instance;
  }

  /**
   * Record a query execution
   */
  public recordQuery(
    query: string,
    duration: number,
    params?: unknown[]
  ): void {
    if (!this.enabled) return;

    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params: params ? this.sanitizeParams(params) : undefined,
      stack:
        duration > this.slowQueryThreshold
          ? new Error().stack
          : undefined,
    };

    this.metrics.push(metric);

    // Trim metrics array if it grows too large
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn({
        duration: `${duration}ms`,
        query: metric.query,
        params: metric.params,
      }, 'Slow query detected');
    }
  }

  /**
   * Get query statistics
   */
  public getStats(): QueryStats {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
      };
    }

    const durations = this.metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      totalQueries: this.metrics.length,
      slowQueries: this.metrics.filter(
        m => m.duration > this.slowQueryThreshold
      ).length,
      avgDuration: totalDuration / this.metrics.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.percentile(durations, 50),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
    };
  }

  /**
   * Get slow queries
   */
  public getSlowQueries(limit = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get recent queries
   */
  public getRecentQueries(limit = 20): QueryMetrics[] {
    return this.metrics.slice(-limit).reverse();
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.metrics = [];
    logger.info('Query metrics cleared');
  }

  /**
   * Get query distribution by duration buckets
   */
  public getDistribution(): Record<string, number> {
    const buckets = {
      '0-10ms': 0,
      '10-50ms': 0,
      '50-100ms': 0,
      '100-500ms': 0,
      '500ms+': 0,
    };

    this.metrics.forEach(m => {
      if (m.duration < 10) buckets['0-10ms']++;
      else if (m.duration < 50) buckets['10-50ms']++;
      else if (m.duration < 100) buckets['50-100ms']++;
      else if (m.duration < 500) buckets['100-500ms']++;
      else buckets['500ms+']++;
    });

    return buckets;
  }

  /**
   * Get queries grouped by pattern
   */
  public getQueryPatterns(): Map<string, number> {
    const patterns = new Map<string, number>();

    this.metrics.forEach(m => {
      const pattern = this.extractQueryPattern(m.query);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return new Map([...patterns.entries()].sort((a, b) => b[1] - a[1]));
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);
  }

  /**
   * Sanitize params for logging
   */
  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map(p => {
      if (typeof p === 'string' && p.length > 100) {
        return p.substring(0, 100) + '...';
      }
      return p;
    });
  }

  /**
   * Extract query pattern (normalize for grouping)
   */
  private extractQueryPattern(query: string): string {
    return query
      .replace(/\$\d+/g, '$N') // Replace $1, $2, etc. with $N
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Convenience function to get monitor instance
 */
export const getQueryMonitor = (): QueryMonitor => QueryMonitor.getInstance();
