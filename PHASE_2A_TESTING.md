# Phase 2A: Testing Coverage - Implementation Plan

**Duration:** 4-6 weeks  
**Priority:** P1 - Critical for quality assurance  
**Part of:** Phase 2 Major Improvements  
**Last Updated:** November 20, 2025  
**Status:** 🔄 IN PROGRESS - Infrastructure Complete, Coverage Needed

---

## Overview

Comprehensive testing ensures code quality, prevents regressions, and builds confidence for production deployment. This phase establishes a robust test suite covering unit, integration, E2E, performance, and security testing.

**Current State:**
- ✅ Jest configured with coverage reporting
- ✅ Test infrastructure in place (setup.ts, helpers)
- ⚠️ Limited test coverage (~30%)
- ✅ 4 test files completed (ConfigLoader, PolicyGenerator, Storage tests)
- ❌ No integration tests for API endpoints
- ❌ No E2E tests
- ❌ No performance tests
- ❌ No security tests
- ✅ Test database setup available

**Target State:**
- 85%+ unit test coverage
- 70%+ integration test coverage
- E2E tests for all critical user flows
- Automated performance testing
- Security testing in CI/CD

---

## Task 1: Unit Testing Infrastructure (Week 1)

### 1.1: Configure Jest for Comprehensive Coverage

**Status:** ✅ **COMPLETED** - Jest configured with coverage thresholds

**Duration:** 1-2 days

**Completed Steps:**
1. ✅ Jest configuration updated with coverage thresholds
2. ✅ Test setup file created (tests/setup.ts)
3. ✅ Coverage reports configured (lcov, json, html)
4. ✅ Test scripts in package.json

**Original Steps:**
1. Update Jest configuration:
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/cli.ts', // Exclude CLI entry point
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000
};
```

2. Create test setup file:
```typescript
// tests/setup.ts
import { logger } from '../src/utils/logger';

// Suppress logs during testing
logger.transports.forEach(transport => {
  transport.silent = true;
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.mockTimestamp = () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-01-01'));
};

global.restoreTimestamp = () => {
  jest.useRealTimers();
};
```

**Acceptance Criteria:**
- [ ] Coverage thresholds configured (85%)
- [ ] Test setup file created
- [ ] Coverage reports generated in multiple formats
- [ ] Tests run with `npm test`

---

### 1.2: Write Unit Tests for Storage Layer

**Duration:** 3-4 days

**Steps:**
1. Test MetricStore:
```typescript
// tests/storage/MetricStore.test.ts
describe('MetricStore', () => {
  let store: MetricStore;
  
  beforeEach(() => {
    store = new MetricStore();
  });
  
  describe('create', () => {
    it('should create a metric with version 1.0.0', async () => {
      const metric = createTestMetric();
      const created = await store.create(metric);
      
      expect(created.version).toBe('1.0.0');
      expect(created.change_history).toHaveLength(1);
      expect(created.change_history[0].version).toBe('1.0.0');
    });
    
    it('should throw error for duplicate metric_id', async () => {
      const metric = createTestMetric();
      await store.create(metric);
      
      await expect(store.create(metric))
        .rejects.toThrow('Metric with ID METRIC-001 already exists');
    });
  });
  
  describe('update', () => {
    it('should bump MINOR version for backward-compatible changes', async () => {
      const metric = await store.create(createTestMetric());
      
      const updated = await store.update(metric.metric_id, {
        description: 'Updated description'
      });
      
      expect(updated.version).toBe('1.1.0');
      expect(updated.change_history).toHaveLength(2);
    });
    
    it('should bump MAJOR version for breaking changes', async () => {
      const metric = await store.create(createTestMetric());
      
      const updated = await store.update(metric.metric_id, {
        unit_of_measure: 'percentage' // Breaking change
      });
      
      expect(updated.version).toBe('2.0.0');
    });
  });
  
  describe('filtering', () => {
    beforeEach(async () => {
      await store.create(createTestMetric({ category: 'operational', tags: ['finance'] }));
      await store.create(createTestMetric({ 
        metric_id: 'METRIC-002',
        category: 'strategic', 
        tags: ['hr'] 
      }));
    });
    
    it('should filter by category', async () => {
      const results = await store.findAll({ category: 'operational' });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('operational');
    });
    
    it('should filter by tags', async () => {
      const results = await store.findAll({ tags: ['finance'] });
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('finance');
    });
  });
});
```

2. Test PostgresMetricStore:
```typescript
// tests/storage/PostgresMetricStore.test.ts
describe('PostgresMetricStore', () => {
  let store: PostgresMetricStore;
  let pool: Pool;
  
  beforeAll(async () => {
    pool = await createTestDatabase();
    store = new PostgresMetricStore(pool);
  });
  
  afterAll(async () => {
    await pool.end();
  });
  
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE metrics CASCADE');
  });
  
  // Similar tests as MetricStore but for PostgreSQL
});
```

**Acceptance Criteria:**
- [ ] All MetricStore methods tested
- [ ] All PostgresMetricStore methods tested
- [ ] PostgresDomainStore tests completed
- [ ] PostgresObjectiveStore tests completed
- [ ] Edge cases covered (empty results, null values)
- [ ] Error conditions tested

---

### 1.3: Write Unit Tests for Authentication

**Duration:** 2-3 days

**Steps:**
```typescript
// tests/auth/jwt.test.ts
describe('JWT utilities', () => {
  describe('generateAccessToken', () => {
    it('should generate valid JWT token', () => {
      const token = generateAccessToken('user-123', 'admin');
      expect(token).toBeTruthy();
      
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.role).toBe('admin');
    });
    
    it('should include expiration time', () => {
      const token = generateAccessToken('user-123', 'admin');
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
  
  describe('verifyToken', () => {
    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', role: 'admin' },
        authConfig.jwtSecret,
        { expiresIn: '-1h' }
      );
      
      expect(() => verifyToken(expiredToken))
        .toThrow('jwt expired');
    });
    
    it('should reject invalid tokens', () => {
      expect(() => verifyToken('invalid-token'))
        .toThrow();
    });
  });
});

