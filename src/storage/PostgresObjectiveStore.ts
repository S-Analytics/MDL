import { Pool } from 'pg';
import { KeyResult, Objective } from '../models';
import { DatabasePool } from '../utils/database';
import { logger } from '../utils/logger';
import { PostgresConfig } from './PostgresMetricStore';

/**
 * PostgreSQL implementation for Objectives and Key Results
 * Can use either a provided DatabasePool or create its own legacy Pool
 */
export class PostgresObjectiveStore {
  private pool: Pool;
  private dbPool?: DatabasePool;
  private isLegacyMode: boolean;

  constructor(config: PostgresConfig, dbPool?: DatabasePool) {
    if (dbPool) {
      // Use modern DatabasePool with health checks and retry logic
      this.dbPool = dbPool;
      this.isLegacyMode = false;
      // Create a legacy pool reference for backward compatibility
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
      logger.info('PostgresObjectiveStore initialized with DatabasePool');
    } else {
      // Legacy mode for backward compatibility
      this.isLegacyMode = true;
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
      logger.info('PostgresObjectiveStore initialized with legacy Pool');
    }
  }

  async findAll(): Promise<Objective[]> {
    // Get all objectives
    const objectivesQuery = 'SELECT * FROM objectives ORDER BY timeframe_start DESC';
    const objectivesResult = this.dbPool
      ? await this.dbPool.query(objectivesQuery)
      : await this.pool.query(objectivesQuery);
    
    // Get all key results
    const keyResultsQuery = 'SELECT * FROM key_results ORDER BY objective_id, kr_id';
    const keyResultsResult = this.dbPool
      ? await this.dbPool.query(keyResultsQuery)
      : await this.pool.query(keyResultsQuery);
    
    // Map key results by objective_id
    const keyResultsMap = new Map<string, KeyResult[]>();
    for (const row of keyResultsResult.rows) {
      const kr = this.rowToKeyResult(row);
      const objId = row.objective_id as string;
      if (!keyResultsMap.has(objId)) {
        keyResultsMap.set(objId, []);
      }
      keyResultsMap.get(objId)!.push(kr);
    }
    
    // Combine objectives with their key results
    return objectivesResult.rows.map(row => {
      const objective = this.rowToObjective(row);
      objective.key_results = keyResultsMap.get(objective.objective_id) || [];
      return objective;
    });
  }

  async findById(id: string): Promise<Objective | null> {
    const objectiveQuery = 'SELECT * FROM objectives WHERE objective_id = $1';
    const objectiveResult = this.dbPool
      ? await this.dbPool.query(objectiveQuery, [id])
      : await this.pool.query(objectiveQuery, [id]);
    
    if (objectiveResult.rows.length === 0) {
      return null;
    }
    
    const keyResultsQuery = 'SELECT * FROM key_results WHERE objective_id = $1 ORDER BY kr_id';
    const keyResultsResult = this.dbPool
      ? await this.dbPool.query(keyResultsQuery, [id])
      : await this.pool.query(keyResultsQuery, [id]);
    
    const objective = this.rowToObjective(objectiveResult.rows[0]);
    objective.key_results = keyResultsResult.rows.map(row => this.rowToKeyResult(row));
    
    return objective;
  }

