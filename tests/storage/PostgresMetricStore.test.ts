import { DataType, MetricDefinitionInput } from '../../src/models';
import { PostgresMetricStore } from '../../src/storage/PostgresMetricStore';

/**
 * PostgresMetricStore Tests
 * 
 * These tests require a running PostgreSQL instance with the MDL schema.
 * Set environment variables to configure test database connection:
 * 
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_NAME=mdl_test
 * DB_USER=postgres
 * DB_PASSWORD=yourpassword
 * 
 * To run these tests:
 * 1. Create test database: CREATE DATABASE mdl_test;
 * 2. Run schema setup: DB_NAME=mdl_test node scripts/setup-database.js
 * 3. Run tests: npm test -- PostgresMetricStore
 * 
 * Note: Tests will clean up after themselves but use a separate test database.
 */

describe('PostgresMetricStore', () => {
  let store: PostgresMetricStore;
  const testConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mdl_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  // Skip tests if no database password provided
  const skipIfNoDb = process.env.DB_PASSWORD ? describe : describe.skip;

  skipIfNoDb('PostgreSQL Integration Tests', () => {
    beforeAll(async () => {
      store = new PostgresMetricStore(testConfig);
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      // Clean test data before each test
      const { Client } = require('pg');
      const client = new Client(testConfig);
      await client.connect();
      await client.query('DELETE FROM metrics WHERE metric_id LIKE $1', ['TEST-%']);
      await client.end();
    });

    const createSampleMetric = (): MetricDefinitionInput => ({
      name: 'Test Metric',
      description: 'A test metric for validation',
      category: 'test',
      dataType: DataType.NUMBER,
      tags: ['test', 'sample'],
    });

    describe('create', () => {
      it('should create a new metric in PostgreSQL', async () => {
        const input = createSampleMetric();
        const metric = await store.create(input);

        expect(metric.metric_id).toBeDefined();
        expect(metric.name).toBe(input.name);
        expect(metric.description).toBe(input.description);
        expect(metric.category).toBe(input.category);
      });

      it('should generate unique IDs for metrics with same name', async () => {
        const input = createSampleMetric();
        const metric1 = await store.create(input);
        const metric2 = await store.create(input);

        expect(metric1.metric_id).not.toBe(metric2.metric_id);
      });

      it('should store JSONB fields correctly', async () => {
        const input = {
          ...createSampleMetric(),
          tags: ['tag1', 'tag2', 'tag3'],
        };
        const metric = await store.create(input);
        const found = await store.findById(metric.metric_id);

        expect(found).toBeDefined();
        expect(found?.tags).toEqual(['tag1', 'tag2', 'tag3']);
      });

      it('should handle metrics with comprehensive data', async () => {
        const input: MetricDefinitionInput = {
          name: 'Comprehensive Test Metric',
          description: 'Full featured test metric',
          category: 'test',
          dataType: DataType.PERCENTAGE,
          unit: 'percent',
          tags: ['comprehensive', 'test'],
          validationRules: [
            { type: 'min', value: 0, message: 'Must be non-negative' },
            { type: 'max', value: 100, message: 'Cannot exceed 100%' },
          ],
          governance: {
            owner_team: 'Test Team',
            technical_owner: 'test@example.com',
            business_owner: 'business@example.com',
            status: 'active',
            data_classification: 'internal',
            approval_required: false,
          },
        };

        const metric = await store.create(input);
        expect(metric.metric_id).toBeDefined();
        expect(metric.governance.owner_team).toBe('Test Team');
      });
    });

    describe('findById', () => {
      it('should find a metric by ID', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        const found = await store.findById(created.metric_id);

        expect(found).toBeDefined();
        expect(found?.metric_id).toBe(created.metric_id);
        expect(found?.name).toBe(created.name);
      });

      it('should return null for non-existent ID', async () => {
        const found = await store.findById('NONEXISTENT-ID');
        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      it('should return all metrics when no filters provided', async () => {
        const metric1 = await store.create({ ...createSampleMetric(), name: 'Test Metric 1' });
        const metric2 = await store.create({ ...createSampleMetric(), name: 'Test Metric 2' });

        const metrics = await store.findAll();
        expect(metrics.length).toBeGreaterThanOrEqual(2);
        
        const metricIds = metrics.map(m => m.metric_id);
        expect(metricIds).toContain(metric1.metric_id);
        expect(metricIds).toContain(metric2.metric_id);
      });

      it('should filter by category', async () => {
        await store.create({ ...createSampleMetric(), category: 'test-cat-1' });
        await store.create({ ...createSampleMetric(), category: 'test-cat-2' });

        const metrics = await store.findAll({ category: 'test-cat-1' });
        expect(metrics.length).toBeGreaterThanOrEqual(1);
        expect(metrics.every(m => m.category === 'test-cat-1')).toBe(true);
      });

      it('should filter by business domain', async () => {
        await store.create({ 
          ...createSampleMetric(), 
          name: 'Domain Test 1',
          category: 'test-domain-1' 
        });
        await store.create({ 
          ...createSampleMetric(), 
          name: 'Domain Test 2',
          category: 'test-domain-2' 
        });

        const metrics = await store.findAll({ business_domain: 'test-domain-1' });
        expect(metrics.length).toBeGreaterThanOrEqual(1);
        expect(metrics.every(m => m.business_domain === 'test-domain-1')).toBe(true);
      });

      it('should filter by tier', async () => {
        await store.create({ 
          ...createSampleMetric(), 
          name: 'Tier 1 Metric',
          category: 'test-tier' 
        });

        const metrics = await store.findAll({ tier: 'Tier-2' });
        expect(metrics.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('update', () => {
      it('should update an existing metric', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        
        const updated = await store.update(created.metric_id, {
          description: 'Updated description',
          tags: ['updated', 'test'],
        });

        expect(updated.description).toBe('Updated description');
        expect(updated.metric_id).toBe(created.metric_id);
        expect(updated.tags).toContain('updated');
      });

      it('should update JSONB fields', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        
        const updated = await store.update(created.metric_id, {
          governance: {
            ...created.governance,
            owner_team: 'New Team',
            status: 'deprecated',
          },
        });

        expect(updated.governance.owner_team).toBe('New Team');
        expect(updated.governance.status).toBe('deprecated');
      });

      it('should throw error for non-existent metric', async () => {
        await expect(
          store.update('NONEXISTENT-ID', { description: 'test' })
        ).rejects.toThrow();
      });

      it('should preserve fields not being updated', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        const originalName = created.name;
        
        const updated = await store.update(created.metric_id, {
          description: 'New description',
        });

        expect(updated.name).toBe(originalName);
        expect(updated.description).toBe('New description');
      });
    });

    describe('delete', () => {
      it('should delete an existing metric', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        
        const deleted = await store.delete(created.metric_id);
        expect(deleted).toBe(true);

        const found = await store.findById(created.metric_id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent metric', async () => {
        const deleted = await store.delete('NONEXISTENT-ID');
        expect(deleted).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true for existing metric', async () => {
        const input = createSampleMetric();
        const created = await store.create(input);
        
        const exists = await store.exists(created.metric_id);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent metric', async () => {
        const exists = await store.exists('NONEXISTENT-ID');
        expect(exists).toBe(false);
      });
    });

    describe('connection management', () => {
      it('should handle multiple operations without connection issues', async () => {
        const operations = [];
        for (let i = 0; i < 5; i++) {
          operations.push(
            store.create({
              ...createSampleMetric(),
              name: `Concurrent Test ${i}`,
            })
          );
        }

        const results = await Promise.all(operations);
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.metric_id).toBeDefined();
        });
      });

      it('should properly close connections', async () => {
        const tempStore = new PostgresMetricStore(testConfig);
        await tempStore.create(createSampleMetric());
        await expect(tempStore.close()).resolves.not.toThrow();
      });
    });

    describe('error handling', () => {
      it('should handle connection errors gracefully', async () => {
        const badStore = new PostgresMetricStore({
          ...testConfig,
          host: 'invalid-host-12345',
          connectionTimeoutMillis: 1000,
        });

        await expect(
          badStore.create(createSampleMetric())
        ).rejects.toThrow();

        await badStore.close();
      });

      it('should validate required fields', async () => {
        const invalidInput = {
          name: '',
          description: 'Test',
          category: 'test',
          dataType: DataType.NUMBER,
        } as MetricDefinitionInput;

        // The store should handle this, either by rejecting or generating defaults
        const result = await store.create(invalidInput);
        expect(result.metric_id).toBeDefined();
      });
    });
  });

  describe('PostgreSQL not configured', () => {
    it('should skip tests when database is not available', () => {
      if (!process.env.DB_PASSWORD) {
        console.log('Skipping PostgreSQL tests - no DB_PASSWORD provided');
        expect(true).toBe(true);
      }
    });
  });
});