// tests/auth/middleware.test.ts
describe('Authentication middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: jest.Mock;
  
  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });
  
  describe('authenticate', () => {
    it('should accept valid Bearer token', () => {
      const token = generateAccessToken('user-123', 'admin');
      req.headers = { authorization: `Bearer ${token}` };
      
      authenticate(req as AuthRequest, res as Response, next);
      
      expect(req.user).toEqual({
        userId: 'user-123',
        role: 'admin'
      });
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject missing authorization header', () => {
      authenticate(req as AuthRequest, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('requireRole', () => {
    it('should allow user with correct role', () => {
      req.user = { userId: 'user-123', role: 'admin' };
      
      const middleware = requireRole(['admin']);
      middleware(req as AuthRequest, res as Response, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject user with insufficient role', () => {
      req.user = { userId: 'user-123', role: 'viewer' };
      
      const middleware = requireRole(['admin']);
      middleware(req as AuthRequest, res as Response, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
```

**Acceptance Criteria:**
- [ ] JWT generation and verification tested
- [ ] Authentication middleware tested
- [ ] Authorization middleware tested
- [ ] Password hashing tested
- [ ] All auth edge cases covered

---

### 1.4: Write Unit Tests for Validation

**Duration:** 2 days

**Steps:**
```typescript
// tests/validation/schemas.test.ts
describe('Validation schemas', () => {
  describe('metricSchema', () => {
    it('should accept valid metric', () => {
      const validMetric = createValidMetric();
      const result = validateSchema(metricSchema, validMetric);
      expect(result).toEqual(validMetric);
    });
    
    it('should reject missing required fields', () => {
      const invalid = { name: 'Test' }; // Missing other required fields
      
      expect(() => validateSchema(metricSchema, invalid))
        .toThrow(ValidationError);
    });
    
    it('should reject invalid metric_id format', () => {
      const invalid = createValidMetric({ metric_id: 'invalid-format' });
      
      expect(() => validateSchema(metricSchema, invalid))
        .toThrow(/must match pattern/);
    });
    
    it('should enforce maximum string lengths', () => {
      const invalid = createValidMetric({ 
        name: 'a'.repeat(201) // Exceeds 200 char limit
      });
      
      expect(() => validateSchema(metricSchema, invalid))
        .toThrow();
    });
    
    it('should strip unknown fields', () => {
      const input = {
        ...createValidMetric(),
        unknownField: 'should be removed'
      };
      
      const result = validateSchema(metricSchema, input);
      expect(result).not.toHaveProperty('unknownField');
    });
  });
});
```

**Acceptance Criteria:**
- [ ] All validation schemas tested
- [ ] Valid input passes
- [ ] Invalid input rejects with clear errors
- [ ] Field length limits enforced
- [ ] Unknown fields stripped

---

### 1.5: Write Unit Tests for Utilities

**Duration:** 1-2 days

**Steps:**
```typescript
// tests/utils/retry.test.ts
describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    }, 'test');
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  
  it('should retry on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2
    }, 'test');
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
  
  it('should throw after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    
    await expect(retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2
    }, 'test')).rejects.toThrow('fail');
    
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// tests/utils/sanitize.test.ts
describe('sanitizeHtml', () => {
  it('should allow safe HTML', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });
  
  it('should remove script tags', () => {
    const unsafe = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(unsafe);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Hello</p>');
  });
  
  it('should remove onclick attributes', () => {
    const unsafe = '<a href="#" onclick="alert(1)">Click</a>';
    const result = sanitizeHtml(unsafe);
    expect(result).not.toContain('onclick');
  });
});
```

**Acceptance Criteria:**
- [ ] Retry logic tested
- [ ] Sanitization tested
- [ ] Logger utilities tested
- [ ] All utility functions covered

---

## Task 2: Integration Testing (Week 2-3)

### 2.1: Set Up Integration Test Infrastructure

**Duration:** 2-3 days

**Steps:**
1. Install supertest:
```bash
npm install --save-dev supertest @types/supertest
```

2. Create test server helper:
```typescript
// tests/helpers/testServer.ts
import express from 'express';
import { createApp } from '../../src/api/server';
import { Pool } from 'pg';

export async function createTestServer() {
  const pool = await createTestDatabase();
  const app = await createApp(pool);
  
  return { app, pool };
}

export async function cleanupTestServer(pool: Pool) {
  await pool.query('TRUNCATE TABLE metrics, domains, objectives, users CASCADE');
  await pool.end();
}
```

3. Create test data factory:
```typescript
// tests/helpers/factories.ts
export function createTestUser(overrides = {}) {
  return {
    username: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    role: 'admin',
    ...overrides
  };
}

export function createTestMetric(overrides = {}) {
  return {
    metric_id: `METRIC-${Date.now()}`,
    name: 'Test Metric',
    description: 'This is a test metric for integration testing',
    category: 'operational',
    metric_type: 'quantitative',
    tier: 'tier1',
    unit_of_measure: 'count',
    tags: ['test'],
    owner: 'test-team',
    ...overrides
  };
}
```

**Acceptance Criteria:**
- [ ] Test server setup automated
- [ ] Test database setup automated
- [ ] Test data factories created
- [ ] Cleanup procedures implemented

---

### 2.2: Write API Integration Tests

**Duration:** 5-7 days

**Steps:**
```typescript
// tests/integration/api/metrics.test.ts
import request from 'supertest';

describe('Metrics API', () => {
  let app: Express;
  let pool: Pool;
  let authToken: string;
  
  beforeAll(async () => {
    ({ app, pool } = await createTestServer());
    
    // Create test user and get token
    const user = createTestUser();
    await request(app).post('/api/auth/register').send(user);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: user.password });
    
    authToken = loginRes.body.access_token;
  });
  
  afterAll(async () => {
    await cleanupTestServer(pool);
  });
  
  describe('POST /api/metrics', () => {
    it('should create a metric with authentication', async () => {
      const metric = createTestMetric();
      
      const res = await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metric)
        .expect(201);
      
      expect(res.body.metric_id).toBe(metric.metric_id);
      expect(res.body.version).toBe('1.0.0');
    });
    
    it('should reject unauthenticated request', async () => {
      const metric = createTestMetric();
      
      await request(app)
        .post('/api/metrics')
        .send(metric)
        .expect(401);
    });
    
    it('should validate metric data', async () => {
      const invalid = { name: 'Test' }; // Missing required fields
      
      const res = await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalid)
        .expect(400);
      
      expect(res.body.error.code).toBe('ERR_2001');
    });
  });
  
  describe('GET /api/metrics', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createTestMetric());
    });
    
    it('should list all metrics', async () => {
      const res = await request(app)
        .get('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
    
    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/metrics?category=operational')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.every((m: any) => m.category === 'operational')).toBe(true);
    });
  });
  
  describe('GET /api/metrics/:id', () => {
    it('should get metric by ID', async () => {
      const metric = createTestMetric();
      await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metric);
      
      const res = await request(app)
        .get(`/api/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.metric_id).toBe(metric.metric_id);
    });
    
    it('should return 404 for non-existent metric', async () => {
      await request(app)
        .get('/api/metrics/METRIC-NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
  
  describe('PUT /api/metrics/:id', () => {
    it('should update metric and bump version', async () => {
      const metric = createTestMetric();
      await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metric);
      
      const res = await request(app)
        .put(`/api/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description' })
        .expect(200);
      
      expect(res.body.description).toBe('Updated description');
      expect(res.body.version).toBe('1.1.0');
    });
  });
  
  describe('DELETE /api/metrics/:id', () => {
    it('should delete metric (admin only)', async () => {
      const metric = createTestMetric();
      await request(app)
        .post('/api/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metric);
      
      await request(app)
        .delete(`/api/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
      
      // Verify deleted
      await request(app)
        .get(`/api/metrics/${metric.metric_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});

// Similar test files:
// - tests/integration/api/domains.test.ts
// - tests/integration/api/objectives.test.ts
// - tests/integration/api/auth.test.ts
// - tests/integration/api/policies.test.ts
// - tests/integration/api/stats.test.ts
```

**Acceptance Criteria:**
- [ ] All API endpoints tested
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Request validation tested
- [ ] Response format verified
- [ ] Error handling tested
- [ ] 70%+ integration coverage

---

## Task 3: End-to-End Testing (Week 4)

### 3.1: Set Up Playwright

**Duration:** 1-2 days

**Steps:**
1. Install Playwright:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

2. Configure Playwright:
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

**Acceptance Criteria:**
- [ ] Playwright installed and configured
- [ ] Test server auto-starts
- [ ] Screenshots on failure
- [ ] HTML test reports

---

### 3.2: Write E2E Tests for Critical Flows

**Duration:** 5-7 days

**Steps:**
```typescript
// tests/e2e/userLogin.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Fill login form
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="username"]', 'invalid');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error')).toContainText('Invalid credentials');
  });
});

