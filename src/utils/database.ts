import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from './logger';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

/**
 * Database pool manager with health checks and retry logic
 */
export class DatabasePool {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize connection pool
   */
  async connect(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    };

    this.pool = new Pool(poolConfig);

    // Setup pool event handlers
    this.pool.on('connect', (client) => {
      logger.debug('New database client connected');
    });

    this.pool.on('acquire', (client) => {
      logger.trace('Database client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed from pool');
    });

    this.pool.on('error', (err, client) => {
      logger.error({ err }, 'Unexpected database pool error');
      this.isHealthy = false;
    });

    // Test connection
    try {
      await this.testConnection();
      this.isHealthy = true;
      logger.info(
        {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          poolMin: poolConfig.min,
          poolMax: poolConfig.max,
        },
        'Database pool connected successfully'
      );

      // Start health checks if enabled
      if (process.env.DB_HEALTH_CHECK_ENABLED === 'true') {
        this.startHealthChecks();
      }
    } catch (error) {
      this.isHealthy = false;
      logger.error({ err: error }, 'Failed to connect to database');
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(retries = 3): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
      } catch (error) {
        logger.warn(
          { attempt, retries, err: error },
          `Database connection test failed (attempt ${attempt}/${retries})`
        );

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    return false;
  }

  /**
   * Execute query with automatic retry
   */
  async query<T = any>(
    text: string,
    params?: any[],
    retries = 1
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const startTime = Date.now();

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const result = await this.pool.query(text, params);
        const duration = Date.now() - startTime;

        logger.debug(
          {
            query: text.substring(0, 100),
            params: params?.length || 0,
            rows: result.rowCount,
            duration: `${duration}ms`,
          },
          'Database query executed'
        );

        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
        };
      } catch (error: any) {
        logger.warn(
          { attempt, retries: retries + 1, err: error },
          `Database query failed (attempt ${attempt}/${retries + 1})`
        );

        // Don't retry on syntax errors or constraint violations
        if (
          error.code === '42601' || // syntax_error
          error.code === '23505' || // unique_violation
          error.code === '23503' // foreign_key_violation
        ) {
          throw error;
        }

        if (attempt === retries + 1) {
          throw error;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 500);
      }
    }

    throw new Error('Query failed after all retries');
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }
    return await this.pool.connect();
  }

  /**
   * Execute function within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      healthy: this.isHealthy,
    };
  }

  /**
   * Check if pool is healthy
   */
  isPoolHealthy(): boolean {
    return this.isHealthy && this.pool !== null;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testConnection(1);
        if (!this.isHealthy) {
          logger.info('Database health check passed - marking as healthy');
          this.isHealthy = true;
        }
      } catch (error) {
        if (this.isHealthy) {
          logger.error({ err: error }, 'Database health check failed - marking as unhealthy');
          this.isHealthy = false;
        }
      }
    }, interval);

    logger.info({ interval: `${interval}ms` }, 'Database health checks started');
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Database health checks stopped');
    }
  }

  /**
   * Close pool gracefully
   */
  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    this.stopHealthChecks();

    try {
      await this.pool.end();
      this.pool = null;
      this.isHealthy = false;
      logger.info('Database pool closed successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error closing database pool');
      throw error;
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton database pool instance
 */
let globalPool: DatabasePool | null = null;

/**
 * Initialize global database pool
 */
export async function initializeDatabasePool(
  config: DatabaseConfig
): Promise<DatabasePool> {
  if (globalPool) {
    logger.warn('Database pool already initialized');
    return globalPool;
  }

  globalPool = new DatabasePool(config);
  await globalPool.connect();
  return globalPool;
}

/**
 * Get global database pool
 */
export function getDatabasePool(): DatabasePool {
  if (!globalPool) {
    throw new Error('Database pool not initialized. Call initializeDatabasePool first.');
  }
  return globalPool;
}

/**
 * Close global database pool
 */
export async function closeDatabasePool(): Promise<void> {
  if (globalPool) {
    await globalPool.close();
    globalPool = null;
  }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    try {
      await closeDatabasePool();
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
