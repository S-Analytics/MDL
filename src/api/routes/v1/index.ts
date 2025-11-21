import { Router } from 'express';
import { IMetricStore } from '../../../storage';
import { createMetricsRouter } from './metrics';
import { createPoliciesRouter } from './policies';
import { createStatsRouter } from './stats';

/**
 * API v1 Router
 * 
 * Aggregates all v1 API routes.
 * Mount at /api/v1
 */
export function createV1Router(getStore: () => IMetricStore): Router {
  const router = Router();

  // Mount sub-routers
  router.use('/metrics', createMetricsRouter(getStore));
  router.use('/policies', createPoliciesRouter(getStore));
  router.use('/stats', createStatsRouter(getStore));

  // Version info endpoint
  router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      status: 'stable',
      endpoints: {
        metrics: '/api/v1/metrics',
        policies: '/api/v1/policies',
        stats: '/api/v1/stats',
      },
      documentation: '/api-docs',
    });
  });

  return router;
}
