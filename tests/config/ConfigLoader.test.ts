import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigLoader } from '../../src/config/ConfigLoader';
import { DataType, MetricsCatalog } from '../../src/models';

describe('ConfigLoader', () => {
  const testDir = '/tmp/mdl-test';
  const jsonFile = path.join(testDir, 'test.json');
  const yamlFile = path.join(testDir, 'test.yaml');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
    if (fs.existsSync(yamlFile)) fs.unlinkSync(yamlFile);
  });

  const sampleLegacyMetrics = [
    {
      name: 'Test Metric',
      description: 'A test metric',
      category: 'test',
      dataType: DataType.NUMBER,
    },
  ];

  const sampleCatalog: MetricsCatalog = {
    catalog_version: '1.0.0',
    catalog_name: 'Test Catalog',
    last_updated: '2025-01-01T00:00:00Z',
    owner_team: 'Test Team',
    contacts: [{ name: 'Test Owner', email: 'test@example.com' }],
    objectives: [
      {
        objective_id: 'OBJ-001',
        name: 'Test Objective',
        description: 'A test objective',
        timeframe: { start: '2025-01-01', end: '2025-12-31' },
        owner_team: 'Test Team',
        status: 'active',
        key_results: [
          {
            kr_id: 'KR-001',
            name: 'Test KR',
            description: 'A test key result',
            target_value: 100,
            baseline_value: 50,
            unit: 'count',
            direction: 'increase',
            current_value: null,
            metric_ids: ['METRIC-001'],
          },
        ],
      },
    ],
    metrics: [
      {
        metric_id: 'METRIC-001',
        name: 'Test Login Rate',
        short_name: 'test_login_rate',
        description: 'Test metric for login success',
        category: 'KPI',
        tier: 'Tier-1',
        business_domain: 'Digital',
        metric_type: 'leading',
        tags: ['test', 'auth'],
        alignment: {
          strategic_pillar: 'Customer Experience',
          primary_objective_ids: ['OBJ-001'],
          related_okr_ids: ['OBJ-001:KR-001'],
          why_it_matters: 'Test alignment',
        },
        definition: {
          formula: 'success / total',
          formula_detail: 'Count of success divided by total',
          numerator: { event_name: 'success', filters: [] },
          denominator: { event_name: 'attempt', filters: [] },
          unit: 'ratio',
          expected_direction: 'increase',
          example_calculation: { success: 95, total: 100, result: 0.95 },
        },
        data: {
          primary_sources: [{ system: 'analytics', table_or_stream: 'events', connection_id: 'warehouse' }],
          secondary_sources: [],
          data_freshness: 'real_time',
          update_frequency: '5_minutes',
          time_grain: ['hour', 'day'],
          data_retention: '365_days',
        },
        governance: {
          data_classification: 'Non-PII',
          pii_involved: false,
          regulatory_constraints: [],
          owner_team: 'Analytics',
          technical_owner: 'eng',
          business_owner: 'product',
          version: '1.0.0',
          status: 'active',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        dimensions: [],
        targets_and_alerts: {
          target_value: 0.98,
          warning_threshold: 0.95,
          critical_threshold: 0.90,
          comparison_baseline: 'previous_7_days',
          alert_rules: [],
        },
        visualization: {
          default_chart_type: 'line',
          default_time_range: 'last_30_days',
          dashboard_locations: [],
          drilldowns: [],
        },
        relationships: {
          upstream_metric_ids: [],
          downstream_metric_ids: [],
          tradeoffs: [],
        },
        operational_usage: {
          decision_use_cases: [],
          review_cadence: 'daily',
          linked_playbooks: [],
        },
        metadata: {
          notes: '',
          example_queries: [],
          version: '1.0.0',
          created_at: new Date().toISOString(),
          created_by: 'test-user',
          last_updated: new Date().toISOString(),
          last_updated_by: 'test-user',
          change_history: [],
        },
      },
    ],
  };

  describe('loadCatalogFromFile', () => {
    it('should load new catalog format from JSON file', () => {
      fs.writeFileSync(jsonFile, JSON.stringify(sampleCatalog));
      
      const catalog = ConfigLoader.loadCatalogFromFile(jsonFile);
      expect(catalog.catalog_name).toBe('Test Catalog');
      expect(catalog.metrics).toHaveLength(1);
      expect(catalog.objectives).toHaveLength(1);
      expect(catalog.metrics[0].name).toBe('Test Login Rate');
    });

    it('should load new catalog format from YAML file', () => {
      const yamlContent = `catalog_version: "1.0.0"
catalog_name: "Test Catalog"
last_updated: "2025-01-01T00:00:00Z"
owner_team: "Test Team"
contacts: []
objectives: []
metrics:
  - metric_id: "METRIC-001"
    name: "Test Metric"
    short_name: "test_metric"
    description: "A test metric"
    category: "KPI"
    tier: "Tier-1"
    business_domain: "Digital"
    metric_type: "leading"
    tags: []
    alignment:
      strategic_pillar: "Test"
      primary_objective_ids: []
      related_okr_ids: []
      why_it_matters: "Test"
    definition:
      formula: "test"
      formula_detail: "test"
      numerator:
        event_name: "test"
        filters: []
      denominator:
        event_name: "test"
        filters: []
      unit: "ratio"
      expected_direction: "increase"
      example_calculation: {}
    data:
      primary_sources: []
      secondary_sources: []
      data_freshness: "daily"
      update_frequency: "daily"
      time_grain: ["day"]
      data_retention: "90_days"
    governance:
      data_classification: "Non-PII"
      pii_involved: false
      regulatory_constraints: []
      owner_team: "Test"
      technical_owner: "test"
      business_owner: "test"
      version: "1.0.0"
      status: "active"
      created_at: "2025-01-01T00:00:00Z"
      updated_at: "2025-01-01T00:00:00Z"
    dimensions: []
    targets_and_alerts:
      target_value: 0
      warning_threshold: 0
      critical_threshold: 0
      comparison_baseline: "previous"
      alert_rules: []
    visualization:
      default_chart_type: "line"
      default_time_range: "last_30_days"
      dashboard_locations: []
      drilldowns: []
    relationships:
      upstream_metric_ids: []
      downstream_metric_ids: []
      tradeoffs: []
    operational_usage:
      decision_use_cases: []
      review_cadence: "weekly"
      linked_playbooks: []
    metadata:
      notes: ""
      example_queries: []
`;
      fs.writeFileSync(yamlFile, yamlContent);
      
      const catalog = ConfigLoader.loadCatalogFromFile(yamlFile);
      expect(catalog.catalog_name).toBe('Test Catalog');
      expect(catalog.metrics).toHaveLength(1);
    });

    it('should convert legacy format to catalog', () => {
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: sampleLegacyMetrics }));
      
      const catalog = ConfigLoader.loadCatalogFromFile(jsonFile);
      expect(catalog.catalog_version).toBe('1.0.0');
      expect(catalog.catalog_name).toBe('Legacy Metrics Catalog');
      expect(catalog.metrics).toHaveLength(1);
      expect(catalog.metrics[0].metric_id).toContain('METRIC-TEST-METRIC');
    });
  });

  describe('loadFromFile (legacy)', () => {
    it('should load metrics from JSON file', () => {
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: sampleLegacyMetrics }));
      
      const metrics = ConfigLoader.loadFromFile(jsonFile);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('Test Metric');
    });

    it('should load metrics from YAML file', () => {
      const yamlContent = `metrics:
  - name: Test Metric
    description: A test metric
    category: test
    dataType: number
`;
      fs.writeFileSync(yamlFile, yamlContent);
      
      const metrics = ConfigLoader.loadFromFile(yamlFile);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('Test Metric');
    });

    it('should load metrics from array format', () => {
      fs.writeFileSync(jsonFile, JSON.stringify(sampleLegacyMetrics));
      
      const metrics = ConfigLoader.loadFromFile(jsonFile);
      expect(metrics).toHaveLength(1);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        ConfigLoader.loadFromFile('/non/existent/file.json');
      }).toThrow('Config file not found');
    });

    it('should throw error for unsupported file format', () => {
      const txtFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(txtFile, 'test');
      
      expect(() => {
        ConfigLoader.loadFromFile(txtFile);
      }).toThrow('Unsupported file format');
      
      fs.unlinkSync(txtFile);
    });

    it('should validate required fields', () => {
      const invalidMetrics = [
        {
          name: 'Invalid Metric',
          // missing required fields
        },
      ];
      
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: invalidMetrics }));
      
      expect(() => {
        ConfigLoader.loadFromFile(jsonFile);
      }).toThrow('missing required fields');
    });
  });

  describe('saveCatalogToFile', () => {
    it('should save catalog to JSON file', () => {
      ConfigLoader.saveCatalogToFile(jsonFile, sampleCatalog);
      
      expect(fs.existsSync(jsonFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      expect(content.catalog_name).toBe('Test Catalog');
      expect(content.metrics).toHaveLength(1);
    });

    it('should save catalog to YAML file', () => {
      ConfigLoader.saveCatalogToFile(yamlFile, sampleCatalog);
      
      expect(fs.existsSync(yamlFile)).toBe(true);
      const content = fs.readFileSync(yamlFile, 'utf8');
      expect(content).toContain('Test Catalog');
    });
  });

  describe('saveToFile (legacy)', () => {
    it('should save metrics to JSON file', () => {
      ConfigLoader.saveToFile(jsonFile, sampleLegacyMetrics);
      
      expect(fs.existsSync(jsonFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      expect(content.metrics).toHaveLength(1);
    });

    it('should save metrics to YAML file', () => {
      ConfigLoader.saveToFile(yamlFile, sampleLegacyMetrics);
      
      expect(fs.existsSync(yamlFile)).toBe(true);
      const content = fs.readFileSync(yamlFile, 'utf8');
      expect(content).toContain('Test Metric');
    });

    it('should create directory if it does not exist', () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'test.json');
      ConfigLoader.saveToFile(nestedFile, sampleLegacyMetrics);
      
      expect(fs.existsSync(nestedFile)).toBe(true);
      
      // Clean up
      fs.unlinkSync(nestedFile);
      fs.rmdirSync(path.join(testDir, 'nested', 'dir'));
      fs.rmdirSync(path.join(testDir, 'nested'));
    });

    it('should throw error for unsupported file format in saveToFile', () => {
      const txtFile = path.join(testDir, 'test.txt');
      expect(() => {
        ConfigLoader.saveToFile(txtFile, sampleLegacyMetrics);
      }).toThrow('Unsupported file format');
    });
  });

  describe('saveCatalogToFile error handling', () => {
    it('should throw error for unsupported file format in saveCatalogToFile', () => {
      const txtFile = path.join(testDir, 'test.txt');
      expect(() => {
        ConfigLoader.saveCatalogToFile(txtFile, sampleCatalog);
      }).toThrow('Unsupported file format');
    });

    it('should create directory if it does not exist for catalog', () => {
      const nestedFile = path.join(testDir, 'nested2', 'dir2', 'catalog.json');
      ConfigLoader.saveCatalogToFile(nestedFile, sampleCatalog);
      
      expect(fs.existsSync(nestedFile)).toBe(true);
      
      // Clean up
      fs.unlinkSync(nestedFile);
      fs.rmdirSync(path.join(testDir, 'nested2', 'dir2'));
      fs.rmdirSync(path.join(testDir, 'nested2'));
    });
  });

  describe('catalog validation', () => {
    it('should throw error when catalog is missing required fields', () => {
      const invalidCatalog = {
        catalog_version: '1.0.0',
        // missing catalog_name and metrics
      };
      fs.writeFileSync(jsonFile, JSON.stringify(invalidCatalog));
      
      expect(() => {
        ConfigLoader.loadCatalogFromFile(jsonFile);
      }).toThrow('missing required fields');
    });

    it('should throw error when catalog metrics is not an array', () => {
      const invalidCatalog = {
        catalog_version: '1.0.0',
        catalog_name: 'Test',
        metrics: 'not-an-array'
      };
      fs.writeFileSync(jsonFile, JSON.stringify(invalidCatalog));
      
      expect(() => {
        ConfigLoader.loadCatalogFromFile(jsonFile);
      }).toThrow('Catalog metrics must be an array');
    });

    it('should throw error when metric in catalog is missing required fields', () => {
      const invalidCatalog = {
        catalog_version: '1.0.0',
        catalog_name: 'Test',
        metrics: [
          {
            metric_id: 'M1',
            // missing name, description, category
          }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(invalidCatalog));
      
      expect(() => {
        ConfigLoader.loadCatalogFromFile(jsonFile);
      }).toThrow('missing required fields');
    });
  });

  describe('parseMetricDefinitions error handling', () => {
    it('should throw error for invalid config format', () => {
      const invalidData = { invalid: 'format' };
      fs.writeFileSync(jsonFile, JSON.stringify(invalidData));
      
      expect(() => {
        ConfigLoader.loadFromFile(jsonFile);
      }).toThrow('Invalid config format');
    });
  });
});
