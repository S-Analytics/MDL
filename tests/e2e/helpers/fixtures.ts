import { test as base, Page } from '@playwright/test';

/**
 * E2E Test Fixtures
 * 
 * Provides custom fixtures for common testing scenarios:
 * - authenticatedPage: Page with admin user logged in
 * - editorPage: Page with editor user logged in
 * - viewerPage: Page with viewer user logged in
 */

export interface AuthenticatedFixtures {
  authenticatedPage: Page;
  editorPage: Page;
  viewerPage: Page;
}

/**
 * Helper function to create a user and log in
 */
async function createUserAndLogin(
  page: Page,
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<void> {
  const timestamp = Date.now();
  const uniqueUsername = `${username}_${timestamp}`;
  const uniqueEmail = `${username}_${timestamp}@test.com`;

  // Register the user via API
  const response = await page.request.post('http://localhost:3000/api/auth/register', {
    data: {
      username: uniqueUsername,
      email: uniqueEmail,
      password: password,
      role: role,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create user: ${response.status()} ${await response.text()}`);
  }

  const { accessToken } = await response.json();

  // Set the access token in localStorage
  await page.goto('http://localhost:3000');
  await page.evaluate((token) => {
    localStorage.setItem('accessToken', token);
  }, accessToken);

  // Navigate to home page to activate session
  await page.goto('http://localhost:3000');
}

/**
 * Helper function to login with existing credentials
 */
async function loginWithCredentials(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
}

/**
 * Helper function to check if user is authenticated
 */
async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  return token !== null;
}

/**
 * Helper function to logout
 */
async function logout(page: Page): Promise<void> {
  await page.goto('http://localhost:3000');
  await page.click('button:has-text("Logout")', { timeout: 5000 }).catch(() => {
    // Logout button might not be visible, clear storage directly
  });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Extended test with authenticated fixtures
 */
export const test = base.extend<AuthenticatedFixtures>({
  /**
   * Fixture: authenticatedPage
   * Provides a page with an admin user already logged in
   */
  authenticatedPage: async ({ page }, use) => {
    await createUserAndLogin(page, 'testadmin', 'admin@test.com', 'AdminPass123!', 'admin');
    await use(page);
    await logout(page);
  },

  /**
   * Fixture: editorPage
   * Provides a page with an editor user already logged in
   */
  editorPage: async ({ page }, use) => {
    await createUserAndLogin(page, 'testeditor', 'editor@test.com', 'EditorPass123!', 'editor');
    await use(page);
    await logout(page);
  },

  /**
   * Fixture: viewerPage
   * Provides a page with a viewer user already logged in
   */
  viewerPage: async ({ page }, use) => {
    await createUserAndLogin(page, 'testviewer', 'viewer@test.com', 'ViewerPass123!', 'viewer');
    await use(page);
    await logout(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Export helper functions for direct use in tests
 */
export { createUserAndLogin, isAuthenticated, loginWithCredentials, logout };