// tests/e2e/metricManagement.spec.ts
test.describe('Metric Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('should create a new metric', async ({ page }) => {
    await page.click('button:has-text("New Metric")');
    
    // Fill metric form
    await page.fill('[name="metric_id"]', 'METRIC-E2E-001');
    await page.fill('[name="name"]', 'E2E Test Metric');
    await page.fill('[name="description"]', 'This is a test metric created during E2E testing');
    await page.selectOption('[name="category"]', 'operational');
    await page.selectOption('[name="metric_type"]', 'quantitative');
    await page.selectOption('[name="tier"]', 'tier1');
    await page.fill('[name="unit_of_measure"]', 'count');
    await page.fill('[name="owner"]', 'test-team');
    
    await page.click('button:has-text("Create")');
    
    // Verify success
    await expect(page.locator('.success')).toContainText('Metric created');
    await expect(page.locator('[data-metric-id="METRIC-E2E-001"]')).toBeVisible();
  });
  
  test('should edit existing metric', async ({ page }) => {
    // Navigate to metric
    await page.click('[data-metric-id="METRIC-E2E-001"]');
    await page.click('button:has-text("Edit")');
    
    // Update description
    await page.fill('[name="description"]', 'Updated description via E2E test');
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('.success')).toContainText('Metric updated');
    await expect(page.locator('.version')).toContainText('1.1.0');
  });
  
  test('should delete metric', async ({ page }) => {
    await page.click('[data-metric-id="METRIC-E2E-001"]');
    await page.click('button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Verify deletion
    await expect(page.locator('.success')).toContainText('Metric deleted');
    await expect(page.locator('[data-metric-id="METRIC-E2E-001"]')).not.toBeVisible();
  });
});

