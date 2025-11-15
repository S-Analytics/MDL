import { Pool } from 'pg';
import {
    MetricDefinition,
    MetricDefinitionInput
} from '../models';
import { IMetricStore } from './MetricStore';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * PostgreSQL implementation of IMetricStore
 */
export class PostgresMetricStore implements IMetricStore {
  private pool: Pool;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async create(input: MetricDefinitionInput): Promise<MetricDefinition> {
    // For now, create operation expects MetricDefinition structure, not MetricDefinitionInput
    // This is a simplified implementation
    const metric = input as unknown as MetricDefinition;
    const metric_id = metric.metric_id || `METRIC-${Date.now()}`;
    
    const query = `
      INSERT INTO metrics (
        metric_id, name, description, category, tier, business_domain, 
        metric_type, tags, definition, strategic_alignment, governance, 
        targets, alert_rules, visualization, usage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      metric_id,
      metric.name,
      metric.description || null,
      metric.category || null,
      metric.tier || null,
      metric.business_domain || null,
      metric.metric_type || null,
      JSON.stringify(metric.tags || []),
      JSON.stringify(metric.definition || {}),
      JSON.stringify(metric.alignment || {}),
      JSON.stringify(metric.governance || {}),
      JSON.stringify(metric.targets_and_alerts || {}),
      JSON.stringify(metric.targets_and_alerts?.alert_rules || []),
      JSON.stringify(metric.visualization || {}),
      JSON.stringify(metric.operational_usage || {}),
    ];

    const result = await this.pool.query(query, values);
    return this.rowToMetric(result.rows[0]);
  }

  async findAll(filters?: Record<string, unknown>): Promise<MetricDefinition[]> {
    let query = 'SELECT * FROM metrics WHERE 1=1';
    const values: (string | number | string[])[] = [];
    let paramCount = 1;

    if (filters) {
      if (filters.business_domain) {
        query += ` AND business_domain = $${paramCount}`;
        values.push(filters.business_domain as string);
        paramCount++;
      }
      if (filters.metric_type) {
        query += ` AND metric_type = $${paramCount}`;
        values.push(filters.metric_type as string);
        paramCount++;
      }
      if (filters.tier) {
        query += ` AND tier = $${paramCount}`;
        values.push(filters.tier as string);
        paramCount++;
      }
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        query += ` AND tags @> $${paramCount}`;
        values.push(JSON.stringify(filters.tags));
        paramCount++;
      }
    }

    query += ' ORDER BY name';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.rowToMetric(row));
  }

  async findById(id: string): Promise<MetricDefinition | null> {
    const query = 'SELECT * FROM metrics WHERE metric_id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.rowToMetric(result.rows[0]);
  }

  async update(id: string, updates: Partial<MetricDefinitionInput>): Promise<MetricDefinition> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Metric ${id} not found`);
    }

    const updateMetric = updates as unknown as Partial<MetricDefinition>;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updateMetric.name !== undefined) {
      setClauses.push(`name = $${paramCount}`);
      values.push(updateMetric.name);
      paramCount++;
    }
    if (updateMetric.description !== undefined) {
      setClauses.push(`description = $${paramCount}`);
      values.push(updateMetric.description);
      paramCount++;
    }
    if (updateMetric.category !== undefined) {
      setClauses.push(`category = $${paramCount}`);
      values.push(updateMetric.category);
      paramCount++;
    }
    if (updateMetric.tier !== undefined) {
      setClauses.push(`tier = $${paramCount}`);
      values.push(updateMetric.tier);
      paramCount++;
    }
    if (updateMetric.business_domain !== undefined) {
      setClauses.push(`business_domain = $${paramCount}`);
      values.push(updateMetric.business_domain);
      paramCount++;
    }
    if (updateMetric.metric_type !== undefined) {
      setClauses.push(`metric_type = $${paramCount}`);
      values.push(updateMetric.metric_type);
      paramCount++;
    }
    if (updateMetric.tags !== undefined) {
      setClauses.push(`tags = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.tags));
      paramCount++;
    }
    if (updateMetric.definition !== undefined) {
      setClauses.push(`definition = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.definition));
      paramCount++;
    }
    if (updateMetric.alignment !== undefined) {
      setClauses.push(`strategic_alignment = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.alignment));
      paramCount++;
    }
    if (updateMetric.governance !== undefined) {
      setClauses.push(`governance = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.governance));
      paramCount++;
    }
    if (updateMetric.targets_and_alerts !== undefined) {
      setClauses.push(`targets = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.targets_and_alerts));
      paramCount++;
    }
    if (updateMetric.visualization !== undefined) {
      setClauses.push(`visualization = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.visualization));
      paramCount++;
    }
    if (updateMetric.operational_usage !== undefined) {
      setClauses.push(`usage = $${paramCount}`);
      values.push(JSON.stringify(updateMetric.operational_usage));
      paramCount++;
    }

    if (setClauses.length === 0) {
      return existing;
    }

    const query = `
      UPDATE metrics 
      SET ${setClauses.join(', ')} 
      WHERE metric_id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return this.rowToMetric(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM metrics WHERE metric_id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async exists(id: string): Promise<boolean> {
    const query = 'SELECT 1 FROM metrics WHERE metric_id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private rowToMetric(row: Record<string, unknown>): MetricDefinition {
    const metric = {
      metric_id: row.metric_id as string,
      name: row.name as string,
      short_name: (row.name as string) || '',
      description: (row.description as string) || '',
      category: (row.category as string) || '',
      tier: (row.tier as string) || '',
      business_domain: (row.business_domain as string) || '',
      metric_type: (row.metric_type as string) || '',
      tags: (row.tags as string[]) || [],
      alignment: row.strategic_alignment || {},
      definition: row.definition || {},
      data: {},
      governance: row.governance || {},
      dimensions: [],
      targets_and_alerts: row.targets || {},
      visualization: row.visualization || {},
      relationships: {},
      operational_usage: row.usage || {},
      metadata: {},
    };
    return metric as unknown as MetricDefinition;
  }
}
