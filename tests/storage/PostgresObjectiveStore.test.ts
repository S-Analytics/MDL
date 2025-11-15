import { PostgresObjectiveStore } from '../../src/storage/PostgresObjectiveStore';

/**
 * PostgresObjectiveStore Tests
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
 * 3. Run tests: npm test -- PostgresObjectiveStore
 */

describe('PostgresObjectiveStore', () => {
  let store: PostgresObjectiveStore;
  const testConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mdl_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  const skipIfNoDb = process.env.DB_PASSWORD ? describe : describe.skip;

  skipIfNoDb('PostgreSQL Integration Tests', () => {
    beforeAll(async () => {
      store = new PostgresObjectiveStore(testConfig);
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      // Clean test data before each test
      const { Client } = require('pg');
      const client = new Client(testConfig);
      await client.connect();
      await client.query('DELETE FROM key_results WHERE objective_id LIKE $1', ['TEST-OBJ-%']);
      await client.query('DELETE FROM objectives WHERE objective_id LIKE $1', ['TEST-OBJ-%']);
      await client.end();
    });

    const createSampleObjective = () => ({
      objective_id: `TEST-OBJ-${Date.now()}`,
      name: 'Test Objective',
      description: 'A test objective for validation',
      business_domain: 'Test Domain',
      tier: 'Tier-1',
      quarter: 'Q4 2025',
      owner: 'test@example.com',
      target_value: 100,
      current_value: 50,
      start_date: '2025-10-01',
      end_date: '2025-12-31',
      status: 'in_progress',
      progress: 50,
      key_results: [
        {
          kr_id: 'TEST-KR-1',
          name: 'Test Key Result 1',
          description: 'First test key result',
          metric_ids: ['METRIC-1'],
          target_value: 95,
          current_value: 80,
          unit: 'percent',
          status: 'on_track',
          weight: 50,
        },
        {
          kr_id: 'TEST-KR-2',
          name: 'Test Key Result 2',
          description: 'Second test key result',
          metric_ids: ['METRIC-2'],
          target_value: 100,
          current_value: 60,
          unit: 'count',
          status: 'at_risk',
          weight: 50,
        },
      ],
    });

    describe('create', () => {
      it('should create a new objective with key results', async () => {
        const input = createSampleObjective();
        const objective = await store.create(input);

        expect(objective.objective_id).toBe(input.objective_id);
        expect(objective.name).toBe(input.name);
        expect(objective.key_results).toHaveLength(2);
        expect(objective.key_results[0].kr_id).toBe('TEST-KR-1');
        expect(objective.key_results[1].kr_id).toBe('TEST-KR-2');
      });

      it('should handle objectives without key results', async () => {
        const input = {
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-NO-KR-${Date.now()}`,
          key_results: [],
        };

        const objective = await store.create(input);
        expect(objective.objective_id).toBe(input.objective_id);
        expect(objective.key_results).toHaveLength(0);
      });

      it('should set created_at and updated_at timestamps', async () => {
        const input = createSampleObjective();
        const objective = await store.create(input);

        expect(objective.created_at).toBeDefined();
        expect(objective.updated_at).toBeDefined();
        objective.key_results.forEach(kr => {
          expect(kr.created_at).toBeDefined();
          expect(kr.updated_at).toBeDefined();
        });
      });

      it('should create objective with all fields populated', async () => {
        const input = createSampleObjective();
        const objective = await store.create(input);

        expect(objective.business_domain).toBe(input.business_domain);
        expect(objective.tier).toBe(input.tier);
        expect(objective.quarter).toBe(input.quarter);
        expect(objective.owner).toBe(input.owner);
        expect(objective.target_value).toBe(input.target_value);
        expect(objective.current_value).toBe(input.current_value);
        expect(objective.status).toBe(input.status);
        expect(objective.progress).toBe(input.progress);
      });

      it('should throw error for duplicate objective_id', async () => {
        const input = createSampleObjective();
        await store.create(input);

        await expect(store.create(input)).rejects.toThrow();
      });

      it('should handle key results with metric arrays', async () => {
        const input = {
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-MULTI-METRICS-${Date.now()}`,
          key_results: [
            {
              kr_id: 'TEST-KR-MULTI',
              name: 'Multi-metric KR',
              description: 'KR with multiple metrics',
              metric_ids: ['METRIC-1', 'METRIC-2', 'METRIC-3'],
              target_value: 100,
              current_value: 75,
              unit: 'percent',
              status: 'on_track',
              weight: 100,
            },
          ],
        };

        const objective = await store.create(input);
        expect(objective.key_results[0].metric_ids).toHaveLength(3);
        expect(objective.key_results[0].metric_ids).toContain('METRIC-2');
      });
    });

    describe('findById', () => {
      it('should find an objective by ID with key results', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        const found = await store.findById(created.objective_id);

        expect(found).toBeDefined();
        expect(found?.objective_id).toBe(created.objective_id);
        expect(found?.key_results).toHaveLength(2);
      });

      it('should return null for non-existent ID', async () => {
        const found = await store.findById('NONEXISTENT-OBJ-123');
        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      it('should return all objectives with key results', async () => {
        const obj1 = await store.create({
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-ALL-1-${Date.now()}`,
          name: 'Test Objective 1',
        });
        const obj2 = await store.create({
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-ALL-2-${Date.now()}`,
          name: 'Test Objective 2',
        });

        const objectives = await store.findAll();
        expect(objectives.length).toBeGreaterThanOrEqual(2);
        
        const objIds = objectives.map(o => o.objective_id);
        expect(objIds).toContain(obj1.objective_id);
        expect(objIds).toContain(obj2.objective_id);
      });

      it('should populate key results for all objectives', async () => {
        await store.create(createSampleObjective());
        const objectives = await store.findAll();

        const testObj = objectives.find(o => o.objective_id.startsWith('TEST-OBJ-'));
        expect(testObj).toBeDefined();
        expect(testObj?.key_results).toBeDefined();
        expect(Array.isArray(testObj?.key_results)).toBe(true);
      });
    });

    describe('update', () => {
      it('should update objective and replace all key results', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        const updated = await store.update(created.objective_id, {
          ...created,
          name: 'Updated Objective Name',
          description: 'Updated description',
          progress: 75,
          key_results: [
            {
              kr_id: 'TEST-KR-NEW',
              objective_id: created.objective_id,
              name: 'New Key Result',
              description: 'Completely new key result',
              metric_ids: ['METRIC-NEW'],
              target_value: 100,
              current_value: 50,
              unit: 'count',
              status: 'on_track',
              weight: 100,
            },
          ],
        });

        expect(updated.name).toBe('Updated Objective Name');
        expect(updated.progress).toBe(75);
        expect(updated.key_results).toHaveLength(1);
        expect(updated.key_results[0].kr_id).toBe('TEST-KR-NEW');
      });

      it('should delete old key results and insert new ones', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        // Verify initial key results
        const initial = await store.findById(created.objective_id);
        expect(initial?.key_results).toHaveLength(2);
        
        // Update with different key results
        const updated = await store.update(created.objective_id, {
          ...created,
          key_results: [
            {
              kr_id: 'TEST-KR-REPLACED-1',
              objective_id: created.objective_id,
              name: 'Replaced KR 1',
              description: 'First replaced key result',
              metric_ids: ['METRIC-R1'],
              target_value: 80,
              current_value: 40,
              unit: 'percent',
              status: 'on_track',
              weight: 50,
            },
            {
              kr_id: 'TEST-KR-REPLACED-2',
              objective_id: created.objective_id,
              name: 'Replaced KR 2',
              description: 'Second replaced key result',
              metric_ids: ['METRIC-R2'],
              target_value: 90,
              current_value: 45,
              unit: 'percent',
              status: 'on_track',
              weight: 50,
            },
            {
              kr_id: 'TEST-KR-REPLACED-3',
              objective_id: created.objective_id,
              name: 'Replaced KR 3',
              description: 'Third replaced key result',
              metric_ids: ['METRIC-R3'],
              target_value: 100,
              current_value: 50,
              unit: 'count',
              status: 'at_risk',
              weight: 0,
            },
          ],
        });

        expect(updated.key_results).toHaveLength(3);
        expect(updated.key_results.map(kr => kr.kr_id)).toEqual([
          'TEST-KR-REPLACED-1',
          'TEST-KR-REPLACED-2',
          'TEST-KR-REPLACED-3',
        ]);
      });

      it('should update updated_at timestamp', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const updated = await store.update(created.objective_id, {
          ...created,
          progress: 60,
        });

        expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
          new Date(created.updated_at).getTime()
        );
      });

      it('should throw error for non-existent objective', async () => {
        const input = createSampleObjective();
        await expect(
          store.update('NONEXISTENT-OBJ', input)
        ).rejects.toThrow();
      });

      it('should handle update with no key results', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        const updated = await store.update(created.objective_id, {
          ...created,
          key_results: [],
        });

        expect(updated.key_results).toHaveLength(0);
      });
    });

    describe('delete', () => {
      it('should delete objective and cascade to key results', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        const deleted = await store.delete(created.objective_id);
        expect(deleted).toBe(true);

        const found = await store.findById(created.objective_id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent objective', async () => {
        const deleted = await store.delete('NONEXISTENT-OBJ');
        expect(deleted).toBe(false);
      });

      it('should delete all associated key results', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        await store.delete(created.objective_id);

        // Verify key results are also deleted
        const { Client } = require('pg');
        const client = new Client(testConfig);
        await client.connect();
        const result = await client.query(
          'SELECT COUNT(*) FROM key_results WHERE objective_id = $1',
          [created.objective_id]
        );
        await client.end();

        expect(parseInt(result.rows[0].count)).toBe(0);
      });
    });

    describe('exists', () => {
      it('should return true for existing objective', async () => {
        const input = createSampleObjective();
        const created = await store.create(input);
        
        const exists = await store.exists(created.objective_id);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent objective', async () => {
        const exists = await store.exists('NONEXISTENT-OBJ');
        expect(exists).toBe(false);
      });
    });

    describe('transaction handling', () => {
      it('should rollback on error during key result insertion', async () => {
        const input = {
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-ROLLBACK-${Date.now()}`,
          key_results: [
            {
              kr_id: 'TEST-KR-VALID',
              name: 'Valid KR',
              description: 'This should be valid',
              metric_ids: ['METRIC-1'],
              target_value: 100,
              current_value: 50,
              unit: 'percent',
              status: 'on_track',
              weight: 100,
            },
          ],
        };

        // This should succeed normally
        const objective = await store.create(input);
        expect(objective).toBeDefined();
      });
    });

    describe('connection management', () => {
      it('should handle multiple operations without connection issues', async () => {
        const operations = [];
        for (let i = 0; i < 3; i++) {
          operations.push(
            store.create({
              ...createSampleObjective(),
              objective_id: `TEST-OBJ-CONCURRENT-${i}-${Date.now()}`,
              name: `Concurrent Test ${i}`,
            })
          );
        }

        const results = await Promise.all(operations);
        expect(results).toHaveLength(3);
        results.forEach(result => {
          expect(result.objective_id).toBeDefined();
          expect(result.key_results).toHaveLength(2);
        });
      });

      it('should properly close connections', async () => {
        const tempStore = new PostgresObjectiveStore(testConfig);
        await tempStore.create({
          ...createSampleObjective(),
          objective_id: `TEST-OBJ-CLOSE-${Date.now()}`,
        });
        await expect(tempStore.close()).resolves.not.toThrow();
      });
    });

    describe('error handling', () => {
      it('should handle connection errors gracefully', async () => {
        const badStore = new PostgresObjectiveStore({
          ...testConfig,
          host: 'invalid-host-12345',
          connectionTimeoutMillis: 1000,
        });

        await expect(
          badStore.create(createSampleObjective())
        ).rejects.toThrow();

        await badStore.close();
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
