#!/usr/bin/env node

/**
 * Clean Sample Data from PostgreSQL
 * 
 * This script removes all sample data (metrics, domains, objectives, and key results)
 * from the PostgreSQL database. This is the reversal of load-sample-data-postgres.js.
 * 
 * Usage:
 *   DB_PASSWORD=yourpass node scripts/clean-sample-data-postgres.js
 * 
 * Options:
 *   --confirm   Skip confirmation prompt
 * 
 * Environment Variables:
 *   DB_HOST     - Database host (default: localhost)
 *   DB_PORT     - Database port (default: 5432)
 *   DB_NAME     - Database name (default: mdl)
 *   DB_USER     - Database user (default: postgres)
 *   DB_PASSWORD - Database password (required)
 */

const { Client } = require('pg');
const readline = require('readline');

// Database configuration from environment variables
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mdl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

// Check for --confirm flag
const skipConfirm = process.argv.includes('--confirm');

// Validate required environment variables (allow empty string for local dev)
if (process.env.DB_PASSWORD === undefined) {
  console.error('❌ Error: DB_PASSWORD environment variable must be set');
  console.error('');
  console.error('Usage:');
  console.error('  DB_PASSWORD=yourpass node scripts/clean-sample-data-postgres.js');
  console.error('  DB_PASSWORD=\'\' node scripts/clean-sample-data-postgres.js --confirm');
  console.error('  (Use DB_PASSWORD=\'\' for no password in local development)');
  console.error('');
  process.exit(1);
}

/**
 * Prompt user for confirmation
 */
function askForConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Type "DELETE ALL DATA" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'DELETE ALL DATA');
    });
  });
}

async function cleanSampleData() {
  const client = new Client(config);

  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Clean Sample Data from PostgreSQL                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 Configuration:');
    console.log(`   Host:     ${config.host}`);
    console.log(`   Port:     ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User:     ${config.user}`);
    console.log('');

    // Connect to database
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully');
    console.log('');

    // Get current record counts
    console.log('📊 Current database status:');
    const domainsCount = await client.query('SELECT COUNT(*) FROM business_domains');
    const metricsCount = await client.query('SELECT COUNT(*) FROM metrics');
    const objectivesCount = await client.query('SELECT COUNT(*) FROM objectives');
    const keyResultsCount = await client.query('SELECT COUNT(*) FROM key_results');
    
    console.log(`   Business Domains: ${domainsCount.rows[0].count}`);
    console.log(`   Metrics:          ${metricsCount.rows[0].count}`);
    console.log(`   Objectives:       ${objectivesCount.rows[0].count}`);
    console.log(`   Key Results:      ${keyResultsCount.rows[0].count}`);
    console.log('');

    // Check if there's any data to delete
    const totalRecords = parseInt(domainsCount.rows[0].count) + 
                         parseInt(metricsCount.rows[0].count) + 
                         parseInt(objectivesCount.rows[0].count) + 
                         parseInt(keyResultsCount.rows[0].count);

    if (totalRecords === 0) {
      console.log('ℹ️  Database is already empty. Nothing to clean.');
      console.log('');
      return;
    }

    // Confirmation
    if (!skipConfirm) {
      console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
      console.log('   This action cannot be undone.');
      console.log('');
      
      const confirmed = await askForConfirmation();
      
      if (!confirmed) {
        console.log('');
        console.log('❌ Deletion cancelled. No data was removed.');
        console.log('');
        return;
      }
      console.log('');
    } else {
      console.log('⚠️  WARNING: Deleting all data (--confirm flag used)...');
      console.log('');
    }

    // Delete data in correct order (respecting foreign key constraints)
    console.log('🗑️  Deleting data...');
    
    console.log('   → Deleting key results...');
    const krDeleted = await client.query('DELETE FROM key_results');
    console.log(`   ✓ Deleted ${krDeleted.rowCount} key results`);
    
    console.log('   → Deleting objectives...');
    const objDeleted = await client.query('DELETE FROM objectives');
    console.log(`   ✓ Deleted ${objDeleted.rowCount} objectives`);
    
    console.log('   → Deleting metrics...');
    const metricsDeleted = await client.query('DELETE FROM metrics');
    console.log(`   ✓ Deleted ${metricsDeleted.rowCount} metrics`);
    
    console.log('   → Deleting business domains...');
    const domainsDeleted = await client.query('DELETE FROM business_domains');
    console.log(`   ✓ Deleted ${domainsDeleted.rowCount} business domains`);
    
    console.log('');

    // Verify deletion
    console.log('✅ Verifying deletion...');
    const verifyDomains = await client.query('SELECT COUNT(*) FROM business_domains');
    const verifyMetrics = await client.query('SELECT COUNT(*) FROM metrics');
    const verifyObjectives = await client.query('SELECT COUNT(*) FROM objectives');
    const verifyKeyResults = await client.query('SELECT COUNT(*) FROM key_results');
    
    const remainingRecords = parseInt(verifyDomains.rows[0].count) + 
                            parseInt(verifyMetrics.rows[0].count) + 
                            parseInt(verifyObjectives.rows[0].count) + 
                            parseInt(verifyKeyResults.rows[0].count);

    if (remainingRecords === 0) {
      console.log('✅ All data successfully removed');
    } else {
      console.log('⚠️  Warning: Some records may still remain');
      console.log(`   Remaining records: ${remainingRecords}`);
    }
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Data Cleanup Complete! 🧹                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Deletion Summary:');
    console.log(`   Key Results:      ${krDeleted.rowCount} deleted`);
    console.log(`   Objectives:       ${objDeleted.rowCount} deleted`);
    console.log(`   Metrics:          ${metricsDeleted.rowCount} deleted`);
    console.log(`   Business Domains: ${domainsDeleted.rowCount} deleted`);
    console.log('');
    console.log('🎉 Database is now empty and ready for new data!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. To reload sample data, run:');
    console.log('      DB_PASSWORD=yourpass node scripts/load-sample-data-postgres.js');
    console.log('   2. Or create new data through the MDL dashboard');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error cleaning database:');
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Is PostgreSQL running?');
      console.error(`   Trying to connect to: ${config.host}:${config.port}`);
    } else if (error.code === '28P01') {
      console.error('   Authentication failed. Check your password.');
    } else if (error.code === '3D000') {
      console.error(`   Database "${config.database}" does not exist.`);
      console.error('   Run setup-database.js first to create the schema.');
    } else if (error.code === '23503') {
      console.error('   Foreign key constraint violation.');
      console.error('   Error details:', error.message);
    } else {
      console.error('   ' + error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    }
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
cleanSampleData().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
