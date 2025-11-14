import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { MetricDefinition, MetricDefinitionInput, MetricsCatalog } from '../models';

/**
 * Configuration file loader for YAML and JSON metric definitions
 */
export class ConfigLoader {
  /**
   * Load metrics catalog from a file (JSON or YAML)
   * Supports both new catalog format and legacy metric array format
   */
  static loadCatalogFromFile(filePath: string): MetricsCatalog {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    let data: unknown;
    if (ext === '.json') {
      data = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      data = yaml.load(content);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }

    return this.parseCatalog(data);
  }

  /**
   * Load metric definitions from a file (JSON or YAML)
   * Legacy method for backward compatibility
   */
  static loadFromFile(filePath: string): MetricDefinition[] {
    const catalog = this.loadCatalogFromFile(filePath);
    return catalog.metrics;
  }

  /**
   * Parse catalog data from loaded file
   */
  private static parseCatalog(data: unknown): MetricsCatalog {
    const catalogData = data as Record<string, unknown>;
    
    // Check if it's new catalog format
    if (catalogData.catalog_version || catalogData.catalog_name) {
      this.validateCatalog(catalogData);
      return catalogData as unknown as MetricsCatalog;
    }

    // Legacy format: convert to catalog
    const metrics = this.parseMetricDefinitions(data);
    return {
      catalog_version: '1.0.0',
      catalog_name: 'Legacy Metrics Catalog',
      last_updated: new Date().toISOString(),
      owner_team: 'Unknown',
      contacts: [],
      objectives: [],
      metrics: metrics,
    };
  }

  /**
   * Validate catalog structure
   */
  private static validateCatalog(catalog: Record<string, unknown>): void {
    const required = ['catalog_version', 'catalog_name', 'metrics'];
    const missing = required.filter((field) => !catalog[field]);

    if (missing.length > 0) {
      throw new Error(
        `Catalog is missing required fields: ${missing.join(', ')}`
      );
    }

    if (!Array.isArray(catalog.metrics)) {
      throw new TypeError('Catalog metrics must be an array');
    }

    const metrics = catalog.metrics as unknown[];
    for (let index = 0; index < metrics.length; index++) {
      this.validateNewMetricFormat(metrics[index] as Record<string, unknown>, index);
    }
  }

  /**
   * Validate new metric format
   */
  private static validateNewMetricFormat(metric: Record<string, unknown>, index: number): void {
    const required = ['metric_id', 'name', 'description', 'category'];
    const missing = required.filter((field) => !metric[field]);

    if (missing.length > 0) {
      throw new Error(
        `Metric at index ${index} is missing required fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Parse and validate metric definitions from loaded data (legacy format)
   */
  private static parseMetricDefinitions(data: unknown): MetricDefinition[] {
    const dataObj = data as Record<string, unknown>;
    
    // Support both array format and object with 'metrics' key
    let metricsData: unknown[];
    if (Array.isArray(data)) {
      metricsData = data;
    } else if (dataObj.metrics && Array.isArray(dataObj.metrics)) {
      metricsData = dataObj.metrics;
    } else {
      throw new Error('Invalid config format. Expected array of metrics or object with "metrics" key');
    }

    return metricsData.map((metric, index) => {
      const metricObj = metric as Record<string, unknown>;
      this.validateLegacyMetricInput(metricObj, index);
      // Convert legacy format to new format
      return this.convertLegacyToNewFormat(metricObj);
    });
  }

  /**
   * Validate a single legacy metric input
   */
  private static validateLegacyMetricInput(metric: Record<string, unknown>, index: number): void {
    const required = ['name', 'description', 'category', 'dataType'];
    const missing = required.filter((field) => !metric[field]);

    if (missing.length > 0) {
      throw new Error(
        `Metric at index ${index} is missing required fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Convert legacy metric format to new comprehensive format
   * eslint-disable-next-line @typescript-eslint/no-explicit-any
   */
  private static convertLegacyToNewFormat(legacy: Record<string, any>): MetricDefinition {
    const now = new Date().toISOString();
    const name = legacy.name || '';
    const description = legacy.description || '';
    const category = legacy.category || '';
    const unit = legacy.unit || 'count';
    const tags = Array.isArray(legacy.tags) ? legacy.tags : [];
    const governance = legacy.governance || {};
    
    return {
      metric_id: legacy.id || `METRIC-${name.toUpperCase().replace(/\s+/g, '-')}`,
      name: name,
      short_name: name.toLowerCase().replace(/\s+/g, '_'),
      description: description,
      category: category,
      tier: 'Tier-2',
      business_domain: category,
      metric_type: 'operational',
      tags: tags,
      alignment: {
        strategic_pillar: 'Not specified',
        primary_objective_ids: [],
        related_okr_ids: [],
        why_it_matters: description,
      },
      definition: {
        formula: 'Not specified',
        formula_detail: 'Not specified',
        numerator: { event_name: 'unknown', filters: [] },
        denominator: { event_name: 'unknown', filters: [] },
        unit: unit,
        expected_direction: 'increase',
        example_calculation: {},
      },
      data: {
        primary_sources: [],
        secondary_sources: [],
        data_freshness: 'unknown',
        update_frequency: 'daily',
        time_grain: ['day'],
        data_retention: '90_days',
      },
      governance: {
        data_classification: governance.dataClassification || 'internal',
        pii_involved: false,
        regulatory_constraints: [],
        owner_team: governance.team || 'Unknown',
        technical_owner: governance.owner || 'Unknown',
        business_owner: governance.owner || 'Unknown',
        version: '1.0.0',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      dimensions: [],
      targets_and_alerts: {
        target_value: 0,
        warning_threshold: 0,
        critical_threshold: 0,
        comparison_baseline: 'previous_period',
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
        review_cadence: 'weekly',
        linked_playbooks: [],
      },
      metadata: {
        notes: '',
        example_queries: [],
      },
    };
  }

  /**
   * Save metrics catalog to a file
   */
  static saveCatalogToFile(filePath: string, catalog: MetricsCatalog): void {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content: string;
    if (ext === '.json') {
      content = JSON.stringify(catalog, null, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump(catalog);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Save metric definitions to a file (legacy format)
   */
  static saveToFile(filePath: string, metrics: MetricDefinitionInput[]): void {
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content: string;
    if (ext === '.json') {
      content = JSON.stringify({ metrics }, null, 2);
    } else if (ext === '.yaml' || ext === '.yml') {
      content = yaml.dump({ metrics });
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use .json, .yaml, or .yml`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
}
