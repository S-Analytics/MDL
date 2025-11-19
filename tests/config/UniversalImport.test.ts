/**
 * Universal Import System Tests
 * 
 * Tests for the universal import functionality that auto-detects
 * and imports metrics, domains, and objectives from any template format.
 */

import { ConfigLoader } from '../../src/config/ConfigLoader';

describe('Universal Import System', () => {
  describe('importFromFile', () => {
    test.todo('should import single metric from JSON template');
    test.todo('should import single metric from YAML template');
    test.todo('should import single domain from JSON template');
    test.todo('should import single objective from JSON template');
    
    test.todo('should import batch metrics from sample file (sample has invalid objectives)');
  });

  describe('parseImportData', () => {
    test('should detect single metric object', () => {
      const data = {
        metric_id: 'TEST-001',
        name: 'Test Metric',
        category: 'Testing',
        tier: 'Tier-3',
        business_domain: 'QA',
        metric_type: 'operational'
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('metrics');
      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].metric_id).toMatch(/METRIC-/);
      expect(result.metrics[0].name).toBe('Test Metric');
    });

    test('should detect array of metrics', () => {
      const data = [
        {
          metric_id: 'TEST-001',
          name: 'Test Metric 1',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'QA',
          metric_type: 'operational'
        },
        {
          metric_id: 'TEST-002',
          name: 'Test Metric 2',
          category: 'Testing',
          tier: 'Tier-3',
          business_domain: 'QA',
          metric_type: 'operational'
        }
      ];

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('metrics');
      expect(result.metrics).toHaveLength(2);
    });

    test('should detect wrapped metrics format', () => {
      const data = {
        metrics: [
          {
            metric_id: 'TEST-001',
            name: 'Test Metric',
            category: 'Testing',
            tier: 'Tier-3',
            business_domain: 'QA',
            metric_type: 'operational'
          }
        ]
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('metrics');
      expect(result.metrics).toHaveLength(1);
    });

    test('should detect single domain object', () => {
      const data = {
        id: 'test-domain',
        name: 'Test Domain',
        description: 'Testing domain import',
        owner: 'test@example.com',
        stakeholders: [],
        objectives: [],
        key_metrics: []
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('domains');
      expect(result.domains).toHaveLength(1);
      expect(result.domains[0].domain_id).toBe('test-domain');
    });

    test('should detect single objective object', () => {
      const data = {
        objective_id: 'OBJ-TEST-001',
        name: 'Test Objective',
        description: 'Testing objective import',
        timeframe: { start: '2025-10-01', end: '2025-12-31' },
        owner_team: 'test@example.com',
        status: 'active',
        key_results: []
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('objectives');
      expect(result.objectives).toHaveLength(1);
      expect(result.objectives[0].objective_id).toBe('OBJ-TEST-001');
    });

    test('should detect mixed data types', () => {
      const data = {
        metrics: [
          {
            metric_id: 'TEST-001',
            name: 'Test Metric',
            category: 'Testing',
            tier: 'Tier-3',
            business_domain: 'QA',
            metric_type: 'operational'
          }
        ],
        domains: [
          {
            id: 'test-domain',
            name: 'Test Domain',
            description: 'Testing',
            owner: 'test@example.com',
            stakeholders: [],
            objectives: [],
            key_metrics: []
          }
        ]
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.type).toBe('mixed');
      expect(result.metrics).toHaveLength(1);
      expect(result.domains).toHaveLength(1);
      expect(result.objectives).toHaveLength(0);
    });
  });

  describe('Field Mapping', () => {
    test('should map domain template fields to storage format', () => {
      const data = {
        id: 'domain-001',  // Should map to domain_id
        name: 'Test Domain',
        description: 'Testing',
        owner: 'test@example.com',
        stakeholders: ['user1@example.com'],
        objectives: ['Improve quality'],
        key_metrics: ['METRIC-001'],
        metadata: { priority: 'high' }
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.domains[0].domain_id).toBe('domain-001');
      expect(result.domains[0].name).toBe('Test Domain');
      expect(result.domains[0].owner_team).toBe('test@example.com');
    });

    test('should map objective template fields to model format', () => {
      const data = {
        objective_id: 'OBJ-001',
        name: 'Test Objective',
        description: 'Testing',
        timeframe: { start: '2025-10-01', end: '2025-12-31' },
        owner_team: 'test@example.com',
        status: 'active',
        key_results: [
          {
            kr_id: 'KR-001',
            name: 'KR1',
            description: 'Test KR',
            target_value: 100,
            baseline_value: 0,
            current_value: 50,
            unit: 'count',
            direction: 'increase',
            metric_id: 'METRIC-TEST-001'
          }
        ]
      };

      const result = ConfigLoader.parseImportData(data);

      expect(result.objectives[0].objective_id).toBe('OBJ-001');
      expect(result.objectives[0].name).toBe('Test Objective');
      expect(result.objectives[0].timeframe).toBeDefined();
      expect(result.objectives[0].key_results).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid metric data gracefully', () => {
      const data = {
        // Completely invalid data
        invalid: 'data',
        notAMetric: true
      };

      expect(() => {
        ConfigLoader.parseImportData(data);
      }).toThrow('No valid metrics');
    });

    test('should handle empty data', () => {
      expect(() => {
        ConfigLoader.parseImportData({});
      }).toThrow('No valid metrics');
    });

    test('should handle null data', () => {
      expect(() => {
        ConfigLoader.parseImportData(null);
      }).toThrow();
    });
  });
});

/**
 * Integration Tests
 * 
 * Note: These tests require database connection and are skipped by default.
 * Run with: npm test -- --testPathPattern=UniversalImport --runInBand
 * Set environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */
describe('Universal Import Integration', () => {
  const hasDbConfig = process.env.DB_HOST && process.env.DB_NAME;

  if (!hasDbConfig) {
    test.skip('Database tests skipped (no DB config)', () => {});
    return;
  }

  // Add integration tests here when database is available
  test.todo('should import domain to PostgreSQL');
  test.todo('should import objective to PostgreSQL');
  test.todo('should handle duplicate domain IDs');
  test.todo('should update existing objectives');
});
