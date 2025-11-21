import { Request, Response, Router } from 'express';
import { optionalAuthenticate } from '../../../middleware/auth';
import { IMetricStore } from '../../../storage';

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
        res.status(500).json({ success: false, error: 'Failed to generate statistics' });
      }
    }
  );

  return router;
}
