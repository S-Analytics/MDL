/**
 * Universal Import System Tests
 * 
 * Tests for the universal import functionality that auto-detects
 * and imports metrics, domains, and objectives from any template format.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigLoader } from '../../src/config/ConfigLoader';

describe('Universal Import System', () => {
  describe('importFromFile', () => {
    test('should import single metric from JSON template', () => {
      // Create temp test file
      const testFilePath = path.join(__dirname, 'temp-metric.json');
      const metricData = {
        metric_id: 'test_metric_001',
        name: 'Test Metric',
        description: 'A test metric for import',
        category: 'performance',
        unit_of_measurement: 'count',
        calculation_method: 'SUM',
        data_sources: ['test-source'],
        owner_team: 'test-team',
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          created_by: 'test-user',
          last_updated: new Date().toISOString(),
          last_updated_by: 'test-user',
          change_history: []
        }
      };
      
      fs.writeFileSync(testFilePath, JSON.stringify(metricData, null, 2));
      
      try {
        const result = ConfigLoader.importFromFile(testFilePath);
        
        expect(result.type).toBe('metrics');
        expect(result.metrics).toHaveLength(1);
        // ConfigLoader generates ID from name if not in new format
        expect(result.metrics[0].metric_id).toBe('METRIC-TEST-METRIC');
        expect(result.metrics[0].name).toBe('Test Metric');
        expect(result.metrics[0].category).toBe('performance');
        expect(result.domains).toHaveLength(0);
        expect(result.objectives).toHaveLength(0);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should import single metric from YAML template', () => {
      const testFilePath = path.join(__dirname, 'temp-metric.yaml');
      const yamlContent = `
metric_id: test_metric_002
name: YAML Test Metric
description: A test metric from YAML
category: quality
unit_of_measurement: percentage
calculation_method: AVG
data_sources:
  - yaml-source
owner_team: yaml-team
metadata:
  version: 1.0.0
  created_at: ${new Date().toISOString()}
  created_by: test-user
  last_updated: ${new Date().toISOString()}
  last_updated_by: test-user
  change_history: []
`;
      
      fs.writeFileSync(testFilePath, yamlContent);
      
      try {
        const result = ConfigLoader.importFromFile(testFilePath);
        
        expect(result.type).toBe('metrics');
        expect(result.metrics).toHaveLength(1);
        // ConfigLoader generates ID from name if not in new format
        expect(result.metrics[0].metric_id).toBe('METRIC-YAML-TEST-METRIC');
        expect(result.metrics[0].name).toBe('YAML Test Metric');
        expect(result.metrics[0].category).toBe('quality');
        expect(result.domains).toHaveLength(0);
        expect(result.objectives).toHaveLength(0);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should import single domain from JSON template', () => {
      const testFilePath = path.join(__dirname, 'temp-domain.json');
      const domainData = {
        id: 'test-domain-001',
        name: 'Test Domain',
        description: 'A test business domain',
        owner: 'test-owner',
        stakeholders: ['stakeholder1', 'stakeholder2'],
        objectives: [],
        key_metrics: []
      };
      
      fs.writeFileSync(testFilePath, JSON.stringify(domainData, null, 2));
      
      try {
        const result = ConfigLoader.importFromFile(testFilePath);
        
        expect(result.type).toBe('domains');
        expect(result.domains).toHaveLength(1);
        expect(result.domains[0].domain_id).toBe('test-domain-001');
        expect(result.domains[0].name).toBe('Test Domain');
        expect(result.domains[0].description).toBe('A test business domain');
        expect(result.metrics).toHaveLength(0);
        expect(result.objectives).toHaveLength(0);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should import single objective from JSON template', () => {
      const testFilePath = path.join(__dirname, 'temp-objective.json');
      const objectiveData = {
        objective_id: 'test-obj-001',
        title: 'Test Objective',
        description: 'A test objective',
        owner: 'test-owner',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        key_results: [
          {
            kr_id: 'kr-001',
            description: 'Test KR',
            target_value: 100,
            baseline_value: 0,
            current_value: 50,
            unit: 'count',
            direction: 'increase',
            metric_id: 'test-metric-001'
          }
        ]
      };
      
      fs.writeFileSync(testFilePath, JSON.stringify(objectiveData, null, 2));
      
      try {
        const result = ConfigLoader.importFromFile(testFilePath);
        
        expect(result.type).toBe('objectives');
        expect(result.objectives).toHaveLength(1);
        expect(result.objectives[0].objective_id).toBe('test-obj-001');
        expect(result.objectives[0].name).toBe('Test Objective');
        expect(result.objectives[0].key_results).toHaveLength(1);
        expect(result.objectives[0].key_results[0].kr_id).toBe('kr-001');
        expect(result.metrics).toHaveLength(0);
        expect(result.domains).toHaveLength(0);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should import batch metrics from sample file', () => {
      const sampleFilePath = path.join(__dirname, '../../examples/sample-metrics.json');
      
      // Skip if sample file doesn't exist
      if (!fs.existsSync(sampleFilePath)) {
        console.warn('Sample metrics file not found, skipping test');
        return;
      }
      
      // The sample file contains a mix of objectives and metrics
      // Import should succeed and parse the metrics correctly
      const result = ConfigLoader.importFromFile(sampleFilePath);
      
      expect(result).toBeDefined();
      expect(result.type).toBe('metrics');
      expect(result.metrics.length).toBeGreaterThan(0);
      
      // Alternative: Test with a metrics-only array file
      const testFilePath = path.join(__dirname, 'temp-batch-metrics.json');
      const batchData = [
        {
          name: 'Batch Metric 1',
          description: 'First batch metric',
          category: 'performance',
          dataType: 'number'
        },
        {
          name: 'Batch Metric 2',
          description: 'Second batch metric',
          category: 'quality',
          dataType: 'number'
        },
        {
          name: 'Batch Metric 3',
          description: 'Third batch metric',
          category: 'reliability',
          dataType: 'number'
        }
      ];
      
      fs.writeFileSync(testFilePath, JSON.stringify(batchData, null, 2));
      
      try {
        const result = ConfigLoader.importFromFile(testFilePath);
        
        expect(result.metrics).toHaveLength(3);
        expect(result.type).toBe('metrics');
        expect(result.metrics[0].name).toBe('Batch Metric 1');
        expect(result.metrics[1].name).toBe('Batch Metric 2');
        expect(result.metrics[2].name).toBe('Batch Metric 3');
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
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
  const hasDbConfig = process.env.DB_HOST && process.env.DB_NAME && ('DB_PASSWORD' in process.env);

  if (!hasDbConfig) {
    test.skip('Database tests skipped (no DB config)', () => {});
    return;
  }

  // Database stores for integration tests
  let domainStore: any;
  let objectiveStore: any;
  let pool: any;

  beforeAll(async () => {
    const { Pool } = await import('pg');
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };
    pool = new Pool(config);
    
    // Import store classes
    const { PostgresDomainStore } = await import('../../src/storage/PostgresDomainStore');
    const { PostgresObjectiveStore } = await import('../../src/storage/PostgresObjectiveStore');
    
    domainStore = new PostgresDomainStore(config);
    objectiveStore = new PostgresObjectiveStore(config);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  test('should import domain to PostgreSQL', async () => {
    const testFilePath = path.join(__dirname, 'temp-integration-domain.json');
    const domainData = {
      id: 'integration-test-domain-001',
      name: 'Integration Test Domain',
      description: 'A domain for integration testing',
      owner: 'test-team',
      stakeholders: ['stakeholder1'],
      objectives: [],
      key_metrics: []
    };
    
    fs.writeFileSync(testFilePath, JSON.stringify(domainData, null, 2));
    
    try {
      const result = ConfigLoader.importFromFile(testFilePath);
      
      expect(result.domains).toHaveLength(1);
      const domain = result.domains[0];
      
      // Store in database
      await domainStore.create(domain);
      
      // Verify it was stored
      const retrieved = await domainStore.findById('integration-test-domain-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Integration Test Domain');
      
      // Cleanup
      await domainStore.delete('integration-test-domain-001');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should import objective to PostgreSQL', async () => {
    const testFilePath = path.join(__dirname, 'temp-integration-objective.json');
    const objectiveData = {
      objective_id: 'integration-test-obj-001',
      title: 'Integration Test Objective',
      description: 'An objective for integration testing',
      owner: 'test-team',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      key_results: [
        {
          kr_id: 'int-kr-001',
          description: 'Integration KR',
          target_value: 100,
          baseline_value: 0,
          current_value: 0,
          unit: 'count',
          direction: 'increase',
          metric_id: 'test-metric'
        }
      ]
    };
    
    fs.writeFileSync(testFilePath, JSON.stringify(objectiveData, null, 2));
    
    try {
      const result = ConfigLoader.importFromFile(testFilePath);
      
      expect(result.objectives).toHaveLength(1);
      const objective = result.objectives[0];
      
      // Store in database
      await objectiveStore.create(objective);
      
      // Verify it was stored
      const retrieved = await objectiveStore.findById('integration-test-obj-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Integration Test Objective');
      expect(retrieved?.key_results).toHaveLength(1);
      
      // Cleanup
      await objectiveStore.delete('integration-test-obj-001');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should handle duplicate domain IDs', async () => {
    const testFilePath = path.join(__dirname, 'temp-duplicate-domain.json');
    const domainData = {
      id: 'duplicate-test-domain',
      name: 'Duplicate Test Domain',
      description: 'Testing duplicate handling',
      owner: 'test-team',
      stakeholders: [],
      objectives: [],
      key_metrics: []
    };
    
    fs.writeFileSync(testFilePath, JSON.stringify(domainData, null, 2));
    
    try {
      const result = ConfigLoader.importFromFile(testFilePath);
      const domain = result.domains[0];
      
      // Store first time
      await domainStore.create(domain);
      
      // Try to store again with same ID
      await expect(domainStore.create(domain)).rejects.toThrow();
      
      // Cleanup
      await domainStore.delete('duplicate-test-domain');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('should update existing objectives', async () => {
    const testFilePath = path.join(__dirname, 'temp-update-objective.json');
    const objectiveData = {
      objective_id: 'update-test-obj',
      title: 'Original Title',
      description: 'Original description',
      owner: 'test-team',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      key_results: [
        {
          kr_id: 'update-kr-001',
          description: 'Original KR',
          target_value: 100,
          baseline_value: 0,
          current_value: 0,
          unit: 'count',
          direction: 'increase',
          metric_id: 'test-metric'
        }
      ]
    };
    
    fs.writeFileSync(testFilePath, JSON.stringify(objectiveData, null, 2));
    
    try {
      // Import and store original
      const result1 = ConfigLoader.importFromFile(testFilePath);
      const objective1 = result1.objectives[0];
      await objectiveStore.create(objective1);
      
      // Update the file with new data
      objectiveData.title = 'Updated Title';
      objectiveData.description = 'Updated description';
      fs.writeFileSync(testFilePath, JSON.stringify(objectiveData, null, 2));
      
      // Import updated version
      const result2 = ConfigLoader.importFromFile(testFilePath);
      const objective2 = result2.objectives[0];
      
      // Update in database
      await objectiveStore.update(objective2);
      
      // Verify update
      const retrieved = await objectiveStore.findById('update-test-obj');
      expect(retrieved?.name).toBe('Updated Title');
      expect(retrieved?.description).toBe('Updated description');
      
      // Cleanup
      await objectiveStore.delete('update-test-obj');
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
