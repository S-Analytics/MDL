/**
 * Test Server Helper
 * 
 * Creates an Express app instance for integration testing without starting
 * an actual HTTP server. This allows supertest to test the API endpoints
 * without port conflicts or network overhead.
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createServer } from '../../src/api';
import { FileUserStore } from '../../src/auth/FileUserStore';
import { InMemoryMetricStore } from '../../src/storage';
import { IMetricStore } from '../../src/storage/MetricStore';
// Logger is already silenced in tests/setup.ts

export interface TestServerOptions {
  authEnabled?: boolean;
  storage?: IMetricStore;
  userStore?: FileUserStore;
}

/**
 * Creates a test instance of the Express app
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<express.Application> {
  const {
    authEnabled = true,
    storage = new InMemoryMetricStore(':memory:'),
    userStore,
  } = options;

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.AUTH_ENABLED = authEnabled ? 'true' : 'false';
  process.env.ENABLE_CACHE = 'false'; // Disable caching in tests to avoid stale data

  // Create user store for auth testing
  let testUserStore = userStore;
  if (authEnabled && !testUserStore) {
    const testAuthFile = path.join(process.cwd(), 'data', 'test-users.json');
    
    // Ensure directory exists
    const dir = path.dirname(testAuthFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create empty auth file
    fs.writeFileSync(testAuthFile, JSON.stringify({
      users: [],
      refreshTokens: [],
      apiKeys: [],
    }));
    
    testUserStore = new FileUserStore(testAuthFile);
    await testUserStore.initialize();
  }

  // Create Express app with proper config
  const app = createServer(storage, {
    enableAuth: authEnabled,
    userStore: testUserStore,
  });

  return app;
}

/**
 * Clean up test resources
 */
export function cleanupTestServer() {
  const testAuthFile = path.join(process.cwd(), 'data', 'test-users.json');
  
  if (fs.existsSync(testAuthFile)) {
    try {
      fs.unlinkSync(testAuthFile);
    } catch (error) {
      // Ignore cleanup errors in tests - file may not exist
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.warn('Failed to cleanup test auth file:', error);
      }
    }
  }
}

/**
 * Create a test user and return auth token
 */
export async function createTestUserWithToken(
  userStore: FileUserStore,
  userData: {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    full_name?: string;
  } = {}
): Promise<{ userId: string; token: string; refreshToken: string }> {
  const { hashPassword, generateAuthTokens, hashRefreshToken } = await import('../../src/auth/jwt');
  const { UserRole } = await import('../../src/models/User');

  const username = userData.username || 'testuser';
  const email = userData.email || 'test@example.com';
  const password = userData.password || 'Test123!';
  const role = (userData.role || UserRole.EDITOR) as typeof UserRole[keyof typeof UserRole];
  const full_name = userData.full_name || 'Test User';

  const passwordHash = await hashPassword(password);

  const user = await userStore.create({
    username,
    email,
    password_hash: passwordHash,
    full_name,
    role,
  });

  const tokens = await generateAuthTokens(user);
  
  // Save refresh token to store (required for token refresh to work)
  const refreshTokenRecord = {
    token_id: tokens.token_id,
    user_id: user.user_id,
    token_hash: hashRefreshToken(tokens.refresh_token),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    created_at: new Date(),
    revoked: false,
  };
  await userStore.saveRefreshToken(user.user_id, refreshTokenRecord);

  return {
    userId: user.user_id,
    token: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}

/**
 * Create admin user for testing
 */
export async function createAdminUser(
  userStore: FileUserStore
): Promise<{ userId: string; token: string; refreshToken: string }> {
  const { UserRole } = await import('../../src/models/User');
  
  return createTestUserWithToken(userStore, {
    username: 'admin',
    email: 'admin@test.com',
    password: 'Admin123!',
    role: UserRole.ADMIN,
    full_name: 'Admin User',
  });
}

/**
 * Create viewer user for testing
 */
export async function createViewerUser(
  userStore: FileUserStore
): Promise<{ userId: string; token: string; refreshToken: string }> {
  const { UserRole } = await import('../../src/models/User');
  
  return createTestUserWithToken(userStore, {
    username: 'viewer',
    email: 'viewer@test.com',
    password: 'Viewer123!',
    role: UserRole.VIEWER,
    full_name: 'Viewer User',
  });
}
