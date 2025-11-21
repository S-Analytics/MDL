import { Request, Response, Router } from 'express';
import { optionalAuthenticate, requireAdmin, requireEditor } from '../../../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../../../middleware/validation';
import { PolicyGenerator } from '../../../opa';
import { IMetricStore } from '../../../storage';
import { asyncHandler } from '../../../utils/errors';
import {
    metricDefinitionSchema,
    metricIdParamSchema,
    metricQuerySchema,
    metricUpdateSchema,
} from '../../../validation/schemas';

/**
 * API v1 Metrics Routes
 * 
 * Provides RESTful endpoints for metric CRUD operations.
 * All routes are prefixed with /api/v1/metrics
 */
export function createMetricsRouter(getStore: () => IMetricStore): Router {
  const router = Router();

  /**
   * GET /api/v1/metrics
   * Get all metrics with optional filtering
   */
  router.get(
    '/',
    optionalAuthenticate,
    validateQuery(metricQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const filters = {
        category: req.query.category as string,
        business_domain: req.query.business_domain as string,
        metric_type: req.query.metric_type as string,
        tier: req.query.tier as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const metrics = await store.findAll(
        Object.keys(filters).some((k) => filters[k as keyof typeof filters])
          ? filters
          : undefined
      );

      res.json({ success: true, data: metrics, count: metrics.length });
    })
  );

  /**
   * GET /api/v1/metrics/:id
   * Get a specific metric by ID
   */
  router.get(
    '/:id',
    optionalAuthenticate,
    validateParams(metricIdParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const metric = await store.findById(req.params.id);
      if (!metric) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }
      res.json({ success: true, data: metric });
    })
  );

  /**
   * POST /api/v1/metrics
   * Create a new metric
   */
  router.post(
    '/',
    requireEditor,
    validateBody(metricDefinitionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const metric = await store.create(req.body);
      res.status(201).json({ success: true, data: metric });
    })
  );

  /**
   * PUT /api/v1/metrics/:id
   * Update an existing metric
   */
  router.put(
    '/:id',
    requireEditor,
    validateParams(metricIdParamSchema),
    validateBody(metricUpdateSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const existing = await store.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      const updated = await store.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    })
  );

  /**
   * DELETE /api/v1/metrics/:id
   * Delete a metric
   */
  router.delete(
    '/:id',
    requireAdmin,
    validateParams(metricIdParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const existing = await store.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      await store.delete(req.params.id);
      res.json({ success: true, message: 'Metric deleted successfully' });
    })
  );

  /**
   * GET /api/v1/metrics/:id/policy
   * Generate OPA policy for a specific metric
   */
  router.get(
    '/:id/policy',
    optionalAuthenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const metric = await store.findById(req.params.id);

      if (!metric) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      const policy = PolicyGenerator.generatePolicy(metric);

      res.json({ success: true, data: { metric_id: metric.metric_id, policy } });
    })
  );

  return router;
}