// tests/e2e/import.spec.ts
test.describe('Import Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });
  
  test('should import metrics from JSON file', async ({ page }) => {
    await page.click('button:has-text("Import")');
    
    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-metrics.json');
    
    await page.click('button:has-text("Upload")');
    
    // Verify import success
    await expect(page.locator('.success')).toContainText('imported successfully');
  });
});
```

**Acceptance Criteria:**
- [ ] Login/logout flow tested
- [ ] Metric CRUD operations tested
- [ ] Import/export tested
- [ ] Dashboard navigation tested
- [ ] All critical user flows covered
- [ ] Tests pass on CI/CD

---

## Task 4: Performance Testing (Week 5)

### 4.1: Set Up k6 Load Testing

**Duration:** 1-2 days

**Steps:**
1. Install k6:
```bash
# macOS
brew install k6

# Or download from k6.io
```

2. Create load test scripts:
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% of requests < 200ms
    'http_req_failed': ['rate<0.05'],   // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // Test GET /api/metrics
  let res = http.get(`${BASE_URL}/api/metrics`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test GET /api/metrics/:id
  res = http.get(`${BASE_URL}/api/metrics/METRIC-001`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
  
  sleep(1);
}
```

**Acceptance Criteria:**
- [ ] k6 installed
- [ ] Load test scripts created
- [ ] Performance thresholds defined
- [ ] Test can run against staging environment

