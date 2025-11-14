import * as fs from 'fs';
import * as path from 'path';
import { MetricDefinition, MetricDefinitionInput } from '../models';

/**
 * Storage interface for Metric Definitions
 */
export interface IMetricStore {
  create(input: MetricDefinitionInput): Promise<MetricDefinition>;
  findById(id: string): Promise<MetricDefinition | null>;
  findAll(filters?: MetricFilters): Promise<MetricDefinition[]>;
  update(id: string, input: Partial<MetricDefinitionInput>): Promise<MetricDefinition>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface MetricFilters {
  category?: string;
  tags?: string[];
  owner?: string;
  business_domain?: string;
  tier?: string;
  metric_type?: string;
}

/**
 * In-memory storage implementation with file persistence
 */
export class InMemoryMetricStore implements IMetricStore {
  private metrics: Map<string, MetricDefinition> = new Map();
  private persistencePath?: string;

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath;
    if (persistencePath) {
      this.loadFromFile();
    }
  }

  async create(input: MetricDefinitionInput): Promise<MetricDefinition> {
    const metric_id = this.generateId(input.name);
    const now = new Date().toISOString();
    
    // Convert legacy input to new MetricDefinition format
    const metric: MetricDefinition = {
      metric_id,
      name: input.name,
      short_name: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      description: input.description,
      category: input.category,
      tier: 'Tier-2',
      business_domain: input.category,
      metric_type: 'operational',
      tags: input.tags || [],
      alignment: {
        strategic_pillar: 'Not specified',
        primary_objective_ids: [],
        related_okr_ids: [],
        why_it_matters: input.description,
      },
      definition: {
        formula: 'Not specified',
        formula_detail: 'Not specified',
        numerator: { event_name: 'unknown', filters: [] },
        denominator: { event_name: 'unknown', filters: [] },
        unit: input.unit || 'count',
        expected_direction: 'increase',
        example_calculation: {},
      },
      data: {
        primary_sources: input.source ? [{ system: input.source, table_or_stream: 'unknown', connection_id: 'unknown' }] : [],
        secondary_sources: [],
        data_freshness: 'unknown',
        update_frequency: 'daily',
        time_grain: ['day'],
        data_retention: '90_days',
      },
      governance: {
        data_classification: (input.governance as unknown as Record<string, unknown>)?.dataClassification as string || 'internal',
        pii_involved: false,
        regulatory_constraints: [],
        owner_team: (input.governance as unknown as Record<string, unknown>)?.team as string || 'Unknown',
        technical_owner: (input.governance as unknown as Record<string, unknown>)?.owner as string || 'Unknown',
        business_owner: (input.governance as unknown as Record<string, unknown>)?.owner as string || 'Unknown',
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
        notes: input.metadata?.notes || '',
        example_queries: [],
      },
    };

    this.metrics.set(metric_id, metric);
    await this.persistToFile();
    return metric;
  }

  async findById(id: string): Promise<MetricDefinition | null> {
    return this.metrics.get(id) || null;
  }

  async findAll(filters?: MetricFilters): Promise<MetricDefinition[]> {
    let results = Array.from(this.metrics.values());

    if (filters) {
      if (filters.category) {
        results = results.filter((m) => m.category === filters.category);
      }
      if (filters.business_domain) {
        results = results.filter((m) => m.business_domain === filters.business_domain);
      }
      if (filters.tier) {
        results = results.filter((m) => m.tier === filters.tier);
      }
      if (filters.metric_type) {
        results = results.filter((m) => m.metric_type === filters.metric_type);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((m) =>
          filters.tags!.some((tag) => m.tags?.includes(tag))
        );
      }
      if (filters.owner) {
        results = results.filter((m) => 
          m.governance?.owner_team === filters.owner || 
          m.governance?.technical_owner === filters.owner
        );
      }
    }

    return results;
  }

  async update(
    id: string,
    input: Partial<MetricDefinitionInput>
  ): Promise<MetricDefinition> {
    const existing = this.metrics.get(id);
    if (!existing) {
      throw new Error(`Metric with id ${id} not found`);
    }

    const now = new Date().toISOString();
    
    const updated: MetricDefinition = {
      ...existing,
      name: input.name || existing.name,
      description: input.description || existing.description,
      category: input.category || existing.category,
      tags: input.tags || existing.tags,
      governance: {
        ...existing.governance,
        updated_at: now,
      },
    };

    this.metrics.set(id, updated);
    await this.persistToFile();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = this.metrics.delete(id);
    if (result) {
      await this.persistToFile();
    }
    return result;
  }

  async exists(id: string): Promise<boolean> {
    return this.metrics.has(id);
  }

  private generateId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `METRIC-${sanitized}-${timestamp}-${random}`;
  }

  private async persistToFile(): Promise<void> {
    if (!this.persistencePath) return;

    try {
      const dir = path.dirname(this.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = JSON.stringify(Array.from(this.metrics.values()), null, 2);
      fs.writeFileSync(this.persistencePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to persist metrics to file:', error);
    }
  }

  private loadFromFile(): void {
    if (!this.persistencePath || !fs.existsSync(this.persistencePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.persistencePath, 'utf8');
      const metrics: MetricDefinition[] = JSON.parse(data);
      
      this.metrics.clear();
      for (const metric of metrics) {
        this.metrics.set(metric.metric_id, metric);
      }
    } catch (error) {
      console.error('Failed to load metrics from file:', error);
    }
  }
}
