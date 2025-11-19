#!/usr/bin/env node

/**
 * MDL Database Setup Script
 * 
 * This script sets up the PostgreSQL database schema for MDL.
 * 
 * Usage:
 *   node scripts/setup-database.js
 * 
 * Environment variables:
 *   DB_HOST - PostgreSQL host (default: localhost)
 *   DB_PORT - PostgreSQL port (default: 5432)
 *   DB_NAME - Database name (default: mdl)
 *   DB_USER - Database user (default: postgres)
 *   DB_PASSWORD - Database password (required)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment or defaults
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mdl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

async function setupDatabase() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MDL Database Setup                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Validate password is provided (allow empty string for local development)
  if (process.env.DB_PASSWORD === undefined) {
    console.error('❌ Error: DB_PASSWORD environment variable must be set');
    console.error('\nUsage:');
    console.error('  DB_PASSWORD=your_password node scripts/setup-database.js');
    console.error('  (Use DB_PASSWORD=\'\' for no password in local development)');
    console.error('\nOr set environment variables:');
    console.error('  export DB_HOST=localhost');
    console.error('  export DB_PORT=5432');
    console.error('  export DB_NAME=mdl');
    console.error('  export DB_USER=postgres');
    console.error('  export DB_PASSWORD=your_password');
    console.error('  node scripts/setup-database.js\n');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Host:     ${config.host}`);
  console.log(`   Port:     ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User:     ${config.user}`);
  console.log('');

  const client = new Client(config);

  try {
    // Connect to database
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'db-setup.sql');
    console.log('📄 Reading schema file: db-setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Schema file loaded\n');

    // Execute SQL
    console.log('🔧 Executing database schema...');
    await client.query(sql);
    console.log('✅ Database schema created successfully\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`✅ Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify views were created
    const viewResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n✅ Found ${viewResult.rows.length} views:`);
    viewResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Database Setup Complete! ✨                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('1. Configure database connection in MDL settings');
    console.log('2. Import sample data (optional):');
    console.log('   node scripts/import-sample-data.js');
    console.log('3. Start the MDL server:');
    console.log('   npm start\n');

  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Please check:');
      console.error('   - PostgreSQL is running');
      console.error('   - Host and port are correct');
      console.error('   - Firewall settings allow connection');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('   - Username is correct');
      console.error('   - Password is correct');
      console.error('   - User has permission to create tables');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist. Please:');
      console.error('   - Create the database first: CREATE DATABASE mdl;');
      console.error('   - Or specify an existing database with DB_NAME');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
setupDatabase();
