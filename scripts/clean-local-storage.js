#!/usr/bin/env node

/**
 * Clean Local File Storage
 * 
 * This script clears all data from the local JSON file storage used by MDL.
 * It removes metrics, domains (from sample data), and objectives (from sample data).
 * 
 * Usage:
 *   node scripts/clean-local-storage.js
 * 
 * Options:
 *   --confirm   Skip confirmation prompt
 *   --path      Specify custom metrics.json path (default: .mdl/metrics.json)
 * 
 * What gets cleaned:
 *   - .mdl/metrics.json (metrics data)
 *   - examples/sample-domains.json (restored to empty state)
 *   - examples/sample-objectives.json (restored to empty state)
 * 
 * Note: This script will backup existing files before cleaning.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const skipConfirm = args.includes('--confirm');
const customPathIndex = args.indexOf('--path');
const customPath = customPathIndex !== -1 ? args[customPathIndex + 1] : null;

// Default paths
const DEFAULT_METRICS_PATH = '.mdl/metrics.json';
const DOMAINS_PATH = 'examples/sample-domains.json';
const OBJECTIVES_PATH = 'examples/sample-objectives.json';

// Use custom path if provided, otherwise use default
const metricsPath = customPath || DEFAULT_METRICS_PATH;

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

/**
 * Get count of records in a JSON file
 */
function getRecordCount(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data.length;
    } else if (data.metrics && Array.isArray(data.metrics)) {
      return data.metrics.length;
    } else if (data.domains && Array.isArray(data.domains)) {
      return data.domains.length;
    } else if (data.objectives && Array.isArray(data.objectives)) {
      return data.objectives.length;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Create backup of a file
 */
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.backup-${timestamp}`;
  
  try {
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`⚠️  Failed to create backup of ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Clean metrics file
 */
function cleanMetrics(filePath) {
  if (fs.existsSync(filePath)) {
    const backup = backupFile(filePath);
    if (backup) {
      console.log(`   📦 Backup created: ${backup}`);
    }
    fs.writeFileSync(filePath, '[]', 'utf8');
    return true;
  }
  return false;
}

/**
 * Clean domains file (reset to empty array)
 */
function cleanDomains(filePath) {
  if (fs.existsSync(filePath)) {
    const backup = backupFile(filePath);
    if (backup) {
      console.log(`   📦 Backup created: ${backup}`);
    }
    const emptyData = {
      domains: []
    };
    fs.writeFileSync(filePath, JSON.stringify(emptyData, null, 2), 'utf8');
    return true;
  }
  return false;
}

/**
 * Clean objectives file (reset to empty array)
 */
function cleanObjectives(filePath) {
  if (fs.existsSync(filePath)) {
    const backup = backupFile(filePath);
    if (backup) {
      console.log(`   📦 Backup created: ${backup}`);
    }
    const emptyData = {
      objectives: []
    };
    fs.writeFileSync(filePath, JSON.stringify(emptyData, null, 2), 'utf8');
    return true;
  }
  return false;
}

async function cleanLocalStorage() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Clean Local File Storage                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📋 Configuration:');
  console.log(`   Metrics path:    ${metricsPath}`);
  console.log(`   Domains path:    ${DOMAINS_PATH}`);
  console.log(`   Objectives path: ${OBJECTIVES_PATH}`);
  console.log('');

  // Get current record counts
  const metricsCount = getRecordCount(metricsPath);
  const domainsCount = getRecordCount(DOMAINS_PATH);
  const objectivesCount = getRecordCount(OBJECTIVES_PATH);

  console.log('📊 Current storage status:');
  console.log(`   Metrics:    ${metricsCount}`);
  console.log(`   Domains:    ${domainsCount}`);
  console.log(`   Objectives: ${objectivesCount}`);
  console.log('');

  // Check if there's any data to delete
  const totalRecords = metricsCount + domainsCount + objectivesCount;
  
  if (totalRecords === 0) {
    console.log('ℹ️  No data found to delete. Storage is already empty.');
    console.log('');
    return;
  }

  // Warning message
  console.log('⚠️  WARNING: This will DELETE ALL data from local storage!');
  console.log('');
  console.log('   This operation will:');
  console.log(`   - Clear ${metricsCount} metric(s) from ${metricsPath}`);
  console.log(`   - Clear ${domainsCount} domain(s) from ${DOMAINS_PATH}`);
  console.log(`   - Clear ${objectivesCount} objective(s) from ${OBJECTIVES_PATH}`);
  console.log('   - Create backups before deletion');
  console.log('');
  console.log('   Backups will be saved with timestamp suffix for recovery.');
  console.log('');

  // Ask for confirmation unless --confirm flag is provided
  if (!skipConfirm) {
    const confirmed = await askForConfirmation();
    if (!confirmed) {
      console.log('');
      console.log('❌ Operation cancelled by user');
      console.log('');
      process.exit(0);
    }
  } else {
    console.log('✓ Confirmation skipped (--confirm flag provided)');
  }

  console.log('');
  console.log('🧹 Cleaning local storage...');
  console.log('');

  // Clean metrics
  console.log('1️⃣  Cleaning metrics...');
  if (cleanMetrics(metricsPath)) {
    console.log(`   ✅ Metrics cleared from ${metricsPath}`);
  } else {
    console.log(`   ℹ️  No metrics file found at ${metricsPath}`);
  }
  console.log('');

  // Clean domains
  console.log('2️⃣  Cleaning domains...');
  if (cleanDomains(DOMAINS_PATH)) {
    console.log(`   ✅ Domains cleared from ${DOMAINS_PATH}`);
  } else {
    console.log(`   ℹ️  No domains file found at ${DOMAINS_PATH}`);
  }
  console.log('');

  // Clean objectives
  console.log('3️⃣  Cleaning objectives...');
  if (cleanObjectives(OBJECTIVES_PATH)) {
    console.log(`   ✅ Objectives cleared from ${OBJECTIVES_PATH}`);
  } else {
    console.log(`   ℹ️  No objectives file found at ${OBJECTIVES_PATH}`);
  }
  console.log('');

  // Verify cleanup
  console.log('✓ Verification:');
  const newMetricsCount = getRecordCount(metricsPath);
  const newDomainsCount = getRecordCount(DOMAINS_PATH);
  const newObjectivesCount = getRecordCount(OBJECTIVES_PATH);

  console.log(`   Metrics:    ${metricsCount} → ${newMetricsCount}`);
  console.log(`   Domains:    ${domainsCount} → ${newDomainsCount}`);
  console.log(`   Objectives: ${objectivesCount} → ${newObjectivesCount}`);
  console.log('');

  const remainingRecords = newMetricsCount + newDomainsCount + newObjectivesCount;
  
  if (remainingRecords === 0) {
    console.log('✅ Success! All data has been cleared from local storage.');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Backups are available if you need to restore data');
    console.log('   - Use the dashboard to add new metrics, domains, and objectives');
    console.log('   - Or run load scripts to restore sample data');
    console.log('');
  } else {
    console.log('⚠️  Warning: Some data remains after cleanup.');
    console.log(`   ${remainingRecords} record(s) still present.`);
    console.log('');
  }
}

// Run the script
cleanLocalStorage()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error during cleanup:', error.message);
    console.error('');
    if (error.code === 'ENOENT') {
      console.error('💡 This might be a path issue. Check that files exist.');
    } else if (error.code === 'EACCES') {
      console.error('💡 Permission denied. Check file permissions.');
    } else {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  });
