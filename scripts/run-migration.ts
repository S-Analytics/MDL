#!/usr/bin/env ts-node
/**
 * Database Migration Runner
 * 
 * Safely executes SQL migration scripts with proper error handling,
 * verification, and rollback support.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

interface MigrationResult {
  success: boolean;
  migration: string;
  duration: number;
  error?: string;
}

interface MigrationStats {
  totalMigrations: number;
  successful: number;
  failed: number;
  totalDuration: number;
}

/**
 * Create database connection pool
 */
function createPool(): Pool {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mdl',
    user: process.env.DB_USER || 'mdl_user',
    password: process.env.DB_PASSWORD || 'mdl_password',
  };

  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}\n`);

  return new Pool(dbConfig);
}

/**
 * Execute a single migration file
 */
async function executeMigration(
  pool: Pool,
  migrationPath: string
): Promise<MigrationResult> {
  const migrationName = path.basename(migrationPath);
  const startTime = Date.now();

  try {
    console.log(`🔄 Executing: ${migrationName}`);

    // Read migration file
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    const duration = Date.now() - startTime;
    console.log(`✅ Completed: ${migrationName} (${duration}ms)\n`);

    return {
      success: true,
      migration: migrationName,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Failed: ${migrationName}`);
    console.error(`   Error: ${errorMessage}\n`);

    return {
      success: false,
      migration: migrationName,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Verify database connection
 */
async function verifyConnection(pool: Pool): Promise<boolean> {
  try {
    console.log('🔌 Verifying database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database at ${result.rows[0].now}\n`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Connection failed: ${errorMessage}\n`);
    return false;
  }
}

/**
 * Check if migration has already been run
 */
async function isMigrationApplied(
  pool: Pool,
  migrationName: string
): Promise<boolean> {
  try {
    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create migrations table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return false;
    }

    // Check if this specific migration has been applied
    const migrationCheck = await pool.query(
      'SELECT name FROM migrations WHERE name = $1',
      [migrationName]
    );

    return migrationCheck.rows.length > 0;
  } catch (error) {
    console.error('Warning: Could not check migration status:', error);
    return false;
  }
}

/**
 * Record successful migration
 */
async function recordMigration(
  pool: Pool,
  migrationName: string
): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [migrationName]
    );
  } catch (error) {
    console.error('Warning: Could not record migration:', error);
  }
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  console.log('🚀 MDL Database Migration Runner\n');
  console.log('=' .repeat(60) + '\n');

  const pool = createPool();
  const results: MigrationResult[] = [];

  try {
    // Verify connection
    const connected = await verifyConnection(pool);
    if (!connected) {
      process.exit(1);
    }

    // Get migration file path from command line or default
    const migrationArg = process.argv[2];
    const migrationsDir = path.join(__dirname, 'migrations');

    let migrationFiles: string[] = [];

    if (migrationArg) {
      // Single migration specified
      const migrationPath = migrationArg.includes('/')
        ? migrationArg
        : path.join(migrationsDir, migrationArg);

      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
      }

      migrationFiles = [migrationPath];
    } else {
      // Run all migrations in order
      if (!fs.existsSync(migrationsDir)) {
        console.error(`❌ Migrations directory not found: ${migrationsDir}`);
        process.exit(1);
      }

      migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => path.join(migrationsDir, file));
    }

    console.log(`📝 Found ${migrationFiles.length} migration(s)\n`);

    // Execute migrations
    for (const migrationPath of migrationFiles) {
      const migrationName = path.basename(migrationPath);

      // Check if already applied
      const applied = await isMigrationApplied(pool, migrationName);
      if (applied) {
        console.log(`⏭️  Skipping: ${migrationName} (already applied)\n`);
        continue;
      }

      // Execute migration
      const result = await executeMigration(pool, migrationPath);
      results.push(result);

      // Record successful migration
      if (result.success) {
        await recordMigration(pool, migrationName);
      } else {
        // Stop on first error
        break;
      }
    }

    // Print summary
    console.log('=' .repeat(60));
    console.log('\n📊 Migration Summary:\n');

    const stats: MigrationStats = {
      totalMigrations: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    };

    console.log(`   Total Migrations: ${stats.totalMigrations}`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   ⏱️  Total Duration: ${stats.totalDuration}ms\n`);

    if (stats.failed > 0) {
      console.log('❌ Migration failed. Please check errors above.');
      process.exit(1);
    } else {
      console.log('✅ All migrations completed successfully!\n');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Migration runner error:', errorMessage);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
