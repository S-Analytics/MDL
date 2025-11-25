# End-to-End Testing Plan - MDL Application

**Status:** ⚠️ **BLOCKED - Requires Frontend UI**  
**Infrastructure Status:** ✅ Complete (Playwright configured, tests written)  
**Duration:** 2-3 weeks (once frontend is available)  
**Priority:** P2 - Deferred pending frontend development  
**Last Updated:** November 20, 2025  

---

## ⚠️ Important Notice

**MDL currently has no web frontend UI.** E2E UI testing cannot proceed until a web interface is built. 

- **Infrastructure:** ✅ 100% Complete (Playwright, config, fixtures, tests all ready)
- **Test Code:** ✅ 16 E2E tests written and ready to run
- **Blocker:** ❌ No HTML pages, forms, or UI to test
- **See:** [E2E_STATUS.md](./E2E_STATUS.md) for detailed explanation

**This plan is ready for immediate use once MDL's frontend is developed.**

---

## Overview

End-to-End (E2E) testing validates complete user workflows from the browser perspective, ensuring all components work together seamlessly. This plan establishes comprehensive E2E test coverage using Playwright for the MDL application.

**Prerequisites:** ✅ **COMPLETED**
- ✅ Unit tests: 352 passing, 88.53% coverage
- ✅ Integration tests: 37/37 passing (100%)
- ✅ API endpoints stable and tested
- ✅ Authentication flows validated

**Goals:**
- Test all critical user workflows
- Validate UI/API integration
- Ensure authentication and authorization work end-to-end
- Catch integration issues between frontend and backend
- Provide confidence for production deployment

---

## Task 1: Setup E2E Testing Infrastructure (Days 1-2)

### 1.1: Install Playwright

**Duration:** 2-3 hours

**Steps:**

1. **Install Playwright and dependencies:**
```bash
npm install --save-dev @playwright/test
npx playwright install

# Install browsers (chromium, firefox, webkit)
npx playwright install --with-deps
```

2. **Create Playwright configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if tests.only is present
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Workers for parallel execution
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list']
  ],
  
  // Shared settings for all tests
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Collect console logs and network activity
    launchOptions: {
      slowMo: process.env.SLOW_MO ? 100 : 0
    }
  },
  
  // Auto-start the dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe'
  },
  
  // Configure projects for multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

3. **Create test utilities:**
```typescript
// tests/e2e/helpers/fixtures.ts
import { test as base } from '@playwright/test';

// Extend base test with custom fixtures
export const test = base.extend({
  // Auto-authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');
    
    // Login with admin credentials
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
  
  // Test user with specific role
  userWithRole: async ({ page }, use, testInfo) => {
    const role = testInfo.project.name || 'viewer';
    
    await page.goto('/login');
    await page.fill('[name="username"]', `test-${role}`);
    await page.fill('[name="password"]', `Test${role}123!`);
    await page.click('button[type="submit"]');
    
    await use(page);
  }
});

export { expect } from '@playwright/test';
```

4. **Update package.json scripts:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:chrome": "playwright test --project=chromium"
  }
}
```

**Acceptance Criteria:**
- ✅ Playwright installed and configured
- ✅ Multiple browsers configured (Chrome, Firefox, Safari)
- ✅ Test server auto-starts before tests
- ✅ Screenshots and videos on failure
- ✅ HTML and JSON reporters configured
- ✅ Custom fixtures for authentication

---

## Task 2: Critical User Flow Tests (Days 3-7)

### 2.1: Authentication Flows

**Duration:** 1 day

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('User Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'Admin123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Should display user info
    await expect(page.locator('[data-testid="user-name"]')).toContainText('admin');
    
    // Should show logout button
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="username"]', 'invalid');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid username or password');
    
    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });
  
  test('should logout successfully', async ({ authenticatedPage: page }) => {
    // Already authenticated via fixture
    await expect(page).toHaveURL('/dashboard');
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect back to login
    await expect(page).toHaveURL('/login');
  });
  
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected page
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
  
  test('should persist session after page reload', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/dashboard');
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });
});

// tests/e2e/auth/registration.spec.ts
test.describe('User Registration', () => {
  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    const timestamp = Date.now();
    await page.fill('[name="username"]', `testuser${timestamp}`);
    await page.fill('[name="email"]', `test${timestamp}@example.com`);
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });
  
  test('should validate password strength', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'weak');
    
    // Should show password strength indicator
    await expect(page.locator('[data-testid="password-strength"]'))
      .toContainText('weak', { ignoreCase: true });
  });
});
```

