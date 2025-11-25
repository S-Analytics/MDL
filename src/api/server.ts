import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Client } from 'pg';
import swaggerUi from 'swagger-ui-express';
import { optionalAuthenticate, requireAdmin, requireEditor } from '../middleware/auth';
import { compressionMiddleware } from '../middleware/compression';
import { errorHandlingMiddleware, requestLoggingMiddleware } from '../middleware/logging';
import { metricsEndpointHandler, metricsMiddleware } from '../middleware/metrics';
import { getPerformanceStatsEndpoint, performanceMonitoring } from '../middleware/performance';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { MetricDefinitionInput } from '../models';
import { PolicyGenerator } from '../opa';
import { IMetricStore } from '../storage';
import { asyncHandler } from '../utils/errors';
import { logger, logStartup } from '../utils/logger';
import {
    databaseConfigSchema,
    metricDefinitionSchema,
    metricIdParamSchema,
    metricQuerySchema,
    metricUpdateSchema,
} from '../validation/schemas';
import { createAuthRouter } from './auth';
import { createV1Router } from './routes/v1';

// Load environment variables
dotenv.config();

export interface ServerConfig {
  port?: number;
  host?: string;
  userStore?: any; // IUserStore instance for authentication
  enableAuth?: boolean; // Enable authentication endpoints
}

/**
 * Create and configure Express server for MDL API
 */
