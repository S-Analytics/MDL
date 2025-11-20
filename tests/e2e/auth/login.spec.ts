import { expect, test } from '../helpers/fixtures';

/**
 * E2E Tests: User Login Flow
 * 
 * Tests the complete login user journey including:
 * - Successful login with valid credentials
 * - Failed login with invalid credentials
 * - Session persistence after page reload
 * - Logout functionality
 */

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean session
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await expect(page).toHaveTitle(/MDL/);
    await expect(page.locator('h1')).toContainText(/Login|Sign In/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // First, create a test user via API
    const timestamp = Date.now();
    const username = `e2euser_${timestamp}`;
    const password = 'TestPass123!';

    const response = await page.request.post('http://localhost:3000/api/auth/register', {
      data: {
        username: username,
        email: `${username}@test.com`,
        password: password,
        role: 'admin',
      },
    });

    expect(response.ok()).toBeTruthy();

    // Now login via UI
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to home page
    await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });
    
    // Check that we're authenticated
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    
    // Should see user menu or logout button
    await expect(page.locator('button:has-text("Logout"), [data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[name="username"]', 'nonexistent_user');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials|Login failed|Authentication failed/i')).toBeVisible({ timeout: 5000 });
    
    // Should still be on login page
    await expect(page).toHaveURL(/login/);
    
    // Should not have token
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeFalsy();
  });

  test('should fail login with empty fields', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.click('button[type="submit"]');

    // Should show validation errors or stay on login page
    await expect(page).toHaveURL(/login/);
    
    // HTML5 validation should prevent submission or show error
    const usernameInput = page.locator('input[name="username"]');
    const isRequired = await usernameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('should persist session after page reload', async ({ page }) => {
    // Create and login user
    const timestamp = Date.now();
    const username = `e2euser_${timestamp}`;
    const password = 'TestPass123!';

    const response = await page.request.post('http://localhost:3000/api/auth/register', {
      data: {
        username: username,
        email: `${username}@test.com`,
        password: password,
        role: 'admin',
      },
    });

    expect(response.ok()).toBeTruthy();

    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/**', { timeout: 10000 });

    // Verify logged in
    let token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be logged in
    token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    
    // Should not redirect to login
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('User Logout', () => {
  test('should logout successfully', async ({ authenticatedPage: page }) => {
    // User is already logged in via fixture
    const tokenBefore = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(tokenBefore).toBeTruthy();

    // Click logout button
    await page.click('button:has-text("Logout")');
    
    // Wait for redirect to login page
    await page.waitForURL('http://localhost:3000/login', { timeout: 10000 });

    // Token should be cleared
    const tokenAfter = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(tokenAfter).toBeFalsy();
  });

  test('should redirect to login when accessing protected route after logout', async ({ authenticatedPage: page }) => {
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('http://localhost:3000/login', { timeout: 10000 });

    // Try to access protected route
    await page.goto('http://localhost:3000/metrics');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Session Management', () => {
  test('should handle expired token gracefully', async ({ page }) => {
    // Set an expired/invalid token
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'invalid.token.here');
    });

    // Try to access protected route
    await page.goto('http://localhost:3000/metrics');

    // Should redirect to login or show error
    await expect(page).toHaveURL(/login|error/);
  });
});
