/**
 * Test Data Factories
 * Provides factory functions for creating test data objects
 */

import { v4 as uuidv4 } from 'uuid';
import { DataType, MetricDefinitionInput } from '../../src/models';
import { ApiKey, UserCreateInput, UserRole, UserSafe, UserStatus } from '../../src/models/User';

/**
 * Create a test user with optional overrides
 */
export function createTestUser(overrides: Partial<UserCreateInput> = {}): UserCreateInput {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    username: `testuser${timestamp}${random}`,
    email: `test${timestamp}${random}@example.com`,
    password_hash: '$2a$10$abcdefghijklmnopqrstuv', // Fake bcrypt hash
    full_name: 'Test User',
    role: UserRole.EDITOR,
    status: UserStatus.ACTIVE,
    ...overrides,
  };
}

/**
 * Create a test user (safe version for API responses)
 */
export function createTestUserSafe(overrides: Partial<UserSafe> = {}): UserSafe {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const userId = uuidv4();
  
  return {
    user_id: userId,
    username: `testuser${timestamp}${random}`,
    email: `test${timestamp}${random}@example.com`,
    full_name: 'Test User',
    role: UserRole.EDITOR,
    status: UserStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Create an admin test user
 */
export function createTestAdmin(overrides: Partial<UserCreateInput> = {}): UserCreateInput {
  return createTestUser({
    role: UserRole.ADMIN,
    full_name: 'Test Admin',
    ...overrides,
  });
}

/**
 * Create a viewer test user
 */
export function createTestViewer(overrides: Partial<UserCreateInput> = {}): UserCreateInput {
  return createTestUser({
    role: UserRole.VIEWER,
    full_name: 'Test Viewer',
    ...overrides,
  });
}

/**
 * Create a test metric definition
 */
export function createTestMetric(overrides: Partial<MetricDefinitionInput> = {}): MetricDefinitionInput {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    name: `Test Metric ${timestamp}`,
    description: 'This is a test metric for integration testing',
    category: 'test',
    dataType: DataType.NUMBER,
    unit: 'count',
    tags: ['test', 'automated'],
    ...overrides,
  };
}

/**
 * Create a test domain
 */
export function createTestDomain(overrides: Partial<any> = {}): any {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    domain_id: `test-domain-${timestamp}-${random}`,
    name: `Test Domain ${timestamp}`,
    description: 'A test domain for integration testing',
    owner_team: 'Test Team',
    contact_email: `test${timestamp}@example.com`,
    tier_focus: 'Tier-1',
    key_areas: ['area1', 'area2'],
    color: '#FF5733',
    ...overrides,
  };
}

/**
 * Create a test objective
 */
export function createTestObjective(overrides: Partial<any> = {}): any {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  
  return {
    objective_id: `test-obj-${timestamp}-${random}`,
    title: `Test Objective ${timestamp}`,
    description: 'A test objective for integration testing',
    tier: 'Tier-1',
    owner_team: 'Test Team',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    key_results: [
      {
        kr_id: `kr-${timestamp}-1`,
        description: 'Test KR 1',
        target_value: 100,
        current_value: 50,
        unit: 'count',
      },
    ],
    ...overrides,
  };
}

/**
 * Create a test API key
 */
export function createTestApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  const timestamp = Date.now();
  const keyId = uuidv4();
  const userId = uuidv4();
  
  return {
    key_id: keyId,
    user_id: userId,
    name: `Test API Key ${timestamp}`,
    description: 'Test API key for integration testing',
    key_hash: 'fake-hash-value',
    scopes: ['read', 'write'],
    created_at: new Date(),
    revoked: false,
    ...overrides,
  };
}

/**
 * Create multiple test metrics
 */
export function createTestMetrics(count: number, baseOverrides: Partial<MetricDefinitionInput> = {}): MetricDefinitionInput[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMetric({
      name: `Test Metric ${i + 1}`,
      tags: [`test${i + 1}`, 'automated'],
      ...baseOverrides,
    })
  );
}

/**
 * Create login credentials for a user
 */
export function createTestCredentials(username?: string, password?: string) {
  return {
    username: username || 'testuser',
    password: password || 'Test123!@#',
  };
}

/**
 * Sleep for testing async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a random string for testing
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a test password (valid strength)
 */
export function createTestPassword(): string {
  return 'Test123!@#';
}

/**
 * Create a weak password for testing validation
 */
export function createWeakPassword(): string {
  return 'weak';
}
