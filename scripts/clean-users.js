#!/usr/bin/env node

/**
 * Clean Local users.json File
 * 
 * This script removes:
 * 1. Test user IDs (users with test-related usernames/emails)
 * 2. Expired refresh tokens
 * 3. Revoked refresh tokens
 * 4. Orphaned refresh tokens (tokens for non-existent users)
 * 
 * Usage: node scripts/clean-users.js [--dry-run] [--backup]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const USERS_FILE = path.join(__dirname, '../data/users.json');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

// Test user patterns to remove
const TEST_PATTERNS = [
  /^testuser_/i,
  /^testadmin_/i,
  /^testeditor_/i,
  /^testviewer_/i,
  /^e2euser_/i,
  /^existinguser_/i,
  /^user_\d+$/i,
  /^newuser_/i,
  /^duplicate_/i,
  /^update_test_/i,
  /^role_change_/i,
  /^status_test_/i,
  /^delete_test_/i,
  /^password_change_/i,
  /^invalid_old_pass_/i,
  /^api_test_/i,
  /^refresh_test_/i,
  /^login_test_/i,
  /^delete_api_/i,
  /^update_api_/i,
  /@test\.com$/i,
  /test\d+@example\.com$/i,
];

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const createBackup = args.includes('--backup');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function isTestUser(user) {
  return TEST_PATTERNS.some(pattern => 
    pattern.test(user.username) || pattern.test(user.email)
  );
}

function isTokenExpired(token) {
  return new Date(token.expires_at) < new Date();
}

function isTokenRevoked(token) {
  return token.revoked === true;
}

function backupFile(filePath) {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `users-${timestamp}.json`);
    
    fs.copyFileSync(filePath, backupPath);
    log(`✓ Backup created: ${backupPath}`, colors.green);
    return backupPath;
  } catch (error) {
    log(`✗ Error creating backup: ${error.message}`, colors.red);
    throw error;
  }
}

function cleanUsers() {
  log('\n=== MDL User Data Cleanup Utility ===\n', colors.bright);

  // Check if file exists
  if (!fs.existsSync(USERS_FILE)) {
    log(`✗ Error: users.json not found at ${USERS_FILE}`, colors.red);
    process.exit(1);
  }

  // Read the file
  log(`Reading ${USERS_FILE}...`, colors.cyan);
  let data;
  try {
    const rawData = fs.readFileSync(USERS_FILE, 'utf8');
    data = JSON.parse(rawData);
  } catch (error) {
    log(`✗ Error reading/parsing users.json: ${error.message}`, colors.red);
    process.exit(1);
  }

  const originalUserCount = data.users.length;
  const originalTokenCount = data.refreshTokens?.length || 0;

  log(`\nOriginal counts:`, colors.cyan);
  log(`  Users: ${originalUserCount}`);
  log(`  Refresh Tokens: ${originalTokenCount}`);

  // Identify test users
  const testUsers = data.users.filter(isTestUser);
  const testUserIds = new Set(testUsers.map(u => u.user_id));
  
  log(`\nTest users identified: ${testUsers.length}`, colors.yellow);
  if (testUsers.length > 0 && testUsers.length <= 10) {
    testUsers.forEach(u => {
      log(`  - ${u.username} (${u.email})`, colors.yellow);
    });
  } else if (testUsers.length > 10) {
    testUsers.slice(0, 5).forEach(u => {
      log(`  - ${u.username} (${u.email})`, colors.yellow);
    });
    log(`  ... and ${testUsers.length - 5} more`, colors.yellow);
  }

  // Filter out test users
  const cleanedUsers = data.users.filter(u => !isTestUser(u));
  const removedUserCount = originalUserCount - cleanedUsers.length;

  // Process refresh tokens
  let cleanedTokens = data.refreshTokens || [];
  let expiredCount = 0;
  let revokedCount = 0;
  let orphanedCount = 0;

  if (cleanedTokens.length > 0) {
    const validUserIds = new Set(cleanedUsers.map(u => u.user_id));
    
    cleanedTokens = cleanedTokens.filter(token => {
      // Check if expired
      if (isTokenExpired(token)) {
        expiredCount++;
        return false;
      }
      
      // Check if revoked
      if (isTokenRevoked(token)) {
        revokedCount++;
        return false;
      }
      
      // Check if orphaned (user doesn't exist)
      if (!validUserIds.has(token.user_id)) {
        orphanedCount++;
        return false;
      }
      
      return true;
    });
  }

  const removedTokenCount = originalTokenCount - cleanedTokens.length;

  // Display summary
  log(`\n=== Cleanup Summary ===`, colors.bright);
  log(`\nUsers:`, colors.cyan);
  log(`  Removed: ${removedUserCount}`, removedUserCount > 0 ? colors.red : colors.reset);
  log(`  Remaining: ${cleanedUsers.length}`, colors.green);

  log(`\nRefresh Tokens:`, colors.cyan);
  log(`  Expired: ${expiredCount}`, expiredCount > 0 ? colors.red : colors.reset);
  log(`  Revoked: ${revokedCount}`, revokedCount > 0 ? colors.red : colors.reset);
  log(`  Orphaned: ${orphanedCount}`, orphanedCount > 0 ? colors.red : colors.reset);
  log(`  Total Removed: ${removedTokenCount}`, removedTokenCount > 0 ? colors.red : colors.reset);
  log(`  Remaining: ${cleanedTokens.length}`, colors.green);

  // Show remaining users summary
  const roleCount = {};
  cleanedUsers.forEach(u => {
    roleCount[u.role] = (roleCount[u.role] || 0) + 1;
  });

  log(`\nRemaining users by role:`, colors.cyan);
  Object.entries(roleCount).forEach(([role, count]) => {
    log(`  ${role}: ${count}`, colors.green);
  });

  // Dry run check
  if (dryRun) {
    log(`\n${colors.yellow}DRY RUN MODE - No changes made${colors.reset}`, colors.yellow);
    log(`Run without --dry-run to apply changes`, colors.cyan);
    return;
  }

  // Create backup if requested
  if (createBackup) {
    log(`\nCreating backup...`, colors.cyan);
    backupFile(USERS_FILE);
  }

  // Write cleaned data
  const cleanedData = {
    users: cleanedUsers,
    refreshTokens: cleanedTokens,
  };

  try {
    log(`\nWriting cleaned data to ${USERS_FILE}...`, colors.cyan);
    fs.writeFileSync(USERS_FILE, JSON.stringify(cleanedData, null, 2), 'utf8');
    log(`✓ File cleaned successfully!`, colors.green);
  } catch (error) {
    log(`✗ Error writing file: ${error.message}`, colors.red);
    process.exit(1);
  }

  log(`\n=== Cleanup Complete ===\n`, colors.bright + colors.green);
}

// Run the cleanup
try {
  cleanUsers();
} catch (error) {
  log(`\n✗ Unexpected error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
}
