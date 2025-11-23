import { Request, Response, Router } from 'express';
import { cacheService } from '../../../cache/CacheService';
import { optionalAuthenticate } from '../../../middleware/auth';
import { IMetricStore } from '../../../storage';
import { getQueryMonitor } from '../../../utils/queryMonitor';

/**
 * API v1 Statistics Routes
 * 
 * Provides aggregate statistics and analytics for metrics.
 * All routes are prefixed with /api/v1/stats
 */
export function createStatsRouter(getStore: () => IMetricStore): Router {
  const router = Router();

  /**
   * GET /api/v1/stats
   * Get aggregate statistics for all metrics
   */
  router.get(
    '/',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const store = getStore();
        const metrics = await store.findAll();

        const stats = {
          total: metrics.length,
          by_category: metrics.reduce((acc, m) => {
            acc[m.category] = (acc[m.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          by_type: metrics.reduce((acc, m) => {
            acc[m.metric_type] = (acc[m.metric_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          by_tier: metrics.reduce((acc, m) => {
            acc[m.tier] = (acc[m.tier] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          by_domain: metrics.reduce((acc, m) => {
            acc[m.business_domain] = (acc[m.business_domain] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };

        res.json({ success: true, data: stats });
      } catch (error) {
        console.error('Failed to generate statistics:', error);
        res.status(500).json({ success: false, error: 'Failed to generate statistics' });
      }
    }
  );

  /**
   * GET /api/v1/stats/performance
   * Get query performance statistics
   */
  router.get(
    '/performance',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const queryMonitor = getQueryMonitor();
        const stats = queryMonitor.getStats();
        const distribution = queryMonitor.getDistribution();
        const cacheStats = await cacheService.getStats();

        res.json({
          success: true,
          data: {
            queries: {
              ...stats,
              avgDuration: Math.round(stats.avgDuration * 100) / 100,
              minDuration: Math.round(stats.minDuration * 100) / 100,
              maxDuration: Math.round(stats.maxDuration * 100) / 100,
              p50Duration: Math.round(stats.p50Duration * 100) / 100,
              p95Duration: Math.round(stats.p95Duration * 100) / 100,
              p99Duration: Math.round(stats.p99Duration * 100) / 100,
            },
            distribution,
            cache: cacheStats,
          },
        });
      } catch (error) {
        console.error('Failed to get performance statistics:', error);
        res
          .status(500)
          .json({ success: false, error: 'Failed to get performance statistics' });
      }
    }
  );

  /**
   * GET /api/v1/stats/performance/slow-queries
   * Get slow queries
   */
  router.get(
    '/performance/slow-queries',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const limit = Number.parseInt((req.query.limit as string) || '20', 10);
        const queryMonitor = getQueryMonitor();
        const slowQueries = queryMonitor.getSlowQueries(limit);

        res.json({
          success: true,
          data: slowQueries.map(q => ({
            query: q.query,
            duration: Math.round(q.duration * 100) / 100,
            timestamp: q.timestamp,
            params: q.params,
          })),
        });
      } catch (error) {
        console.error('Failed to get slow queries:', error);
        res.status(500).json({ success: false, error: 'Failed to get slow queries' });
      }
    }
  );

  /**
   * GET /api/v1/stats/performance/patterns
   * Get query patterns (grouped by normalized query)
   */
  router.get(
    '/performance/patterns',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const queryMonitor = getQueryMonitor();
        const patterns = queryMonitor.getQueryPatterns();

        const data = Array.from(patterns.entries())
          .map(([pattern, count]) => ({
            pattern,
            count,
          }))
          .slice(0, 50); // Top 50 patterns

        res.json({ success: true, data });
      } catch (error) {
        console.error('Failed to get query patterns:', error);
        res.status(500).json({ success: false, error: 'Failed to get query patterns' });
      }
    }
  );

  return router;
}