### 2.2: Metric Management Flows

**Duration:** 2-3 days

```typescript
// tests/e2e/metrics/crud.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('Metric Management', () => {
  test('should create a new metric', async ({ authenticatedPage: page }) => {
    // Navigate to metrics page
    await page.click('a:has-text("Metrics")');
    await expect(page).toHaveURL('/metrics');
    
    // Click new metric button
    await page.click('button:has-text("New Metric")');
    
    // Fill metric form
    await page.fill('[name="name"]', 'Test Metric E2E');
    await page.fill('[name="short_name"]', 'test_metric_e2e');
    await page.fill('[name="description"]', 'E2E test metric');
    await page.selectOption('[name="category"]', 'business');
    await page.selectOption('[name="tier"]', 'Tier-1');
    await page.fill('[name="business_domain"]', 'Testing');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Metric created successfully');
    
    // Should redirect to metric detail page or list
    await expect(page).toHaveURL(/\/metrics\/.*/);
    
    // Should display the new metric
    await expect(page.locator('h1')).toContainText('Test Metric E2E');
  });
  
  test('should list all metrics', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Should show metrics table
    await expect(page.locator('[data-testid="metrics-table"]')).toBeVisible();
    
    // Should have table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Category")')).toBeVisible();
    await expect(page.locator('th:has-text("Tier")')).toBeVisible();
  });
  
  test('should filter metrics by category', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Select category filter
    await page.selectOption('[data-testid="category-filter"]', 'business');
    
    // Wait for table to update
    await page.waitForTimeout(500);
    
    // All visible metrics should have business category
    const categoryBadges = page.locator('[data-testid="metric-category"]');
    const count = await categoryBadges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(categoryBadges.nth(i)).toContainText('business');
    }
  });
  
  test('should search metrics', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'revenue');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Should only show metrics matching search
    const metricNames = page.locator('[data-testid="metric-name"]');
    const count = await metricNames.count();
    
    for (let i = 0; i < count; i++) {
      const text = await metricNames.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('revenue');
    }
  });
  
  test('should view metric details', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Click on first metric
    await page.click('[data-testid="metric-row"]:first-child');
    
    // Should navigate to detail page
    await expect(page).toHaveURL(/\/metrics\/METRIC-.*/);
    
    // Should display metric information
    await expect(page.locator('[data-testid="metric-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-category"]')).toBeVisible();
  });
  
  test('should edit metric', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Click on first metric
    await page.click('[data-testid="metric-row"]:first-child');
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Update description
    const newDescription = `Updated at ${Date.now()}`;
    await page.fill('[name="description"]', newDescription);
    
    // Save changes
    await page.click('button:has-text("Save")');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Metric updated');
    
    // Should display updated description
    await expect(page.locator('[data-testid="metric-description"]'))
      .toContainText(newDescription);
  });
  
  test('should delete metric', async ({ authenticatedPage: page }) => {
    // First create a metric to delete
    await page.goto('/metrics/new');
    
    const metricName = `Delete Test ${Date.now()}`;
    await page.fill('[name="name"]', metricName);
    await page.fill('[name="short_name"]', 'delete_test');
    await page.fill('[name="description"]', 'To be deleted');
    await page.selectOption('[name="category"]', 'business');
    await page.click('button[type="submit"]');
    
    // Navigate to metric detail
    await page.waitForURL(/\/metrics\/.*/);
    
    // Click delete button
    await page.click('button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Should redirect to metrics list
    await expect(page).toHaveURL('/metrics');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Metric deleted');
    
    // Should not find the deleted metric
    await expect(page.locator(`text=${metricName}`)).not.toBeVisible();
  });
});

// tests/e2e/metrics/validation.spec.ts
test.describe('Metric Validation', () => {
  test('should validate required fields', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics/new');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="error-name"]'))
      .toContainText('required', { ignoreCase: true });
    await expect(page.locator('[data-testid="error-category"]'))
      .toContainText('required', { ignoreCase: true });
  });
  
  test('should validate metric ID format', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics/new');
    
    await page.fill('[name="metric_id"]', 'invalid id');
    
    // Should show format error
    await expect(page.locator('[data-testid="error-metric_id"]'))
      .toBeVisible();
  });
});
```