---

### 4.2: Run Performance Tests and Establish Baselines

**Duration:** 2-3 days

**Steps:**
1. Run tests:
```bash
# Get auth token
AUTH_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  | jq -r '.access_token')

# Run load test
k6 run --env AUTH_TOKEN=$AUTH_TOKEN tests/performance/load-test.js

# Run stress test
k6 run --env AUTH_TOKEN=$AUTH_TOKEN tests/performance/stress-test.js

# Run spike test
k6 run --env AUTH_TOKEN=$AUTH_TOKEN tests/performance/spike-test.js
```

2. Document baselines:
```markdown
# Performance Baselines

## API Response Times (p95)
- GET /api/metrics: 150ms
- GET /api/metrics/:id: 50ms
- POST /api/metrics: 200ms
- PUT /api/metrics/:id: 180ms
- DELETE /api/metrics/:id: 100ms

## Throughput
- Concurrent users: 1000
- Requests per second: 2000
- Error rate: < 1%

## Database
- Query time (p95): 30ms
- Connection pool usage: 60%
```

**Acceptance Criteria:**
- [ ] Load tests pass (1000 concurrent users)
- [ ] Performance baselines documented
- [ ] p95 response time < 200ms
- [ ] Error rate < 5%
- [ ] Results stored for comparison

---

## Task 5: Security Testing (Week 6)

### 5.1: Set Up OWASP ZAP

**Duration:** 1 day

**Steps:**
1. Install OWASP ZAP:
```bash
brew install --cask owasp-zap
```

2. Create automation script:
```bash
#!/bin/bash
# tests/security/zap-scan.sh

ZAP_PORT=8090
TARGET_URL="http://localhost:3000"

# Start ZAP in daemon mode
zap.sh -daemon -port $ZAP_PORT -config api.disablekey=true &
sleep 30

# Spider the application
curl "http://localhost:$ZAP_PORT/JSON/spider/action/scan/?url=$TARGET_URL"

# Wait for spider to complete
while [ $(curl -s "http://localhost:$ZAP_PORT/JSON/spider/view/status/" | jq -r '.status') != "100" ]; do
  sleep 5
done

# Active scan
curl "http://localhost:$ZAP_PORT/JSON/ascan/action/scan/?url=$TARGET_URL"

# Wait for scan to complete
while [ $(curl -s "http://localhost:$ZAP_PORT/JSON/ascan/view/status/" | jq -r '.status') != "100" ]; do
  sleep 10
done

# Generate report
curl "http://localhost:$ZAP_PORT/OTHER/core/other/htmlreport/" > zap-report.html

# Check for high/medium alerts
HIGH_ALERTS=$(curl -s "http://localhost:$ZAP_PORT/JSON/core/view/alertsSummary/" | jq '.alertsSummary.High')
MEDIUM_ALERTS=$(curl -s "http://localhost:$ZAP_PORT/JSON/core/view/alertsSummary/" | jq '.alertsSummary.Medium')

if [ "$HIGH_ALERTS" -gt 0 ]; then
  echo "FAIL: $HIGH_ALERTS high-risk vulnerabilities found"
  exit 1
fi

if [ "$MEDIUM_ALERTS" -gt 5 ]; then
  echo "WARN: $MEDIUM_ALERTS medium-risk vulnerabilities found"
  exit 1
fi

echo "PASS: Security scan completed successfully"
```