export function createServer(storeOrGetter: IMetricStore | (() => IMetricStore), _config: ServerConfig = {}) {
  const app = express();
  
  // Helper to get store dynamically
  const getStore = typeof storeOrGetter === 'function' ? storeOrGetter : () => storeOrGetter;
  
  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  }));
  
  // Response compression (must be before express.json to compress responses)
  app.use(compressionMiddleware({
    level: parseInt(process.env.COMPRESSION_LEVEL || '6'),
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'),
    enabled: process.env.ENABLE_COMPRESSION !== 'false', // Enabled by default
  }));
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Metrics collection middleware (before other middleware to capture all requests)
  app.use(metricsMiddleware);

  // Performance monitoring middleware
  app.use(performanceMonitoring({
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10),
    addResponseTimeHeader: true,
    logAllRequests: process.env.LOG_ALL_REQUESTS === 'true',
  }));

  // Request logging middleware with request IDs
  app.use(requestLoggingMiddleware);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Prometheus metrics endpoint
  app.get('/metrics', metricsEndpointHandler);

  // Performance stats endpoint
  app.get('/api/performance/stats', optionalAuthenticate, getPerformanceStatsEndpoint);

  // API Documentation (Swagger UI)
  try {
    const openApiPath = path.join(__dirname, '../../openapi.yaml');
    const openApiFile = fs.readFileSync(openApiPath, 'utf8');
    const openApiDoc = yaml.load(openApiFile) as any;
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc, {
      customSiteTitle: 'MDL API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
    }));
    
    logger.info('API documentation available at /api-docs');
  } catch (error) {
    logger.warn({ error }, 'Failed to load OpenAPI documentation');
  }

  // Authentication Routes (if enabled)
  if (_config.enableAuth && _config.userStore) {
    app.use('/api/auth', createAuthRouter(_config.userStore));
    logger.info('Authentication routes enabled');
  }

  // API v1 Routes (versioned)
  app.use('/api/v1', createV1Router(getStore));
  logger.info('API v1 routes enabled at /api/v1');

  // Legacy API Routes (backward compatibility - will be deprecated)
  // TODO: Add deprecation warnings in headers for legacy endpoints

  // Get all metrics
  app.get(
    '/api/metrics',
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

  // Get metric by ID
  app.get(
    '/api/metrics/:id',
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

  // Create a new metric
  app.post(
    '/api/metrics',
    requireEditor,
    validateBody(metricDefinitionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const input: MetricDefinitionInput = req.body;
      const metric = await store.create(input);
      res.status(201).json({ success: true, data: metric });
    })
  );

  // Update a metric
  app.put(
    '/api/metrics/:id',
    requireEditor,
    validateParams(metricIdParamSchema),
    validateBody(metricUpdateSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const exists = await store.exists(req.params.id);
      if (!exists) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }

      const metric = await store.update(req.params.id, req.body);
      res.json({ success: true, data: metric });
    })
  );

  // Delete a metric
  app.delete(
    '/api/metrics/:id',
    optionalAuthenticate,
    validateParams(metricIdParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const store = getStore();
      const deleted = await store.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Metric not found' });
      }
      res.json({ success: true, message: 'Metric deleted successfully' });
    })
  );

  // Generate OPA policy for a metric
  app.get('/api/metrics/:id/policy', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
      const store = getStore();
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
  app.get('/api/policies', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
      const store = getStore();
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
  app.get('/api/stats', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
      const store = getStore();
      const allMetrics = await store.findAll();
      
      const stats = {
        total: allMetrics.length,
        byTier: {} as Record<string, number>,
        byMetricType: {} as Record<string, number>,
        byBusinessDomain: {} as Record<string, number>,
        byOwner: {} as Record<string, number>,
      };

      allMetrics.forEach((metric) => {
        if (metric.tier) {
          stats.byTier[metric.tier] = (stats.byTier[metric.tier] || 0) + 1;
        }
        if (metric.metric_type) {
          stats.byMetricType[metric.metric_type] = (stats.byMetricType[metric.metric_type] || 0) + 1;
        }
        if (metric.business_domain) {
          stats.byBusinessDomain[metric.business_domain] = (stats.byBusinessDomain[metric.business_domain] || 0) + 1;
        }
        if (metric.governance?.technical_owner) {
          stats.byOwner[metric.governance.technical_owner] = (stats.byOwner[metric.governance.technical_owner] || 0) + 1;
        }
      });

      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get metrics from PostgreSQL
  app.post('/api/postgres/metrics', requireEditor, async (req: Request, res: Response) => {
    try {
      const { host, port, name, user, password } = req.body;

      if (!host || !port || !name || !user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required database connection fields' 
        });
      }

      const { PostgresMetricStore } = require('../storage/PostgresMetricStore');
      const pgStore = new PostgresMetricStore({
        host,
        port: parseInt(port),
        database: name,
        user,
        password: password || ''
      });

      const metrics = await pgStore.findAll();
      await pgStore.close();

      res.json({ success: true, data: metrics });
    } catch (error: any) {
      console.error('PostgreSQL metrics fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get domains from PostgreSQL
  app.post('/api/postgres/domains', requireEditor, async (req: Request, res: Response) => {
    try {
      const { host, port, name, user, password } = req.body;

      if (!host || !port || !name || !user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required database connection fields' 
        });
      }

      const { PostgresDomainStore } = require('../storage/PostgresDomainStore');
      const pgStore = new PostgresDomainStore({
        host,
        port: parseInt(port),
        database: name,
        user,
        password: password || ''
      });

      const domains = await pgStore.findAll();
      await pgStore.close();

      res.json({ success: true, data: domains });
    } catch (error: any) {
      console.error('PostgreSQL domains fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get objectives from PostgreSQL
  app.post('/api/postgres/objectives', requireEditor, async (req: Request, res: Response) => {
    try {
      const { host, port, name, user, password } = req.body;

      if (!host || !port || !name || !user) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required database connection fields' 
        });
      }

      const { PostgresObjectiveStore } = require('../storage/PostgresObjectiveStore');
      const pgStore = new PostgresObjectiveStore({
        host,
        port: parseInt(port),
        database: name,
        user,
        password: password || ''
      });

      const objectives = await pgStore.findAll();
      await pgStore.close();

      res.json({ success: true, data: objectives });
    } catch (error: any) {
      console.error('PostgreSQL objectives fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save/Create domain in PostgreSQL
  // Save/Create/Update domain in PostgreSQL
  app.post('/api/postgres/domains/save', requireEditor, async (req: Request, res: Response) => {
    try {
      const { dbConfig, domain, isUpdate } = req.body;

      if (!dbConfig || !domain) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or domain data' 
        });
      }

      const { PostgresDomainStore } = require('../storage/PostgresDomainStore');
      const pgStore = new PostgresDomainStore({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      let result;
      if (isUpdate) {
        // Check if domain exists first
        const existing = await pgStore.findById(domain.domain_id);
        if (existing) {
          result = await pgStore.update(domain);
        } else {
          result = await pgStore.create(domain);
        }
      } else {
        result = await pgStore.create(domain);
      }
      
      await pgStore.close();

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('PostgreSQL domain save error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save/Create/Update objective in PostgreSQL
  app.post('/api/postgres/objectives/save', requireEditor, async (req: Request, res: Response) => {
    try {
      const { dbConfig, objective, isUpdate } = req.body;

      // Debug logging
      console.log('=== Objective Save Request ===');
      console.log('Objective ID:', objective?.objective_id);
      console.log('isUpdate flag:', isUpdate);
      if (objective && objective.key_results) {
        console.log('Key result IDs:', objective.key_results.map((kr: any) => kr.kr_id));
      }

      if (!dbConfig || !objective) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or objective data' 
        });
      }

      const { PostgresObjectiveStore } = require('../storage/PostgresObjectiveStore');
      const pgStore = new PostgresObjectiveStore({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      let result;
      if (isUpdate) {
        // Check if objective exists first
        const existing = await pgStore.findById(objective.objective_id);
        console.log('Existing objective found:', !!existing);
        if (existing) {
          console.log('Calling UPDATE operation');
          result = await pgStore.update(objective);
        } else {
          console.log('Objective not found, calling CREATE operation');
          result = await pgStore.create(objective);
        }
      } else {
        console.log('isUpdate=false, calling CREATE operation');
        result = await pgStore.create(objective);
      }
      
      await pgStore.close();

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('PostgreSQL objective save error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Save/Create/Update metric in PostgreSQL
  app.post('/api/postgres/metrics/save', requireEditor, async (req: Request, res: Response) => {
    try {
      const { dbConfig, metric, isUpdate } = req.body;

      // Debug logging
      console.log('=== Metric Save Request ===');
      console.log('Metric ID:', metric?.metric_id);
      console.log('isUpdate flag:', isUpdate);

      if (!dbConfig || !metric) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or metric data' 
        });
      }

      const { PostgresMetricStore } = require('../storage/PostgresMetricStore');
      const pgStore = new PostgresMetricStore({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      let result;
      if (isUpdate) {
        // Check if metric exists first
        const existing = await pgStore.findById(metric.metric_id);
        console.log('Existing metric found:', !!existing);
        if (existing) {
          console.log('Calling UPDATE operation');
          result = await pgStore.update(metric.metric_id, metric);
        } else {
          console.log('Metric not found, calling CREATE operation');
          result = await pgStore.create(metric);
        }
      } else {
        console.log('isUpdate=false, calling CREATE operation');
        result = await pgStore.create(metric);
      }
      
      await pgStore.close();

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('PostgreSQL metric save error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete metric from PostgreSQL
  app.post('/api/postgres/metrics/delete', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { dbConfig, metricId } = req.body;

      if (!dbConfig || !metricId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or metricId' 
        });
      }

      const { PostgresMetricStore } = require('../storage/PostgresMetricStore');
      const pgStore = new PostgresMetricStore({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      await pgStore.delete(metricId);
      await pgStore.close();

      res.json({ success: true });
    } catch (error: any) {
      console.error('PostgreSQL metric delete error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete domain from PostgreSQL
  app.post('/api/postgres/domains/delete', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { dbConfig, domainId } = req.body;

      if (!dbConfig || !domainId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or domainId' 
        });
      }

      const { Client } = require('pg');
      const client = new Client({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      await client.connect();
      await client.query('DELETE FROM business_domains WHERE domain_id = $1', [domainId]);
      await client.end();

      res.json({ success: true });
    } catch (error: any) {
      console.error('PostgreSQL domain delete error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete objective from PostgreSQL
  app.post('/api/postgres/objectives/delete', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { dbConfig, objectiveId } = req.body;

      if (!dbConfig || !objectiveId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing dbConfig or objectiveId' 
        });
      }

      const { Client } = require('pg');
      const client = new Client({
        host: dbConfig.host,
        port: parseInt(dbConfig.port),
        database: dbConfig.name,
        user: dbConfig.user,
        password: dbConfig.password || ''
      });

      await client.connect();
      // Key results will be deleted automatically due to CASCADE
      await client.query('DELETE FROM objectives WHERE objective_id = $1', [objectiveId]);
      await client.end();

      res.json({ success: true });
    } catch (error: any) {
      console.error('PostgreSQL objective delete error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Generate DOCX report for an objective
  app.post('/api/export/objective/docx', requireEditor, async (req: Request, res: Response) => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType, TabStopPosition } = require('docx');
      const { objective, metrics } = req.body;
      
      if (!objective) {
        return res.status(400).json({ success: false, error: 'Objective data required' });
      }

      const date = new Date().toISOString().split('T')[0];
      const children: any[] = [];

      // Title
      children.push(
        new Paragraph({
          text: 'Objective Report: ' + objective.name,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: 'Generated: ' + date,
          spacing: { after: 400 }
        }),
        new Paragraph({ text: '' })
      );

      // Objective Details
      children.push(
        new Paragraph({
          text: '📋 Objective Details',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        })
      );

      const details = [
        ['Objective ID:', objective.objective_id],
        ['Name:', objective.name],
        ['Description:', objective.description],
        ['Owner Team:', objective.owner_team],
        ['Status:', objective.status],
        ['Priority:', objective.priority || 'Medium'],
        ['Strategic Pillar:', objective.strategic_pillar || 'N/A'],
        ['Timeframe:', `${objective.timeframe.start} to ${objective.timeframe.end}`]
      ];

      details.forEach(([label, value]) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: label + ' ', bold: true }),
              new TextRun({ text: value })
            ],
            spacing: { after: 100 }
          })
        );
      });

      // Key Results
      if (objective.key_results && objective.key_results.length > 0) {
        children.push(
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({
            text: `🎯 Key Results (${objective.key_results.length})`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          })
        );

        objective.key_results.forEach((kr: any, index: number) => {
          const current = kr.current_value ?? kr.baseline_value;
          const range = Math.abs(kr.target_value - kr.baseline_value);
          const progress = range > 0 ? Math.min(100, Math.abs(current - kr.baseline_value) / range * 100) : 0;
          const isOnTrack = kr.direction === 'increase' 
            ? current >= (kr.baseline_value + range * 0.5)
            : current <= (kr.baseline_value - range * 0.5);

          children.push(
            new Paragraph({
              text: `${index + 1}. ${kr.name}`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          );

          const krDetails = [
            ['Baseline:', `${kr.baseline_value} ${kr.unit}`],
            ['Current:', `${current} ${kr.unit}`],
            ['Target:', `${kr.target_value} ${kr.unit}`],
            ['Direction:', kr.direction],
            ['Progress:', `${Math.round(progress)}%`],
            ['Status:', isOnTrack ? '✅ On Track' : '⚠️ Needs Attention']
          ];

          krDetails.forEach(([label, value]) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: label + ' ', bold: true }),
                  new TextRun({ text: value })
                ],
                spacing: { after: 80 }
              })
            );
          });

          // Associated Metrics
          if (kr.metric_ids && kr.metric_ids.length > 0 && metrics) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: 'Associated Metrics: ', bold: true }),
                  new TextRun({ text: kr.metric_ids.join(', ') })
                ],
                spacing: { after: 100, before: 100 }
              })
            );

            kr.metric_ids.forEach((metricId: string) => {
              const metric = metrics.find((m: any) => m.metric_id === metricId);
              if (metric) {
                children.push(
                  new Paragraph({
                    text: `• ${metric.name} (${metric.metric_id})`,
                    spacing: { after: 80 },
                    indent: { left: 720 }
                  })
                );
                if (metric.category) {
                  children.push(
                    new Paragraph({
                      text: `Category: ${metric.category}`,
                      spacing: { after: 60 },
                      indent: { left: 1080 }
                    })
                  );
                }
                if (metric.governance?.owner_team || metric.owner?.team) {
                  children.push(
                    new Paragraph({
                      text: `Owner: ${metric.governance?.owner_team || metric.owner?.team}`,
                      spacing: { after: 60 },
                      indent: { left: 1080 }
                    })
                  );
                }
                if (metric.definition?.formula) {
                  children.push(
                    new Paragraph({
                      text: `Formula: ${metric.definition.formula}`,
                      spacing: { after: 60 },
                      indent: { left: 1080 }
                    })
                  );
                }
              }
            });
          }

          children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        });
      } else {
        children.push(
          new Paragraph({
            text: '🎯 Key Results',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: 'No key results defined for this objective.',
            spacing: { after: 200 }
          })
        );
      }

      // Summary
      const totalMetrics = objective.key_results?.reduce((sum: number, kr: any) => sum + (kr.metric_ids?.length || 0), 0) || 0;
      const avgProgress = objective.key_results && objective.key_results.length > 0
        ? objective.key_results.reduce((sum: number, kr: any) => {
            const current = kr.current_value ?? kr.baseline_value;
            const range = Math.abs(kr.target_value - kr.baseline_value);
            const progress = range > 0 ? Math.min(100, Math.abs(current - kr.baseline_value) / range * 100) : 0;
            return sum + progress;
          }, 0) / objective.key_results.length
        : 0;

      children.push(
        new Paragraph({
          text: '📊 Summary',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Key Results: ', bold: true }),
            new TextRun({ text: String(objective.key_results?.length || 0) })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Metrics: ', bold: true }),
            new TextRun({ text: String(totalMetrics) })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Average Progress: ', bold: true }),
            new TextRun({ text: `${Math.round(avgProgress)}%` })
          ],
          spacing: { after: 200 }
        })
      );

      // Footer
      children.push(
        new Paragraph({ text: '', spacing: { before: 400 } }),
        new Paragraph({
          text: 'Report generated by MDL Dashboard v1.0.0',
          italics: true,
          alignment: AlignmentType.CENTER
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: children
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${objective.objective_id}_${objective.name.replace(/[^a-z0-9]/gi, '_')}.docx"`);
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error('DOCX generation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Universal import endpoint - supports all template types
  app.post('/api/import', requireEditor, async (req: Request, res: Response) => {
    try {
      const { data, dbConfig } = req.body;

      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Missing data field in request body'
        });
      }

      // Import using ConfigLoader
      const { ConfigLoader } = await import('../config');
      const result = ConfigLoader.parseImportData(data);

      const imported = {
        metrics: 0,
        domains: 0,
        objectives: 0,
        errors: [] as string[]
      };

      // Import metrics
      const store = getStore();
      for (const metric of result.metrics) {
        try {
          await store.create(metric as unknown as MetricDefinitionInput);
          imported.metrics++;
        } catch (error: any) {
          imported.errors.push(`Metric ${metric.metric_id}: ${error.message}`);
        }
      }

      // Import domains (requires PostgreSQL)
      if (result.domains.length > 0) {
        if (!dbConfig) {
          imported.errors.push(`${result.domains.length} domain(s) require database configuration`);
        } else {
          const { PostgresDomainStore } = await import('../storage/PostgresDomainStore');
          const domainStore = new PostgresDomainStore(dbConfig);
          for (const domain of result.domains) {
            try {
              // Check if domain exists, then create or update
              const existingDomains = await domainStore.findAll();
              const exists = existingDomains.some(d => d.domain_id === domain.domain_id);
              if (exists) {
                await domainStore.update(domain);
              } else {
                await domainStore.create(domain);
              }
              imported.domains++;
            } catch (error: any) {
              imported.errors.push(`Domain ${domain.domain_id}: ${error.message}`);
            }
          }
        }
      }

      // Import objectives (requires PostgreSQL)
      if (result.objectives.length > 0) {
        if (!dbConfig) {
          imported.errors.push(`${result.objectives.length} objective(s) require database configuration`);
        } else {
          const { PostgresObjectiveStore } = await import('../storage/PostgresObjectiveStore');
          const objectiveStore = new PostgresObjectiveStore(dbConfig);
          for (const objective of result.objectives) {
            try {
              // Check if objective exists, then create or update
              const existingObjectives = await objectiveStore.findAll();
              const exists = existingObjectives.some(o => o.objective_id === objective.objective_id);
              if (exists) {
                await objectiveStore.update(objective);
              } else {
                await objectiveStore.create(objective);
              }
              imported.objectives++;
            } catch (error: any) {
              imported.errors.push(`Objective ${objective.objective_id}: ${error.message}`);
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          type: result.type,
          imported,
          total: imported.metrics + imported.domains + imported.objectives
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test database connection
  app.post(
    '/api/database/test',
    optionalAuthenticate,
    validateBody(databaseConfigSchema),
    async (req: Request, res: Response) => {
      try {
        const { host, port, database, user, password } = req.body;

        const client = new Client({
          host,
          port,
          database,
          user,
          password: password || ''
        });

      await client.connect();
      
      // Test query
      await client.query('SELECT 1');
      
      await client.end();

        res.json({ 
          success: true, 
          message: 'Connection successful',
          database: { host, port, database, user }
        });
      } catch (error) {
        const err = error as Error;
        console.error('Database connection test error:', err);
        res.status(500).json({ 
          success: false, 
          error: err.message || 'Connection failed'
        });
      }
    }
  );

  // Switch storage mode
  app.post(
    '/api/storage/switch',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { storage, postgres } = req.body;
        
        if (!storage) {
          return res.status(400).json({ success: false, error: 'Storage mode is required' });
        }

        // Import the switch function from index
        const { switchStorageMode } = await import('../index');
        const result = await switchStorageMode(storage, postgres);
        
        if (result.success) {
          res.json({ success: true, message: `Switched to ${storage} storage`, mode: storage });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
      } catch (error) {
        const err = error as Error;
        logger.error({ error: err }, 'Storage mode switch error');
        res.status(500).json({ 
          success: false, 
          error: err.message || 'Failed to switch storage mode'
        });
      }
    }
  );

  // Get current storage mode
  app.get(
    '/api/storage/mode',
    optionalAuthenticate,
    async (req: Request, res: Response) => {
      try {
        const { getCurrentStorageMode } = await import('../index');
        const info = getCurrentStorageMode();
        res.json({ success: true, data: info });
      } catch (error) {
        const err = error as Error;
        res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  // Add error handling middleware (must be last)
  app.use(errorHandlingMiddleware);

  // Note: 404 handler should be added after dashboard routes in index.ts
  // For API-only usage (like tests), the error handler above will catch 404s

  return app;
}

/**
 * Start the server
 */
export function startServer(store: IMetricStore, config: ServerConfig = {}) {
  const app = createServer(store, config);
  const port = config.port || parseInt(process.env.PORT || '3000');
  const host = config.host || process.env.HOST || '0.0.0.0';

  return app.listen(port, host, () => {
    logStartup({
      port,
      host,
      storageMode: process.env.STORAGE_MODE || 'local',
      dbConnected: false, // Will be updated when we add DB pool
    });
    logger.info(`Health check: http://${host}:${port}/health`);
    logger.info(`API endpoints: http://${host}:${port}/api/metrics`);
  });
}