### 2.3: Policy Generation Flow

**Duration:** 1 day

```typescript
// tests/e2e/policies/generation.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('OPA Policy Generation', () => {
  test('should generate policy for metric', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    
    // Click on first metric
    await page.click('[data-testid="metric-row"]:first-child');
    
    // Click generate policy button
    await page.click('button:has-text("Generate Policy")');
    
    // Should display policy code
    await expect(page.locator('[data-testid="policy-code"]')).toBeVisible();
    
    // Policy should contain package declaration
    await expect(page.locator('[data-testid="policy-code"]'))
      .toContainText('package');
  });
  
  test('should copy policy to clipboard', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    await page.click('[data-testid="metric-row"]:first-child');
    await page.click('button:has-text("Generate Policy")');
    
    // Click copy button
    await page.click('button:has-text("Copy")');
    
    // Should show success toast
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Copied');
  });
  
  test('should download policy file', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    await page.click('[data-testid="metric-row"]:first-child');
    await page.click('button:has-text("Generate Policy")');
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    await page.click('button:has-text("Download")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/.*\.rego$/);
  });
});
```

### 2.4: Dashboard and Navigation

**Duration:** 1 day

```typescript
// tests/e2e/navigation/dashboard.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('Dashboard Navigation', () => {
  test('should display dashboard statistics', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/dashboard');
    
    // Should show metric count
    await expect(page.locator('[data-testid="total-metrics"]')).toBeVisible();
    
    // Should show recent activity
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
  });
  
  test('should navigate between pages', async ({ authenticatedPage: page }) => {
    // Start at dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to metrics
    await page.click('a:has-text("Metrics")');
    await expect(page).toHaveURL('/metrics');
    
    // Navigate to domains
    await page.click('a:has-text("Domains")');
    await expect(page).toHaveURL('/domains');
    
    // Navigate back to dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('should show user menu', async ({ authenticatedPage: page }) => {
    // Click user menu
    await page.click('[data-testid="user-menu"]');
    
    // Should show profile option
    await expect(page.locator('a:has-text("Profile")')).toBeVisible();
    
    // Should show settings option
    await expect(page.locator('a:has-text("Settings")')).toBeVisible();
    
    // Should show logout option
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- ✅ All authentication flows tested
- ✅ Metric CRUD operations tested
- ✅ Policy generation tested
- ✅ Dashboard navigation tested
- ✅ Form validation tested
- ✅ Error handling tested

---

## Task 3: Authorization and Role-Based Access (Days 8-9)

### 3.1: Role-Based Access Control Tests

```typescript
// tests/e2e/auth/roles.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('Role-Based Access Control', () => {
  test('viewer cannot create metrics', async ({ page }) => {
    // Login as viewer
    await page.goto('/login');
    await page.fill('[name="username"]', 'viewer');
    await page.fill('[name="password"]', 'Viewer123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/metrics');
    
    // New metric button should be hidden or disabled
    await expect(page.locator('button:has-text("New Metric")')).not.toBeVisible();
  });
  
  test('editor can create metrics', async ({ page }) => {
    // Login as editor
    await page.goto('/login');
    await page.fill('[name="username"]', 'editor');
    await page.fill('[name="password"]', 'Editor123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/metrics');
    
    // New metric button should be visible
    await expect(page.locator('button:has-text("New Metric")')).toBeVisible();
  });
  
  test('admin can delete metrics', async ({ authenticatedPage: page }) => {
    await page.goto('/metrics');
    await page.click('[data-testid="metric-row"]:first-child');
    
    // Delete button should be visible for admin
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- ✅ Viewer role restrictions tested
- ✅ Editor role permissions tested
- ✅ Admin role permissions tested
- ✅ Unauthorized access blocked

---

## Task 4: Error Handling and Edge Cases (Days 10-12)

### 4.1: Error Scenarios

```typescript
// tests/e2e/errors/handling.spec.ts
import { test, expect } from '../helpers/fixtures';

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ authenticatedPage: page, context }) => {
    await page.goto('/metrics');
    
    // Simulate offline mode
    await context.setOffline(true);
    
    // Try to create metric
    await page.click('button:has-text("New Metric")');
    await page.fill('[name="name"]', 'Test');
    await page.click('button[type="submit"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('network', { ignoreCase: true });
    
    // Restore connection
    await context.setOffline(false);
  });
  
  test('should handle API errors', async ({ authenticatedPage: page }) => {
    // Try to access non-existent metric
    await page.goto('/metrics/NON-EXISTENT-ID');
    
    // Should show 404 error
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('not found', { ignoreCase: true });
  });
  
  test('should handle session expiration', async ({ authenticatedPage: page }) => {
    // Clear cookies to simulate expired session
    await page.context().clearCookies();
    
    // Try to access protected page
    await page.goto('/metrics/new');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
```

**Acceptance Criteria:**
- ✅ Network errors handled gracefully
- ✅ API errors displayed to user
- ✅ Session expiration handled
- ✅ 404 pages work correctly

---

## Task 5: Performance and Accessibility (Days 13-14)

### 5.1: Performance Tests

```typescript
// tests/e2e/performance/metrics.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('dashboard loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });
  
  test('metrics list loads with 100 items', async ({ authenticatedPage: page }) => {
    const start = Date.now();
    
    await page.goto('/metrics');
    await page.waitForSelector('[data-testid="metrics-table"]');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });
});
```

### 5.2: Accessibility Tests

```typescript
// tests/e2e/accessibility/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('dashboard should be keyboard navigable', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL('/dashboard');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Focus should be visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- ✅ Critical pages load within performance budgets
- ✅ No accessibility violations
- ✅ Keyboard navigation works
- ✅ Screen reader friendly

---

## Running E2E Tests

### Development

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (recommended for debugging)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- tests/e2e/auth/login.spec.ts

# Run specific browser
npm run test:e2e:chrome
```

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
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
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          DB_HOST: localhost
          DB_PASSWORD: postgres
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      - name: Upload videos
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: test-results/
          retention-days: 7
```

---

## Success Metrics

### Coverage Goals
- ✅ All critical user flows tested (5+ flows)
- ✅ Authentication and authorization complete
- ✅ CRUD operations for all entities
- ✅ Error scenarios covered
- ✅ Cross-browser compatibility verified

### Performance Goals
- ✅ Dashboard loads < 3 seconds
- ✅ API calls complete < 1 second
- ✅ No console errors during tests
- ✅ Accessibility score > 95

### Quality Goals
- ✅ 95%+ test pass rate
- ✅ No flaky tests
- ✅ Tests run in < 10 minutes
- ✅ Clear test documentation

---

## Next Steps

After E2E testing is complete:

1. **Performance Testing** (Phase 2A, Task 4)
   - Load testing with k6
   - Stress testing
   - Performance benchmarking

2. **Security Testing** (Phase 2A, Task 5)
   - OWASP ZAP scanning
   - Penetration testing
   - Vulnerability assessment

3. **CI/CD Integration** (Phase 2A, Task 6)
   - Automate all tests in GitHub Actions
   - Set up code coverage reporting
   - Configure quality gates

---

**Navigation:**
- **[← Back to Phase 2A Testing](./PHASE_2A_TESTING.md)**
- **[← Back to Phase 2 Overview](./PHASE_2_MAJOR.md)**
