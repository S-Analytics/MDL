#!/usr/bin/env node

/**
 * Load Sample Data into PostgreSQL
 * 
 * This script loads sample metrics, domains, and objectives from JSON files
 * into the PostgreSQL database.
 * 
 * Usage:
 *   DB_PASSWORD=yourpass node scripts/load-sample-data-postgres.js
 * 
 * Environment Variables:
 *   DB_HOST     - Database host (default: localhost)
 *   DB_PORT     - Database port (default: 5432)
 *   DB_NAME     - Database name (default: mdl)
 *   DB_USER     - Database user (default: postgres)
 *   DB_PASSWORD - Database password (required)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment variables
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mdl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

// Validate required environment variables
if (!config.password) {
  console.error('❌ Error: DB_PASSWORD environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  DB_PASSWORD=yourpass node scripts/load-sample-data-postgres.js');
  console.error('');
  process.exit(1);
}

// File paths
const DOMAINS_FILE = path.join(__dirname, '../examples/sample-domains.json');
const METRICS_FILE = path.join(__dirname, '../examples/sample-metrics.json');

async function loadSampleData() {
  const client = new Client(config);

  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Load Sample Data into PostgreSQL                           ║');
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

    // Load JSON files
    console.log('📄 Reading sample data files...');
    const domainsData = JSON.parse(fs.readFileSync(DOMAINS_FILE, 'utf8'));
    const metricsData = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    console.log(`✅ Found ${domainsData.domains.length} domains`);
    console.log(`✅ Found ${metricsData.metrics.length} metrics`);
    console.log(`✅ Found ${metricsData.objectives.length} objectives`);
    console.log('');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await client.query('DELETE FROM key_results');
    await client.query('DELETE FROM objectives');
    await client.query('DELETE FROM metrics');
    await client.query('DELETE FROM business_domains');
    console.log('✅ Existing data cleared');
    console.log('');

    // Insert domains
    console.log('📦 Inserting business domains...');
    for (const domain of domainsData.domains) {
      const query = `
        INSERT INTO business_domains (
          domain_id, name, description, owner_team, contact_email,
          tier_focus, key_areas, color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [
        domain.domain_id,
        domain.name,
        domain.description,
        domain.owner_team,
        domain.contact_email,
        JSON.stringify(domain.tier_focus || []),
        JSON.stringify(domain.key_areas || []),
        domain.color,
      ];
      await client.query(query, values);
      console.log(`   ✓ ${domain.name} (${domain.domain_id})`);
    }
    console.log('✅ Domains inserted successfully');
    console.log('');

    // Insert metrics
    console.log('📊 Inserting metrics...');
    let metricsInserted = 0;
    for (const metric of metricsData.metrics) {
      const query = `
        INSERT INTO metrics (
          metric_id, name, description, category, tier, business_domain,
          metric_type, tags, definition, strategic_alignment, governance,
          targets, alert_rules, visualization, usage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      const values = [
        metric.metric_id,
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
      await client.query(query, values);
      metricsInserted++;
      if (metricsInserted % 5 === 0) {
        console.log(`   ✓ Inserted ${metricsInserted} metrics...`);
      }
    }
    console.log(`✅ ${metricsInserted} metrics inserted successfully`);
    console.log('');

    // Insert objectives and key results
    console.log('🎯 Inserting objectives and key results...');
    for (const objective of metricsData.objectives) {
      // Insert objective
      const objQuery = `
        INSERT INTO objectives (
          objective_id, name, description, owner_team, status,
          priority, strategic_pillar, timeframe_start, timeframe_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      const objValues = [
        objective.objective_id,
        objective.name,
        objective.description,
        objective.owner_team,
        objective.status || 'active',
        objective.priority || 'medium',
        objective.strategic_pillar || null,
        objective.timeframe.start,
        objective.timeframe.end,
      ];
      await client.query(objQuery, objValues);
      console.log(`   ✓ ${objective.name} (${objective.objective_id})`);

      // Insert key results for this objective
      if (objective.key_results && objective.key_results.length > 0) {
        for (const kr of objective.key_results) {
          const krQuery = `
            INSERT INTO key_results (
              objective_id, kr_id, name, description, baseline_value,
              current_value, target_value, unit, direction, metric_ids,
              progress_percentage, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
            kr.progress_percentage || null,
            kr.status || 'on-track',
          ];
          await client.query(krQuery, krValues);
          console.log(`      → ${kr.name} (${kr.kr_id})`);
        }
      }
    }
    console.log('✅ Objectives and key results inserted successfully');
    console.log('');

    // Summary
    const domainsCount = await client.query('SELECT COUNT(*) FROM business_domains');
    const metricsCount = await client.query('SELECT COUNT(*) FROM metrics');
    const objectivesCount = await client.query('SELECT COUNT(*) FROM objectives');
    const keyResultsCount = await client.query('SELECT COUNT(*) FROM key_results');

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Data Load Complete! ✨                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Business Domains: ${domainsCount.rows[0].count}`);
    console.log(`   Metrics:          ${metricsCount.rows[0].count}`);
    console.log(`   Objectives:       ${objectivesCount.rows[0].count}`);
    console.log(`   Key Results:      ${keyResultsCount.rows[0].count}`);
    console.log('');
    console.log('🎉 Sample data loaded successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Open the MDL dashboard');
    console.log('   2. Go to Settings and configure PostgreSQL connection');
    console.log('   3. Save settings to switch to database storage');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error loading sample data:');
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
      console.error('   This might happen if the business domain does not exist.');
      console.error('   Error details:', error.message);
    } else if (error.code === '23505') {
      console.error('   Duplicate key violation.');
      console.error('   Some data already exists in the database.');
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
loadSampleData().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
