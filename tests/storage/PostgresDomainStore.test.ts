import { PostgresDomainStore } from '../../src/storage/PostgresDomainStore';

/**
 * PostgresDomainStore Tests
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
 * 3. Run tests: npm test -- PostgresDomainStore
 */

describe('PostgresDomainStore', () => {
  let store: PostgresDomainStore;
  const testConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mdl_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  // Skip tests if database password not set (even if empty)
  const skipIfNoDb = ('DB_PASSWORD' in process.env) ? describe : describe.skip;

  skipIfNoDb('PostgreSQL Integration Tests', () => {
    beforeAll(async () => {
      store = new PostgresDomainStore(testConfig);
    });

    afterAll(async () => {
      await store.close();
    });

    beforeEach(async () => {
      // Clean test data before each test
      const { Client } = require('pg');
      const client = new Client(testConfig);
      await client.connect();
      await client.query('DELETE FROM business_domains WHERE domain_id LIKE $1', ['test-%']);
      await client.end();
    });

    const createSampleDomain = () => ({
      domain_id: `test-${Date.now()}`,
      name: 'Test Domain',
      description: 'A test domain for validation',
      owner_team: 'Test Team',
      contact_email: 'test@example.com',
      tier_focus: { 'Tier-1': true },
      key_areas: ['area1', 'area2'],
      color: '#FF0000',
    });

    describe('create', () => {
      it('should create a new domain in PostgreSQL', async () => {
        const input = createSampleDomain();
        const domain = await store.create(input);

        expect(domain.domain_id).toBe(input.domain_id);
        expect(domain.name).toBe(input.name);
        expect(domain.description).toBe(input.description);
        expect(domain.owner_team).toBe(input.owner_team);
        expect(domain.contact_email).toBe(input.contact_email);
      });

      it('should handle domains with all optional fields', async () => {
        const input = {
          domain_id: `test-full-${Date.now()}`,
          name: 'Full Test Domain',
          description: 'Complete domain with all fields',
          owner_team: 'Platform Team',
          contact_email: 'platform@example.com',
          tier_focus: { 'Tier-1': true, 'Tier-2': true },
          key_areas: ['Authentication', 'Authorization', 'Session Management'],
          color: '#3498db',
        };

        const domain = await store.create(input);
        expect(domain.tier_focus).toEqual({ 'Tier-1': true, 'Tier-2': true });
        expect(domain.key_areas).toHaveLength(3);
        expect(domain.color).toBe('#3498db');
      });

      it('should create domain with valid id', async () => {
        const input = createSampleDomain();
        const domain = await store.create(input);

        expect(domain.domain_id).toBe(input.domain_id);
        expect(domain.name).toBe(input.name);
      });

      it('should throw error for duplicate domain_id', async () => {
        const input = createSampleDomain();
        await store.create(input);

        await expect(store.create(input)).rejects.toThrow();
      });
    });

    describe('findById', () => {
      it('should find a domain by ID', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        const found = await store.findById(created.domain_id);

        expect(found).toBeDefined();
        expect(found?.domain_id).toBe(created.domain_id);
        expect(found?.name).toBe(created.name);
      });

      it('should return null for non-existent ID', async () => {
        const found = await store.findById('nonexistent-domain-123');
        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      it('should return all domains', async () => {
        const domain1 = await store.create({
          ...createSampleDomain(),
          domain_id: `test-all-1-${Date.now()}`,
          name: 'Test Domain 1',
        });
        const domain2 = await store.create({
          ...createSampleDomain(),
          domain_id: `test-all-2-${Date.now()}`,
          name: 'Test Domain 2',
        });

        const domains = await store.findAll();
        expect(domains.length).toBeGreaterThanOrEqual(2);
        
        const domainIds = domains.map(d => d.domain_id);
        expect(domainIds).toContain(domain1.domain_id);
        expect(domainIds).toContain(domain2.domain_id);
      });

      it('should return domains with all fields populated', async () => {
        await store.create(createSampleDomain());
        const domains = await store.findAll();

        const testDomain = domains.find(d => d.domain_id.startsWith('test-'));
        expect(testDomain).toBeDefined();
        expect(testDomain?.key_areas).toBeDefined();
        expect(Array.isArray(testDomain?.key_areas)).toBe(true);
      });
    });

    describe('findByName', () => {
      it('should find a domain by name', async () => {
        const uniqueName = `Test Domain ${Date.now()}`;
        const input = {
          ...createSampleDomain(),
          name: uniqueName,
        };
        await store.create(input);

        const found = await store.findByName(uniqueName);
        expect(found).not.toBeNull();
        expect(found?.name).toBe(uniqueName);
        expect(found?.domain_id).toBe(input.domain_id);
      });

      it('should return null for non-existent name', async () => {
        const found = await store.findByName('Nonexistent Domain Name 12345');
        expect(found).toBeNull();
      });

      it('should handle exact name matching', async () => {
        const name1 = `Exact Name ${Date.now()}`;
        const name2 = `${name1} Suffix`;
        
        await store.create({
          ...createSampleDomain(),
          domain_id: `test-name-1-${Date.now()}`,
          name: name1,
        });
        await store.create({
          ...createSampleDomain(),
          domain_id: `test-name-2-${Date.now()}`,
          name: name2,
        });

        const found = await store.findByName(name1);
        expect(found).not.toBeNull();
        expect(found?.name).toBe(name1);
        expect(found?.name).not.toBe(name2);
      });
    });

    describe('update', () => {
      it('should update an existing domain', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const updated = await store.update({
          ...created,
          name: 'Updated Domain Name',
          description: 'Updated description',
        });

        expect(updated.name).toBe('Updated Domain Name');
        expect(updated.description).toBe('Updated description');
        expect(updated.domain_id).toBe(created.domain_id);
      });

      it('should update key_areas array', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const updated = await store.update({
          ...created,
          key_areas: ['new-area-1', 'new-area-2', 'new-area-3'],
        });

        expect(updated.key_areas).toHaveLength(3);
        expect(updated.key_areas).toContain('new-area-1');
      });

      it('should update tier_focus', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const updated = await store.update({
          ...created,
          tier_focus: { 'Tier-2': true },
        });

        expect(updated.tier_focus).toEqual({ 'Tier-2': true });
      });

      it('should update color', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const updated = await store.update({
          ...created,
          color: '#00FF00',
        });

        expect(updated.color).toBe('#00FF00');
      });

      it('should successfully update domain', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const updated = await store.update({
          ...created,
          description: 'New description',
        });

        expect(updated.description).toBe('New description');
        expect(updated.domain_id).toBe(created.domain_id);
      });

      it('should throw error for non-existent domain', async () => {
        await expect(
          store.update({
            domain_id: 'nonexistent-domain',
            name: 'test',
            tier_focus: {},
          })
        ).rejects.toThrow();
      });

      it('should preserve fields not being updated', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        const originalName = created.name;
        
        const updated = await store.update({
          ...created,
          description: 'New description only',
        });

        expect(updated.name).toBe(originalName);
        expect(updated.description).toBe('New description only');
      });
    });

    describe('delete', () => {
      it('should delete an existing domain', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const deleted = await store.delete(created.domain_id);
        expect(deleted).toBe(true);

        const found = await store.findById(created.domain_id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent domain', async () => {
        const deleted = await store.delete('nonexistent-domain');
        expect(deleted).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true for existing domain', async () => {
        const input = createSampleDomain();
        const created = await store.create(input);
        
        const exists = await store.exists(created.domain_id);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent domain', async () => {
        const exists = await store.exists('nonexistent-domain');
        expect(exists).toBe(false);
      });
    });

    describe('connection management', () => {
      it('should handle multiple operations without connection issues', async () => {
        const operations = [];
        for (let i = 0; i < 5; i++) {
          operations.push(
            store.create({
              ...createSampleDomain(),
              domain_id: `test-concurrent-${i}-${Date.now()}`,
              name: `Concurrent Test ${i}`,
            })
          );
        }

        const results = await Promise.all(operations);
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.domain_id).toBeDefined();
        });
      });

      it('should properly close connections', async () => {
        const tempStore = new PostgresDomainStore(testConfig);
        await tempStore.create({
          ...createSampleDomain(),
          domain_id: `test-close-${Date.now()}`,
        });
        await expect(tempStore.close()).resolves.not.toThrow();
      });
    });

    describe('error handling', () => {
      it('should handle connection errors gracefully', async () => {
        const badStore = new PostgresDomainStore({
          ...testConfig,
          host: 'invalid-host-12345',

        });

        await expect(
          badStore.create(createSampleDomain())
        ).rejects.toThrow();

        await badStore.close();
      });

      it('should handle invalid email format', async () => {
        const input = {
          ...createSampleDomain(),
          contact_email: 'not-an-email',
        };

        // PostgreSQL should still accept this (no email validation at DB level)
        const domain = await store.create(input);
        expect(domain.contact_email).toBe('not-an-email');
      });
    });
  });

  skipIfNoDb('Legacy Mode Tests', () => {
    it('should initialize in legacy mode when no dbPool provided', async () => {
      const legacyStore = new PostgresDomainStore(testConfig);
      
      // Test that the store works in legacy mode
      const input = {
        domain_id: `test-legacy-${Date.now()}`,
        name: 'Legacy Mode Test',
        description: 'Testing legacy mode initialization',
        owner_team: 'Test Team',
        contact_email: 'legacy@example.com',
      };

      const created = await legacyStore.create(input);
      expect(created.domain_id).toBe(input.domain_id);
      expect(created.name).toBe(input.name);

      // Verify it works with findByName in legacy mode
      const found = await legacyStore.findByName(input.name);
      expect(found).not.toBeNull();
      expect(found?.domain_id).toBe(input.domain_id);

      await legacyStore.close();
    });

    it('should handle all CRUD operations in legacy mode', async () => {
      const legacyStore = new PostgresDomainStore(testConfig);
      const domainId = `test-legacy-crud-${Date.now()}`;

      // Create
      const created = await legacyStore.create({
        domain_id: domainId,
        name: 'Legacy CRUD Test',
        description: 'Testing CRUD in legacy mode',
        owner_team: 'Test Team',
      });
      expect(created.domain_id).toBe(domainId);

      // Read by ID
      const foundById = await legacyStore.findById(domainId);
      expect(foundById).not.toBeNull();
      expect(foundById?.name).toBe('Legacy CRUD Test');

      // Read by Name
      const foundByName = await legacyStore.findByName('Legacy CRUD Test');
      expect(foundByName).not.toBeNull();
      expect(foundByName?.domain_id).toBe(domainId);

      // Update
      const updated = await legacyStore.update({
        ...created,
        description: 'Updated in legacy mode',
      });
      expect(updated.description).toBe('Updated in legacy mode');

      // Delete
      const deleted = await legacyStore.delete(domainId);
      expect(deleted).toBe(true);

      // Verify deletion
      const notFound = await legacyStore.findById(domainId);
      expect(notFound).toBeNull();

      await legacyStore.close();
    });
  });

  describe('PostgreSQL not configured', () => {
    it('should skip tests when database is not available', () => {
      if (!('DB_PASSWORD' in process.env)) {
        console.log('Skipping PostgreSQL tests - no DB_PASSWORD provided');
        expect(true).toBe(true);
      }
    });
  });
});
