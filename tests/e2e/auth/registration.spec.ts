import { BASE_URL, buildApiUrl, expect, test } from '../helpers/fixtures';

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
    await page.goto(`${BASE_URL}/auth/register`);
  });

  test('should display registration page', async ({ page }) => {
    await expect(page).toHaveTitle(/MDL/);
    await expect(page.locator('h1, h2')).toContainText(/Create Account/i);
    await expect(page.locator('input[name="username"], input[id="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"], input[id="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should register successfully with valid data', async ({ page }) => {
    const timestamp = Date.now();
    const username = `newuser_${timestamp}`;
    const email = `${username}@test.com`;
    const password = 'SecurePass123!';

    await page.fill('input[name="username"], input[id="username"]', username);
    await page.fill('input[name="email"], input[id="email"]', email);
    await page.fill('input[name="full_name"], input[id="full_name"]', `${username} User`);
    await page.fill('input[name="password"], input[id="password"]', password);
    
    // Fill confirm password if it exists
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    if (await confirm_passwordInput.count() > 0) {
      await confirm_passwordInput.fill(password);
    }

    await page.click('button[type="submit"]');

    // Should show success message and redirect to login page
    await expect(page.locator('#alert, .alert')).toContainText(/Account created successfully/i, { timeout: 8000 });
    await page.waitForURL(/auth\/login/, { timeout: 10000 });
    
    // Should be on login page
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('should fail registration with existing username', async ({ page }) => {
    // First, create a user
    const timestamp = Date.now();
    const username = `existinguser_${timestamp}`;
    
    await page.request.post(buildApiUrl('auth/register'), {
      data: {
        username: username,
        email: `${username}@test.com`,
        password: 'TestPass123!',
        full_name: `${username} User`,
        role: 'viewer',
      },
    });

    // Try to register with same username
    await page.fill('input[name="username"], input[id="username"]', username);
    await page.fill('input[name="email"], input[id="email"]', `different_${timestamp}@test.com`);
    await page.fill('input[name="full_name"], input[id="full_name"]', `${username} User`);
    await page.fill('input[name="password"], input[id="password"]', 'TestPass123!');
    
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    if (await confirm_passwordInput.count() > 0) {
      await confirm_passwordInput.fill('TestPass123!');
    }

    await page.click('button[type="submit"]');

    // Should show error message in alert div
    await expect(page.locator('#alert, .alert')).toContainText(/Username.*already exists/i, { timeout: 8000 });
  });

  test('should fail registration with existing email', async ({ page }) => {
    // First, create a user
    const timestamp = Date.now();
    const email = `existing_${timestamp}@test.com`;
    
    await page.request.post(buildApiUrl('auth/register'), {
      data: {
        username: `user_${timestamp}`,
        email: email,
        password: 'TestPass123!',
        full_name: `user_${timestamp} User`,
        role: 'viewer',
      },
    });

    // Try to register with same email
    await page.fill('input[name="username"], input[id="username"]', `different_${timestamp}`);
    await page.fill('input[name="email"], input[id="email"]', email);
    await page.fill('input[name="full_name"], input[id="full_name"]', `different_${timestamp} User`);
    await page.fill('input[name="password"], input[id="password"]', 'TestPass123!');
    
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    if (await confirm_passwordInput.count() > 0) {
      await confirm_passwordInput.fill('TestPass123!');
    }

    await page.click('button[type="submit"]');

    // Should show error message in alert div
    await expect(page.locator('#alert, .alert')).toContainText(/Email.*already exists/i, { timeout: 8000 });
  });

  test('should validate password requirements', async ({ page }) => {
    const timestamp = Date.now();
    
    await page.fill('input[name="username"], input[id="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"], input[id="email"]', `user_${timestamp}@test.com`);
    await page.fill('input[name="full_name"], input[id="full_name"]', `user_${timestamp} User`);
    await page.fill('input[name="password"], input[id="password"]', 'weak'); // Too weak password
    
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    if (await confirm_passwordInput.count() > 0) {
      await confirm_passwordInput.fill('weak');
    }

    await page.click('button[type="submit"]');

    // Should show password validation error in alert div
    await expect(page.locator('#alert, .alert')).toContainText(/Password.*not meet requirements|Password must/i, { timeout: 5000 });
  });

  test('should validate password confirmation match', async ({ page }) => {
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    
    // Only run this test if password confirmation field exists
    if (await confirm_passwordInput.count() === 0) {
      test.skip();
      return;
    }

    const timestamp = Date.now();
    
    await page.fill('input[name="username"], input[id="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"], input[id="email"]', `user_${timestamp}@test.com`);
    await page.fill('input[name="full_name"], input[id="full_name"]', `user_${timestamp} User`);
    await page.fill('input[name="password"], input[id="password"]', 'SecurePass123!');
    await confirm_passwordInput.fill('DifferentPass123!');

    await page.click('button[type="submit"]');

    // Should show password mismatch error in alert div
    await expect(page.locator('#alert, .alert')).toContainText(/Passwords do not match/i, { timeout: 5000 });
  });

  test('should fail registration with empty required fields', async ({ page }) => {
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const usernameInput = page.locator('input[name="username"], input[id="username"]');
    const isRequired = await usernameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
    
    // Should still be on registration page
    await expect(page).toHaveURL(/auth\/register/);
  });

  test('should validate email format', async ({ page }) => {
    const timestamp = Date.now();
    
    await page.fill('input[name="username"], input[id="username"]', `user_${timestamp}`);
    await page.fill('input[name="email"], input[id="email"]', 'invalid-email-format'); // Invalid email
    await page.fill('input[name="full_name"], input[id="full_name"]', `user_${timestamp} User`);
    await page.fill('input[name="password"], input[id="password"]', 'SecurePass123!');
    
    const confirm_passwordInput = page.locator('input[name="confirm_password"], input[id="confirm_password"]');
    if (await confirm_passwordInput.count() > 0) {
      await confirm_passwordInput.fill('SecurePass123!');
    }

    await page.click('button[type="submit"]');

    // Should show email validation error or stay on page
    // HTML5 validation might handle this
    const emailInput = page.locator('input[name="email"], input[id="email"]');
    const emailType = await emailInput.getAttribute('type');
    if (emailType === 'email') {
      // HTML5 validation will handle it
      await expect(page).toHaveURL(/auth\/register/);
    } else {
      // Custom validation should show error
      await expect(page.locator('text=/invalid.*email|email.*invalid/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
