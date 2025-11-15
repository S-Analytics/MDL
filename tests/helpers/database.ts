/**
 * Test Helpers for PostgreSQL Integration Tests
 * 
 * Shared utilities for setting up and cleaning test databases.
 */

import { Client } from 'pg';

export interface TestDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Get test database configuration from environment variables
 */
export function getTestDbConfig(): TestDbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mdl_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

/**
 * Check if database is configured for testing
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DB_PASSWORD;
}

/**
 * Clean test data from all tables
 */
export async function cleanTestData(config: TestDbConfig): Promise<void> {
  const client = new Client(config);
  await client.connect();
  
  try {
    // Delete in order to respect foreign key constraints
    await client.query('DELETE FROM key_results WHERE objective_id LIKE $1', ['TEST-%']);
    await client.query('DELETE FROM objectives WHERE objective_id LIKE $1', ['TEST-%']);
    await client.query('DELETE FROM metrics WHERE metric_id LIKE $1', ['TEST-%']);
    await client.query('DELETE FROM business_domains WHERE domain_id LIKE $1', ['test-%']);
  } finally {
    await client.end();
  }
}

/**
 * Clean specific table test data
 */
export async function cleanTableData(
  config: TestDbConfig,
  table: string,
  idColumn: string,
  pattern: string
): Promise<void> {
  const client = new Client(config);
  await client.connect();
  
  try {
    await client.query(`DELETE FROM ${table} WHERE ${idColumn} LIKE $1`, [pattern]);
  } finally {
    await client.end();
  }
}

/**
 * Verify table exists
 */
export async function tableExists(config: TestDbConfig, tableName: string): Promise<boolean> {
  const client = new Client(config);
  await client.connect();
  
  try {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } finally {
    await client.end();
  }
}

/**
 * Get row count for a table
 */
export async function getRowCount(
  config: TestDbConfig,
  table: string,
  whereClause?: string,
  params?: any[]
): Promise<number> {
  const client = new Client(config);
  await client.connect();
  
  try {
    const query = whereClause 
      ? `SELECT COUNT(*) FROM ${table} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${table}`;
    
    const result = await client.query(query, params);
    return parseInt(result.rows[0].count);
  } finally {
    await client.end();
  }
}

/**
 * Create a test-specific ID to avoid conflicts
 */
export function createTestId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Wait for a short period (useful for timestamp-based tests)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Skip test suite if database is not configured
 */
export function describeIfDb(name: string, fn: () => void): void {
  if (isDatabaseConfigured()) {
    describe(name, fn);
  } else {
    describe.skip(name, () => {
      it('should skip - no database configured', () => {
        console.log('Skipping PostgreSQL tests - DB_PASSWORD not set');
        expect(true).toBe(true);
      });
    });
  }
}
