import { expect, test } from '../helpers/fixtures';

/**
 * E2E Tests: User Registration Flow
 * 
 * Tests the complete user registration journey including:
 * - Successful registration with valid data
 * - Failed registration with invalid data
 * - Duplicate username/email handling
 * - Password validation
 */

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/register');
  });

  test('should display registration page', async ({ page }) => {
    await expect(page).toHaveTitle(/MDL/);
    await expect(page.locator('h1')).toContainText(/Register|Sign Up/i);
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should register successfully with valid data', async ({ page }) => {
    const timestamp = Date.now();
    const username = `newuser_${timestamp}`;
    const email = `${username}@test.com`;
    const password = 'SecurePass123!';

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    // Fill confirm password if it exists
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill(password);
    }

    await page.click('button[type="submit"]');

    // Should redirect to home or login page
    await page.waitForURL(/localhost:3000\/(login)?/, { timeout: 10000 });
    
    // If redirected to home, should be logged in
    const url = page.url();
    if (!url.includes('login')) {
      const token = await page.evaluate(() => localStorage.getItem('accessToken'));
      expect(token).toBeTruthy();
    }
  });

  test('should fail registration with existing username', async ({ page }) => {
    // First, create a user
    const timestamp = Date.now();
    const username = `existinguser_${timestamp}`;
    
    await page.request.post('http://localhost:3000/api/auth/register', {
      data: {
        username: username,
        email: `${username}@test.com`,
        password: 'TestPass123!',
        role: 'viewer',
      },
    });

    // Try to register with same username
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `different_${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'TestPass123!');
    
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill('TestPass123!');
    }

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/already exists|already taken|username.*taken/i')).toBeVisible({ timeout: 5000 });
  });

  test('should fail registration with existing email', async ({ page }) => {
    // First, create a user
    const timestamp = Date.now();
    const email = `existing_${timestamp}@test.com`;
    
    await page.request.post('http://localhost:3000/api/auth/register', {
      data: {
        username: `user_${timestamp}`,
        email: email,
        password: 'TestPass123!',
        role: 'viewer',
      },
    });

    // Try to register with same email
    await page.fill('input[name="username"]', `different_${timestamp}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPass123!');
    
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill('TestPass123!');
    }

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/already exists|already taken|email.*taken/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate password requirements', async ({ page }) => {
    const timestamp = Date.now();
    
    await page.fill('input[name="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"]', `user_${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'weak'); // Too weak password
    
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill('weak');
    }

    await page.click('button[type="submit"]');

    // Should show password validation error
    await expect(page.locator('text=/password.*requirements|password.*weak|password.*invalid/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate password confirmation match', async ({ page }) => {
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    
    // Only run this test if password confirmation field exists
    if (await confirmPasswordInput.count() === 0) {
      test.skip();
      return;
    }

    const timestamp = Date.now();
    
    await page.fill('input[name="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"]', `user_${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await confirmPasswordInput.fill('DifferentPass123!');

    await page.click('button[type="submit"]');

    // Should show password mismatch error
    await expect(page.locator('text=/password.*match|passwords.*same|passwords.*identical/i')).toBeVisible({ timeout: 5000 });
  });

  test('should fail registration with empty required fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const usernameInput = page.locator('input[name="username"]');
    const isRequired = await usernameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
    
    // Should still be on registration page
    await expect(page).toHaveURL(/register/);
  });

  test('should validate email format', async ({ page }) => {
    const timestamp = Date.now();
    
    await page.fill('input[name="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"]', 'invalid-email-format'); // Invalid email
    await page.fill('input[name="password"]', 'SecurePass123!');
    
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.count() > 0) {
      await confirmPasswordInput.fill('SecurePass123!');
    }

    await page.click('button[type="submit"]');

    // Should show email validation error or stay on page
    // HTML5 validation might handle this
    const emailInput = page.locator('input[name="email"]');
    const emailType = await emailInput.getAttribute('type');
    if (emailType === 'email') {
      // HTML5 validation will handle it
      await expect(page).toHaveURL(/register/);
    } else {
      // Custom validation should show error
      await expect(page.locator('text=/invalid.*email|email.*invalid/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
