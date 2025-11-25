import { Request, Response, Router } from 'express';
import { optionalAuthenticate } from '../../../middleware/auth';
import { PolicyGenerator } from '../../../opa';
import { IMetricStore } from '../../../storage';

/**
 * API v1 Policies Routes
 * 
 * Provides endpoints for OPA policy generation and retrieval.
 * All routes are prefixed with /api/v1/policies
 */
export function createPoliciesRouter(getStore: () => IMetricStore): Router {
  const router = Router();

  /**
   * GET /api/v1/policies
   * Generate OPA policies for all metrics
   */
  router.get(
    '/',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const store = getStore();
        const metrics = await store.findAll();
        const policies = metrics.map((metric) => ({
          metric_id: metric.metric_id,
          policy: PolicyGenerator.generatePolicy(metric),
        }));

        res.json({ success: true, data: policies, count: policies.length });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to generate policies' });
      }
    }
  );

  return router;
}
