import { Pool } from 'pg';
import { PostgresConfig } from './PostgresMetricStore';

export interface BusinessDomain {
  domain_id: string;
  name: string;
  description?: string;
  owner_team?: string;
  contact_email?: string;
  tier_focus?: Record<string, unknown>;
  key_areas?: string[];
  color?: string;
}

/**
 * PostgreSQL implementation for Business Domains
 */
export class PostgresDomainStore {
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

  async findAll(): Promise<BusinessDomain[]> {
    const query = 'SELECT * FROM business_domains ORDER BY name';
    const result = await this.pool.query(query);
    return result.rows.map(row => this.rowToDomain(row));
  }

  async findById(id: string): Promise<BusinessDomain | null> {
    const query = 'SELECT * FROM business_domains WHERE domain_id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.rowToDomain(result.rows[0]);
  }

  async findByName(name: string): Promise<BusinessDomain | null> {
    const query = 'SELECT * FROM business_domains WHERE name = $1';
    const result = await this.pool.query(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.rowToDomain(result.rows[0]);
  }

  async create(domain: BusinessDomain): Promise<BusinessDomain> {
    const query = `
      INSERT INTO business_domains (
        domain_id, name, description, owner_team, contact_email, 
        tier_focus, key_areas, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      domain.domain_id,
      domain.name,
      domain.description || null,
      domain.owner_team || null,
      domain.contact_email || null,
      JSON.stringify(domain.tier_focus || {}),
      JSON.stringify(domain.key_areas || []),
      domain.color || null,
    ];

    const result = await this.pool.query(query, values);
    return this.rowToDomain(result.rows[0]);
  }

  async update(domain: BusinessDomain): Promise<BusinessDomain> {
    const query = `
      UPDATE business_domains 
      SET name = $2, description = $3, owner_team = $4, contact_email = $5, 
          tier_focus = $6, key_areas = $7, color = $8, updated_at = CURRENT_TIMESTAMP
      WHERE domain_id = $1
      RETURNING *
    `;

    const values = [
      domain.domain_id,
      domain.name,
      domain.description || null,
      domain.owner_team || null,
      domain.contact_email || null,
      JSON.stringify(domain.tier_focus || {}),
      JSON.stringify(domain.key_areas || []),
      domain.color || null,
    ];

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Domain ${domain.domain_id} not found`);
    }
    
    return this.rowToDomain(result.rows[0]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private rowToDomain(row: Record<string, unknown>): BusinessDomain {
    return {
      domain_id: row.domain_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      owner_team: row.owner_team as string | undefined,
      contact_email: row.contact_email as string | undefined,
      tier_focus: (row.tier_focus as Record<string, unknown>) || {},
      key_areas: (row.key_areas as string[]) || [],
      color: row.color as string | undefined,
    };
  }
}
