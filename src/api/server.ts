import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { IMetricStore } from '../storage';
import { MetricDefinitionInput } from '../models';
import { PolicyGenerator } from '../opa';

export interface ServerConfig {
  port?: number;
  host?: string;
}

/**
 * Create and configure Express server for MDL API
 */
export function createServer(store: IMetricStore, config: ServerConfig = {}) {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes

  // Get all metrics
  app.get('/api/metrics', async (req: Request, res: Response) => {
    try {
      const filters = {
        category: req.query.category as string,
        dataType: req.query.dataType as string,
        owner: req.query.owner as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const metrics = await store.findAll(
        Object.keys(filters).some((k) => filters[k as keyof typeof filters])
          ? filters
          : undefined
      );

      res.json({ success: true, data: metrics, count: metrics.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get metric by ID
  app.get('/api/metrics/:id', async (req: Request, res: Response) => {
    try {
      const metric = await store.findById(req.params.id);
      if (!metric) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }
      res.json({ success: true, data: metric });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create a new metric
  app.post('/api/metrics', async (req: Request, res: Response) => {
    try {
      const input: MetricDefinitionInput = req.body;
      
      // Validate required fields
      if (!input.name || !input.description || !input.category || !input.dataType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, description, category, dataType',
        });
      }

      const metric = await store.create(input);
      res.status(201).json({ success: true, data: metric });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update a metric
  app.put('/api/metrics/:id', async (req: Request, res: Response) => {
    try {
      const exists = await store.exists(req.params.id);
      if (!exists) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      const metric = await store.update(req.params.id, req.body);
      res.json({ success: true, data: metric });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a metric
  app.delete('/api/metrics/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await store.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }
      res.json({ success: true, message: 'Metric deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate OPA policy for a metric
  app.get('/api/metrics/:id/policy', async (req: Request, res: Response) => {
    try {
      const metric = await store.findById(req.params.id);
      if (!metric) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      const policy = PolicyGenerator.generatePolicy(metric);
      res.type('text/plain').send(policy);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate OPA policies for all metrics
  app.get('/api/policies', async (req: Request, res: Response) => {
    try {
      const metrics = await store.findAll();
      const policies = PolicyGenerator.generatePolicyBundle(metrics);
      
      const result: Record<string, string> = {};
      policies.forEach((policy, fileName) => {
        result[fileName] = policy;
      });

      res.json({ success: true, data: result, count: policies.size });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Statistics endpoint
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const allMetrics = await store.findAll();
      
      const stats = {
        total: allMetrics.length,
        byCategory: {} as Record<string, number>,
        byDataType: {} as Record<string, number>,
        byOwner: {} as Record<string, number>,
      };

      allMetrics.forEach((metric) => {
        stats.byCategory[metric.category] = (stats.byCategory[metric.category] || 0) + 1;
        stats.byDataType[metric.dataType] = (stats.byDataType[metric.dataType] || 0) + 1;
        if (metric.governance?.owner) {
          stats.byOwner[metric.governance.owner] = (stats.byOwner[metric.governance.owner] || 0) + 1;
        }
      });

      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  return app;
}

/**
 * Start the server
 */
export function startServer(store: IMetricStore, config: ServerConfig = {}) {
  const app = createServer(store, config);
  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';

  return app.listen(port, host, () => {
    console.log(`MDL API Server running at http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`API endpoints: http://${host}:${port}/api/metrics`);
  });
}
