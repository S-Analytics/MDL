/**
 * Integration Tests for Metrics API
 * 
 * Tests metrics endpoints including CRUD operations and filtering.
 */

import { Application } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { FileUserStore } from '../../src/auth/FileUserStore';
import { DataType } from '../../src/models';
import { InMemoryMetricStore } from '../../src/storage/MetricStore';
import { cleanupTestServer, createTestServer, createTestUserWithToken } from '../helpers/testServer';

describe('Metrics API Integration Tests', () => {
  let app: Application;
  let userStore: FileUserStore;
  let metricStore: InMemoryMetricStore;
  let editorToken: string;
  let viewerToken: string;
  // Use unique filename to avoid parallel test conflicts
  const testAuthFile = path.join(process.cwd(), 'data', `test-users-metrics-${Date.now()}.json`);

  // Helper for simplified store input (MetricDefinitionInput)
  const createStoreMetric = (overrides = {}) => ({
    name: 'Test Metric',
    description: 'Test metric for integration testing',
    category: 'test',
    dataType: DataType.NUMBER,
    unit: 'count',
    tags: ['test'],
    ...overrides,
  });

  // Helper for full API input that matches metricDefinitionSchema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createApiMetric = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    metric_id: `TEST-${Date.now()}`,
    name: 'Test Metric',
    short_name: 'test_metric',
    description: 'Test metric for integration testing',
    category: 'test',
    tier: 'Tier-1',
    business_domain: 'Test Domain',
    metric_type: 'leading',
    tags: ['test'],
    alignment: {
      strategic_pillar: 'Test Pillar',
      primary_objective_ids: [],
      related_okr_ids: [],
      why_it_matters: 'Test alignment',
    },
    definition: {
      formula: 'a / b',
      formula_detail: 'Test formula',
      numerator: {
        event_name: 'test_event',
        filters: [],
      },
      denominator: {
        event_name: 'test_total',
        filters: [],
      },
      unit: 'percentage',
      expected_direction: 'increase',
      example_calculation: {
        a: 10,
        b: 20,
        result: 0.5,
      },
    },
    data: {
      primary_sources: [
        {
          system: 'test_db',
          table_or_stream: 'events',
          connection_id: 'test_conn',
        },
      ],
      secondary_sources: [],
      data_freshness: 'real-time',
      update_frequency: 'daily',
      time_grain: ['daily'],
      data_retention: '1 year',
    },
    governance: {
      data_classification: 'Internal',
      pii_involved: false,
      regulatory_constraints: [],
      owner_team: 'Test Team',
      technical_owner: 'test-tech@example.com',
      business_owner: 'test-biz@example.com',
      version: '1.0.0',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    targets_and_alerts: {
      target_value: 75,
      warning_threshold: 60,
      critical_threshold: 50,
      comparison_baseline: 'previous_period',
      alert_rules: [],
    },
    visualization: {
      default_chart_type: 'line',
      default_time_range: '30d',
      dashboard_locations: [],
      drilldowns: [],
    },
    operational_usage: {
      decision_use_cases: ['Testing and validation'],
      review_cadence: 'weekly',
      linked_playbooks: [],
    },
    dimensions: [],
    relationships: {
      upstream_metric_ids: [],
      downstream_metric_ids: [],
    },
    ...overrides,
  });

  beforeAll(async () => {
    // Create test auth file
    const dir = path.dirname(testAuthFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(testAuthFile, JSON.stringify({
      users: [],
      refreshTokens: [],
      apiKeys: [],
    }));

    userStore = new FileUserStore(testAuthFile);
    await userStore.initialize();

    metricStore = new InMemoryMetricStore();

    app = await createTestServer({ authEnabled: true, userStore, storage: metricStore });

    // Create test users
    const editor = await createTestUserWithToken(userStore, {
      username: `editor_${Date.now()}`,
      email: `editor_${Date.now()}@test.com`,
      password: 'Editor123!',
      role: 'editor',
    });
    editorToken = editor.token;

    const viewer = await createTestUserWithToken(userStore, {
      username: `viewer_${Date.now()}`,
      email: `viewer_${Date.now()}@test.com`,
      password: 'Viewer123!',
      role: 'viewer',
    });
    viewerToken = viewer.token;
  });

  afterAll(() => {
    cleanupTestServer();
    // Clean up test file
    if (fs.existsSync(testAuthFile)) {
      fs.unlinkSync(testAuthFile);
    }
  });

  beforeEach(async () => {
    // Clear metrics between tests by directly accessing the store
    // Use type assertion since we know it's InMemoryMetricStore
    if (metricStore && typeof (metricStore as any).clear === 'function') {
      await (metricStore as any).clear();
    } else {
      // Fallback: delete all metrics one by one
      const result = await metricStore.findAll();
      const allMetrics = ('data' in result ? result.data : result) as Array<{ metric_id: string }>;
      for (const metric of allMetrics) {
        await metricStore.delete(metric.metric_id);
      }
    }
  });

  describe('GET /api/v1/metrics', () => {
    it('should return empty array when no metrics exist', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return all metrics', async () => {
      // Use API to create metric to ensure same store instance
      await request(app)
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(createApiMetric())
        .expect(201);

      const response = await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should filter metrics by category', async () => {
      await metricStore.create(createStoreMetric({ category: 'finance' }));
      await metricStore.create(createStoreMetric({ name: 'Metric 2', category: 'marketing' }));

      const response = await request(app)
        .get('/api/v1/metrics')
        .query({ category: 'finance' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('finance');
    });

    it('should filter metrics by tags', async () => {
      await metricStore.create(createStoreMetric({ tags: ['test', 'integration'] }));
      await metricStore.create(createStoreMetric({ name: 'Metric 2', tags: ['production'] }));

      const response = await request(app)
        .get('/api/v1/metrics')
        .query({ tags: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tags).toContain('test');
    });
  });

  describe('GET /api/v1/metrics/:id', () => {
    it('should return a metric by ID', async () => {
      const metric = await metricStore.create(createStoreMetric());

      const response = await request(app)
        .get(`/api/v1/metrics/${metric.metric_id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metric_id).toBe(metric.metric_id);
      expect(response.body.data.name).toBe('Test Metric');
    });

    it('should return 404 for non-existent metric', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/NON-EXISTENT-ID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Metric not found');
    });
  });

  describe('POST /api/v1/metrics', () => {
    it('should create a new metric with editor role', async () => {
      const metricInput = createApiMetric({ name: 'New Test Metric' });

      const response = await request(app)
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(metricInput);

      if (response.status !== 201) {
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Test Metric');
      expect(response.body.data.metric_id).toBeDefined();
    });

    it('should reject creation without authentication', async () => {
      await request(app)
        .post('/api/v1/metrics')
        .send(createApiMetric())
        .expect(401);
    });

    it('should reject creation with viewer role', async () => {
      await request(app)
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(createApiMetric())
        .expect(403);
    });

    it('should reject invalid metric data', async () => {
      const invalidMetric = {
        name: 'Invalid Metric',
        // Missing required fields
      };

      await request(app)
        .post('/api/v1/metrics')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(invalidMetric)
        .expect(400);
    });
  });

  describe('PUT /api/v1/metrics/:id', () => {
    it('should update a metric with editor role', async () => {
      const metric = await metricStore.create(createStoreMetric());

      const updates = {
        metric_id: metric.metric_id,
        name: 'Updated Test Metric',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updates);

      if (response.status !== 200) {
        console.log('PUT Response:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Metric');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should reject update without authentication', async () => {
      const metric = await metricStore.create(createStoreMetric());

      await request(app)
        .put(`/api/v1/metrics/${metric.metric_id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('should reject update with viewer role', async () => {
      const metric = await metricStore.create(createStoreMetric());

      await request(app)
        .put(`/api/v1/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 404 for non-existent metric', async () => {
      await request(app)
        .put('/api/v1/metrics/NON-EXISTENT-ID')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ metric_id: 'NON-EXISTENT-ID', name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/metrics/:id', () => {
    it('should delete a metric', async () => {
      const metric = await metricStore.create(createStoreMetric());
      const { token } = await createTestUserWithToken(userStore, {
        username: 'admin_delete',
        email: 'admin_delete@test.com',
        password: 'AdminPass123!',
        role: 'admin',
      });

      const response = await request(app)
        .delete(`/api/v1/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Metric deleted successfully');

      // Verify it's actually deleted
      const deleted = await metricStore.findById(metric.metric_id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent metric', async () => {
      const { token } = await createTestUserWithToken(userStore, {
        username: 'admin_deletetest',
        email: 'admin_deletetest@test.com',
        password: 'AdminPass123!',
        role: 'admin',
      });

      const response = await request(app)
        .delete('/api/v1/metrics/NON-EXISTENT-ID')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Metric not found');
    });
  });

  describe('GET /api/v1/metrics/:id/policy', () => {
    it('should generate OPA policy for a metric', async () => {
      const metric = await metricStore.create(createStoreMetric());

      const response = await request(app)
        .get(`/api/v1/metrics/${metric.metric_id}/policy`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metric_id).toBe(metric.metric_id);
      expect(response.body.data.policy).toContain('package metrics');
      expect(response.body.data.policy).toContain(metric.metric_id);
    });

    it('should return 404 for non-existent metric', async () => {
      await request(app)
        .get('/api/v1/metrics/NON-EXISTENT-ID/policy')
        .expect(404);
    });
  });

  describe('GET /api/v1/policies', () => {
    it('should generate policy bundle for all metrics', async () => {
      await metricStore.create(createStoreMetric({ name: 'Metric 1' }));
      await metricStore.create(createStoreMetric({ name: 'Metric 2' }));

      const response = await request(app)
        .get('/api/v1/policies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return empty bundle when no metrics exist', async () => {
      const response = await request(app)
        .get('/api/v1/policies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });
});