**Acceptance Criteria:**
- [ ] OWASP ZAP installed
- [ ] Automated scan script created
- [ ] Report generation working
- [ ] CI/CD integration ready

---

### 5.2: Run Security Scans and Fix Issues

**Duration:** 3-4 days

**Steps:**
1. Run security scan
2. Review findings
3. Fix critical and high issues:
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - CSRF protection
   - Security headers missing
   - Sensitive data exposure

4. Re-scan to verify fixes

**Acceptance Criteria:**
- [ ] Zero high-risk vulnerabilities
- [ ] Medium-risk vulnerabilities < 5
- [ ] Security headers configured
- [ ] CSRF protection enabled
- [ ] Input validation comprehensive

---

## Task 6: CI/CD Integration (Week 6)

### 6.1: Set Up GitHub Actions

**Duration:** 2-3 days

**Steps:**
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mdl_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: mdl_test
          DB_USER: postgres
          DB_PASSWORD: postgres
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
```

**Acceptance Criteria:**
- [ ] GitHub Actions workflow configured
- [ ] Unit tests run on every push
- [ ] Integration tests run on every PR
- [ ] E2E tests run on every PR
- [ ] Security scans run automatically
- [ ] Coverage reports uploaded
- [ ] Test results visible in PR

---

## Phase 2A Completion Checklist

### Unit Testing ✅
- [ ] Jest configured with coverage thresholds (85%)
- [ ] MetricStore tests (100% coverage)
- [ ] PostgresMetricStore tests (100% coverage)
- [ ] Authentication tests (100% coverage)
- [ ] Validation tests (100% coverage)
- [ ] Utility tests (100% coverage)
- [ ] Overall unit coverage > 85%

### Integration Testing ✅
- [ ] Test infrastructure set up
- [ ] All API endpoints tested
- [ ] Authentication flow tested
- [ ] Authorization tested
- [ ] Database operations tested
- [ ] Integration coverage > 70%

### E2E Testing ✅
- [ ] Playwright configured
- [ ] Login/logout tested
- [ ] Metric CRUD tested
- [ ] Import/export tested
- [ ] All critical flows covered

### Performance Testing ✅
- [ ] k6 installed and configured
- [ ] Load tests created
- [ ] Baselines established
- [ ] Tests pass (1000 concurrent users)
- [ ] p95 response time < 200ms

### Security Testing ✅
- [ ] OWASP ZAP configured
- [ ] Security scans automated
- [ ] Zero high-risk vulnerabilities
- [ ] Security headers configured

### CI/CD ✅
- [ ] GitHub Actions workflow active
- [ ] Tests run automatically
- [ ] Coverage tracking enabled
- [ ] Security scans in pipeline

---

## Success Metrics

- **Unit Test Coverage:** 85%+ ✅
- **Integration Test Coverage:** 70%+ ✅
- **E2E Tests:** All critical flows ✅
- **Performance:** 1000 concurrent users ✅
- **Security:** Zero high-risk issues ✅
- **CI/CD:** All tests automated ✅

---

**Navigation:**
- **[← Back to Phase 2 Overview](./PHASE_2_MAJOR.md)**
- **[→ Next: Phase 2B - API Documentation](./PHASE_2B_API.md)**