  async create(objective: Objective): Promise<Objective> {
    const executeCreate = async (client: any) => {
      
      // Insert objective (cast to any to access extended properties)
      const obj = objective as unknown as Record<string, unknown>;
      const objectiveQuery = `
        INSERT INTO objectives (
          objective_id, name, description, owner_team, status, priority, 
          strategic_pillar, timeframe_start, timeframe_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const objectiveValues = [
        objective.objective_id,
        objective.name,
        objective.description || null,
        objective.owner_team || null,
        objective.status || 'draft',
        obj.priority || 'medium',
        obj.strategic_pillar || null,
        objective.timeframe.start,
        objective.timeframe.end,
      ];
      
      const objectiveResult = await client.query(objectiveQuery, objectiveValues);
      
      // Insert key results if any
      const keyResults: KeyResult[] = [];
      if (objective.key_results && objective.key_results.length > 0) {
        for (const kr of objective.key_results) {
          const krObj = kr as unknown as Record<string, unknown>;
          const krQuery = `
            INSERT INTO key_results (
              objective_id, kr_id, name, description, baseline_value, current_value, 
              target_value, unit, direction, metric_ids, progress_percentage, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
          `;
          
          const krValues = [
            objective.objective_id,
            kr.kr_id,
            kr.name,
            kr.description || null,
            kr.baseline_value,
            kr.current_value,
            kr.target_value,
            kr.unit,
            kr.direction,
            JSON.stringify(kr.metric_ids || []),
            krObj.progress_percentage || null,
            krObj.status || 'on-track',
          ];
          
          const krResult = await client.query(krQuery, krValues);
          keyResults.push(this.rowToKeyResult(krResult.rows[0]));
        }
      }
      
      const result = this.rowToObjective(objectiveResult.rows[0]);
      result.key_results = keyResults;
      return result;
    };

    if (this.dbPool) {
      return await this.dbPool.transaction(executeCreate);
    } else {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await executeCreate(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async update(objective: Objective): Promise<Objective> {
    const executeUpdate = async (client: any) => {
      
      // Update objective (cast to any to access extended properties)
      const obj = objective as unknown as Record<string, unknown>;
      const objectiveQuery = `
        UPDATE objectives 
        SET name = $2, description = $3, owner_team = $4, status = $5, 
            priority = $6, strategic_pillar = $7, timeframe_start = $8, timeframe_end = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE objective_id = $1
        RETURNING *
      `;
      
      const objectiveValues = [
        objective.objective_id,
        objective.name,
        objective.description || null,
        objective.owner_team || null,
        objective.status || 'draft',
        obj.priority || 'medium',
        obj.strategic_pillar || null,
        objective.timeframe.start,
        objective.timeframe.end,
      ];
      
      const objectiveResult = await client.query(objectiveQuery, objectiveValues);
      
      if (objectiveResult.rows.length === 0) {
        throw new Error(`Objective ${objective.objective_id} not found`);
      }
      
      // Delete existing key results for this objective
      await client.query('DELETE FROM key_results WHERE objective_id = $1', [objective.objective_id]);
      
      // Insert updated key results
      const keyResults: KeyResult[] = [];
      if (objective.key_results && objective.key_results.length > 0) {
        for (const kr of objective.key_results) {
          const krObj = kr as unknown as Record<string, unknown>;
          const krQuery = `
            INSERT INTO key_results (
              objective_id, kr_id, name, description, baseline_value, current_value, 
              target_value, unit, direction, metric_ids, progress_percentage, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
          `;
          
          const krValues = [
            objective.objective_id,
            kr.kr_id,
            kr.name,
            kr.description || null,
            kr.baseline_value,
            kr.current_value,
            kr.target_value,
            kr.unit,
            kr.direction,
            JSON.stringify(kr.metric_ids || []),
            krObj.progress_percentage || null,
            krObj.status || 'on-track',
          ];
          
          const krResult = await client.query(krQuery, krValues);
          keyResults.push(this.rowToKeyResult(krResult.rows[0]));
        }
      }
      
      const result = this.rowToObjective(objectiveResult.rows[0]);
      result.key_results = keyResults;
      return result;
    };

    if (this.dbPool) {
      return await this.dbPool.transaction(executeUpdate);
    } else {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await executeUpdate(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  async close(): Promise<void> {
    if (this.dbPool) {
      await this.dbPool.close();
    } else {
      await this.pool.end();
    }
  }

  private rowToObjective(row: Record<string, unknown>): Objective {
    const obj = {
      objective_id: row.objective_id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      owner_team: (row.owner_team as string) || '',
      status: (row.status as string) || 'draft',
      timeframe: {
        start: row.timeframe_start ? (row.timeframe_start as Date).toISOString().split('T')[0] : '',
        end: row.timeframe_end ? (row.timeframe_end as Date).toISOString().split('T')[0] : '',
      },
      key_results: [],
    };
    // Add optional fields that may exist in DB but not in type
    if (row.priority) {
      (obj as unknown as Record<string, unknown>).priority = row.priority;
    }
    if (row.strategic_pillar) {
      (obj as unknown as Record<string, unknown>).strategic_pillar = row.strategic_pillar;
    }
    return obj;
  }

  private rowToKeyResult(row: Record<string, unknown>): KeyResult {
    return {
      kr_id: row.kr_id as string,
      name: row.name as string,
      description: (row.description as string) || '',
      baseline_value: Number.parseFloat(row.baseline_value as string) || 0,
      current_value: row.current_value ? Number.parseFloat(row.current_value as string) : null,
      target_value: Number.parseFloat(row.target_value as string) || 0,
      unit: (row.unit as string) || '',
      direction: (row.direction as 'increase' | 'decrease') || 'increase',
      metric_ids: (row.metric_ids as string[]) || [],
    };
  }
}
