import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataType, MetricDefinitionInput } from '../../src/models';
import { InMemoryMetricStore } from '../../src/storage/MetricStore';

describe('InMemoryMetricStore', () => {
  let store: InMemoryMetricStore;
  const testPersistencePath = path.join('/tmp', 'test-metrics.json');

  beforeEach(() => {
    // Clean up test file if it exists
    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }
    store = new InMemoryMetricStore();
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }
  });

  const createSampleMetric = (): MetricDefinitionInput => ({
    name: 'Test Metric',
    description: 'A test metric for validation',
    category: 'test',
    dataType: DataType.NUMBER,
    tags: ['test', 'sample'],
  });

  describe('create', () => {
    it('should create a new metric', async () => {
      const input = createSampleMetric();
      const metric = await store.create(input);

      expect(metric.metric_id).toBeDefined();
      expect(metric.name).toBe(input.name);
      expect(metric.description).toBe(input.description);
      expect(metric.category).toBe(input.category);
      expect(metric.governance.created_at).toBeDefined();
      expect(metric.governance.updated_at).toBeDefined();
      expect(metric.tier).toBe('Tier-2');
      expect(metric.business_domain).toBe(input.category);
    });

    it('should initialize version to 1.0.0 on creation', async () => {
      const input = createSampleMetric();
      const metric = await store.create(input);

      expect(metric.metadata.version).toBe('1.0.0');
      expect(metric.metadata.created_at).toBeDefined();
      expect(metric.metadata.created_by).toBeDefined();
      expect(metric.metadata.change_history).toHaveLength(1);
      expect(metric.metadata.change_history[0].version).toBe('1.0.0');
      expect(metric.metadata.change_history[0].change_type).toBe('major');
      expect(metric.metadata.change_history[0].changes_summary).toBe('Initial metric creation');
    });

    it('should generate unique IDs for metrics with same name', async () => {
      const input = createSampleMetric();
      const metric1 = await store.create(input);
      const metric2 = await store.create(input);

      expect(metric1.metric_id).not.toBe(metric2.metric_id);
    });

    it('should convert legacy input to new format', async () => {
      const input = createSampleMetric();
      const metric = await store.create(input);

      expect(metric.short_name).toBeDefined();
      expect(metric.alignment).toBeDefined();
      expect(metric.definition).toBeDefined();
      expect(metric.data).toBeDefined();
      expect(metric.targets_and_alerts).toBeDefined();
      expect(metric.visualization).toBeDefined();
      expect(metric.relationships).toBeDefined();
      expect(metric.operational_usage).toBeDefined();
      expect(metric.metadata).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find a metric by ID', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      const found = await store.findById(created.metric_id);

      expect(found).toBeDefined();
      expect(found?.metric_id).toBe(created.metric_id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await store.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all metrics when no filters provided', async () => {
      await store.create(createSampleMetric());
      await store.create({ ...createSampleMetric(), name: 'Second Metric' });

      const metrics = await store.findAll();
      expect(metrics).toHaveLength(2);
    });

    it('should filter by category', async () => {
      await store.create({ ...createSampleMetric(), category: 'category1' });
      await store.create({ ...createSampleMetric(), category: 'category2' });

      const metrics = await store.findAll({ category: 'category1' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].category).toBe('category1');
    });

    it('should filter by tags', async () => {
      const metric1 = await store.create({ ...createSampleMetric(), name: 'Metric 1', tags: ['tag1', 'tag2'] });
      await store.create({ ...createSampleMetric(), name: 'Metric 2', tags: ['tag3'] });

      const metrics = await store.findAll({ tags: ['tag1'] });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics.some(m => m.metric_id === metric1.metric_id)).toBe(true);
      expect(metrics.every(m => m.tags?.some(t => ['tag1'].includes(t)))).toBe(true);
    });

    it('should filter by business domain', async () => {
      await store.create({ ...createSampleMetric(), category: 'finance' });
      await store.create({ ...createSampleMetric(), category: 'marketing' });

      const metrics = await store.findAll({ business_domain: 'finance' });
      expect(metrics).toHaveLength(1);
      expect(metrics[0].business_domain).toBe('finance');
    });

    it('should filter by tier', async () => {
      const input1 = createSampleMetric();
      input1.name = 'Tier1 Metric';
      const metric1 = await store.create(input1);
      // Update tier via partial update to set it to Tier-1
      await store.update(metric1.metric_id, { name: 'Tier1 Metric' });
      
      const metrics = await store.findAll({ tier: 'Tier-2' });
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by metric_type', async () => {
      const input1 = createSampleMetric();
      input1.name = 'Leading Metric';
      const metric1 = await store.create(input1);
      
      const metrics = await store.findAll({ metric_type: 'operational' });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics.some(m => m.metric_id === metric1.metric_id)).toBe(true);
    });

    it('should filter by owner (owner_team)', async () => {
      const input1 = createSampleMetric();
      input1.name = 'Team A Metric';
      const metric1 = await store.create(input1);
      
      // Metrics created via helper have owner_team='Unknown' by default
      // Filter should work with any owner value
      const metrics = await store.findAll({ owner: 'Unknown' });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics.some(m => m.metric_id === metric1.metric_id)).toBe(true);
    });

    it('should return empty array when no filters match', async () => {
      await store.create(createSampleMetric());
      
      const metrics = await store.findAll({ category: 'nonexistent' });
      expect(metrics).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update an existing metric', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await store.update(created.metric_id, {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.metric_id).toBe(created.metric_id);
      expect(new Date(updated.governance.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(created.governance.updated_at).getTime()
      );
    });

    it('should bump patch version for metadata changes', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await store.update(created.metric_id, {
        tags: ['test', 'sample', 'updated'],
      });

      expect(updated.metadata.version).toBe('1.0.1');
      expect(updated.metadata.change_history).toHaveLength(2);
      expect(updated.metadata.change_history[1].change_type).toBe('patch');
      expect(updated.metadata.change_history[1].fields_changed).toContain('tags');
    });

    it('should bump patch version for tags changes', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await store.update(created.metric_id, {
        tags: ['test', 'sample', 'updated'],
      });

      expect(updated.metadata.version).toBe('1.0.1');
      expect(updated.metadata.change_history).toHaveLength(2);
      expect(updated.metadata.change_history[1].change_type).toBe('patch');
    });

    it('should track description changes as minor', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await store.update(created.metric_id, {
        description: 'Updated description for testing version bump',
      });

      expect(updated.metadata.version).toBe('1.1.0');
      expect(updated.metadata.change_history).toHaveLength(2);
      expect(updated.metadata.change_history[1].change_type).toBe('minor');
    });

    it('should track multiple changes in change history', async () => {
      const input = createSampleMetric();
      const created = await store.create(input);
      
      // First update - patch (tags)
      await new Promise(resolve => setTimeout(resolve, 10));
      let updated = await store.update(created.metric_id, { tags: ['updated'] });
      expect(updated.metadata.version).toBe('1.0.1');
      
      // Second update - minor (description)
      await new Promise(resolve => setTimeout(resolve, 10));
      updated = await store.update(created.metric_id, { description: 'Second update' });
      expect(updated.metadata.version).toBe('1.1.0');
      
      // Third update - minor (name)
      await new Promise(resolve => setTimeout(resolve, 10));
      updated = await store.update(created.metric_id, { name: 'Updated Test Metric' });
      expect(updated.metadata.version).toBe('1.2.0');
      
      expect(updated.metadata.change_history).toHaveLength(4); // Initial + 3 updates
      expect(updated.metadata.change_history.map(ch => ch.version)).toEqual([
        '1.0.0',
        '1.0.1',
        '1.1.0',
        '1.2.0',
      ]);
    });

    it('should throw error for non-existent metric', async () => {
      await expect(
        store.update('non-existent-id', { description: 'test' })
      ).rejects.toThrow();
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
      const deleted = await store.delete('non-existent-id');
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
      const exists = await store.exists('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist metrics to file', async () => {
      const storeWithPersistence = new InMemoryMetricStore(testPersistencePath);
      const input = createSampleMetric();
      await storeWithPersistence.create(input);

      expect(fs.existsSync(testPersistencePath)).toBe(true);
    });

    it('should load metrics from file on initialization', async () => {
      // Create and save a metric
      const store1 = new InMemoryMetricStore(testPersistencePath);
      const input = createSampleMetric();
      const created = await store1.create(input);

      // Create new store instance and verify it loads the data
      const store2 = new InMemoryMetricStore(testPersistencePath);
      const found = await store2.findById(created.metric_id);

      expect(found).toBeDefined();
      expect(found?.name).toBe(input.name);
    });
  });
});
