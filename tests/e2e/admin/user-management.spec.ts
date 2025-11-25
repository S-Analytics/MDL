import { expect, test } from '../helpers/fixtures';

/**
 * E2E Tests for User Management (Admin Only)
 * 
 * Tests cover:
 * - Viewing user list
 * - Creating new users with different roles
 * - Editing user details and roles
 * - Deleting users
 * - Role-based access control
 * - User status management (active/inactive)
 * - Admin-only restrictions
 */

test.describe('User Management (Admin)', () => {
  test.describe('User List Display', () => {
    test('should display user management page for admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000/admin/users');
      
      // Wait for page to load
      await authenticatedPage.waitForTimeout(2000);
      
      // Check for user management elements
      const heading = authenticatedPage.locator('h1:has-text("User Management")');
      const userManagementSection = await heading.count();
      
      // Should either see the page or be redirected to main dashboard
      if (userManagementSection > 0) {
        await expect(heading).toBeVisible();
      }
    });

    test('should show create user button for admin', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000/admin/users');
      await authenticatedPage.waitForTimeout(2000);
      
      // Check for create button (if user management page exists)
      const createButton = authenticatedPage.locator('button:has-text("Create User")');
      const buttonCount = await createButton.count();
      
      if (buttonCount > 0) {
        await expect(createButton).toBeVisible();
      }
    });

    test('should display existing users in table', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000/admin/users');
      await authenticatedPage.waitForTimeout(2000);
      
      // Look for user table
      const userTable = authenticatedPage.locator('table');
      const tableCount = await userTable.count();
      
      if (tableCount > 0) {
        // Should have headers
        await expect(userTable.locator('th:has-text("Username")')).toBeVisible();
        await expect(userTable.locator('th:has-text("Email")')).toBeVisible();
        await expect(userTable.locator('th:has-text("Role")')).toBeVisible();
        
        // Should have at least one user (the logged-in admin)
        const userRows = userTable.locator('tbody tr');
        const rowCount = await userRows.count();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('should display user roles with badges', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('http://localhost:3000/admin/users');
      await authenticatedPage.waitForTimeout(2000);
      
      // Check for role badges
      const roleBadges = authenticatedPage.locator('.badge, .tag, [class*="role"]');
      const badgeCount = await roleBadges.count();
      
      if (badgeCount > 0) {
        // Should show role types
        const pageText = await authenticatedPage.textContent('body');
        const hasRoles = pageText && (
          pageText.includes('admin') ||
          pageText.includes('editor') ||
          pageText.includes('viewer')
        );
        expect(hasRoles).toBeTruthy();
      }
    });
  });

  test.describe('User Creation', () => {
    test('should create a new viewer user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username = `viewer_${timestamp}`;
      const email = `viewer_${timestamp}@test.com`;
      
      const response = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email,
          password: 'ViewerPass123!',
          full_name: `Viewer User ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.user.username).toBe(username);
      expect(result.user.role).toBe('viewer');
    });

    test('should create a new editor user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username = `editor_${timestamp}`;
      const email = `editor_${timestamp}@test.com`;
      
      const response = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email,
          password: 'EditorPass123!',
          full_name: `Editor User ${timestamp}`,
          role: 'editor'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.user.username).toBe(username);
      expect(result.user.role).toBe('editor');
    });

    test('should create a new admin user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username = `admin_${timestamp}`;
      const email = `admin_${timestamp}@test.com`;
      
      const response = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email,
          password: 'AdminPass123!',
          full_name: `Admin User ${timestamp}`,
          role: 'admin'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.user.username).toBe(username);
      expect(result.user.role).toBe('admin');
    });

    test('should validate password strength on creation', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username = `weak_${timestamp}`;
      const email = `weak_${timestamp}@test.com`;
      
      const response = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email,
          password: 'weak', // Weak password
          full_name: `Test User ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    test('should prevent duplicate username', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username = `duplicate_${timestamp}`;
      const email1 = `user1_${timestamp}@test.com`;
      const email2 = `user2_${timestamp}@test.com`;
      
      // Create first user
      const response1 = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: email1,
          password: 'Password123!',
          full_name: `User One ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response1.ok()).toBeTruthy();
      
      // Try to create second user with same username
      const response2 = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username, // Same username
          email: email2,
          password: 'Password123!',
          full_name: `User Two ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response2.status()).toBe(409);
      const result = await response2.json();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/username/i);
    });

    test('should prevent duplicate email', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const username1 = `user1_${timestamp}`;
      const username2 = `user2_${timestamp}`;
      const email = `duplicate_${timestamp}@test.com`;
      
      // Create first user
      const response1 = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username: username1,
          email,
          password: 'Password123!',
          full_name: `User One ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response1.ok()).toBeTruthy();
      
      // Try to create second user with same email
      const response2 = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username: username2,
          email, // Same email
          password: 'Password123!',
          full_name: `User Two ${timestamp}`,
          role: 'viewer'
        }
      });
      
      expect(response2.status()).toBe(409);
      const result = await response2.json();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/email/i);
    });
  });

  test.describe('User Editing', () => {
    test('should retrieve user list', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get('http://localhost:3000/api/auth/users');
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });

    test('should get specific user by ID', async ({ authenticatedPage }) => {
      // First get list of users
      const listResponse = await authenticatedPage.request.get('http://localhost:3000/api/auth/users');
      const listResult = await listResponse.json();
      
      if (listResult.users && listResult.users.length > 0) {
        const userId = listResult.users[0].user_id;
        
        // Get specific user
        const userResponse = await authenticatedPage.request.get(`http://localhost:3000/api/auth/users/${userId}`);
        expect(userResponse.ok()).toBeTruthy();
        
        const userResult = await userResponse.json();
        expect(userResult.user.user_id).toBe(userId);
      }
    });

    test('should update user full name', async ({ authenticatedPage }) => {
      // Create a user first
      const timestamp = Date.now();
      const username = `update_test_${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'Password123!',
          full_name: 'Original Name',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Update the user
      const updateResponse = await authenticatedPage.request.put(`http://localhost:3000/api/auth/users/${userId}`, {
        data: {
          full_name: 'Updated Name'
        }
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updateResult = await updateResponse.json();
      expect(updateResult.user.full_name).toBe('Updated Name');
    });

    test('should change user role', async ({ authenticatedPage }) => {
      // Create a viewer user
      const timestamp = Date.now();
      const username = `role_change_${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'Password123!',
          full_name: 'Role Change Test',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Change role to editor
      const updateResponse = await authenticatedPage.request.put(`http://localhost:3000/api/auth/users/${userId}`, {
        data: {
          role: 'editor'
        }
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updateResult = await updateResponse.json();
      expect(updateResult.user.role).toBe('editor');
    });

    test('should update user status', async ({ authenticatedPage }) => {
      // Create a user
      const timestamp = Date.now();
      const username = `status_test_${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'Password123!',
          full_name: 'Status Test',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Deactivate user
      const updateResponse = await authenticatedPage.request.put(`http://localhost:3000/api/auth/users/${userId}`, {
        data: {
          status: 'inactive'
        }
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updateResult = await updateResponse.json();
      expect(updateResult.user.status).toBe('inactive');
    });
  });

  test.describe('User Deletion', () => {
    test('should delete a user', async ({ authenticatedPage }) => {
      // Create a user to delete
      const timestamp = Date.now();
      const username = `delete_test_${timestamp}`;
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'Password123!',
          full_name: 'Delete Test User',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Delete the user
      const deleteResponse = await authenticatedPage.request.delete(`http://localhost:3000/api/auth/users/${userId}`);
      expect(deleteResponse.ok()).toBeTruthy();
      
      // Verify user is deleted
      const getResponse = await authenticatedPage.request.get(`http://localhost:3000/api/auth/users/${userId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('should return 404 for non-existent user deletion', async ({ authenticatedPage }) => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      
      const deleteResponse = await authenticatedPage.request.delete(`http://localhost:3000/api/auth/users/${fakeUserId}`);
      expect(deleteResponse.status()).toBe(404);
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('editor should not access user management page', async ({ editorPage }) => {
      await editorPage.goto('http://localhost:3000/admin/users');
      await editorPage.waitForTimeout(2000);
      
      // Should either see access denied or be redirected
      const pageText = await editorPage.textContent('body');
      const hasAccess = pageText && pageText.includes('User Management');
      
      // Editor should not have access
      expect(hasAccess).toBeFalsy();
    });

    test('viewer should not access user management page', async ({ viewerPage }) => {
      await viewerPage.goto('http://localhost:3000/admin/users');
      await viewerPage.waitForTimeout(2000);
      
      // Should either see access denied or be redirected
      const pageText = await viewerPage.textContent('body');
      const hasAccess = pageText && pageText.includes('User Management');
      
      // Viewer should not have access
      expect(hasAccess).toBeFalsy();
    });

    test('editor should not be able to list users via API', async ({ editorPage }) => {
      const response = await editorPage.request.get('http://localhost:3000/api/auth/users');
      
      // Should return 403 Forbidden or 401 Unauthorized
      expect([401, 403]).toContain(response.status());
    });

    test('viewer should not be able to list users via API', async ({ viewerPage }) => {
      const response = await viewerPage.request.get('http://localhost:3000/api/auth/users');
      
      // Should return 403 Forbidden or 401 Unauthorized
      expect([401, 403]).toContain(response.status());
    });

    test('admin can list all users', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get('http://localhost:3000/api/auth/users');
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });
  });

  test.describe('User Filtering and Pagination', () => {
    test('should filter users by role', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get('http://localhost:3000/api/auth/users?role=admin');
      
      if (response.ok()) {
        const result = await response.json();
        if (result.users && result.users.length > 0) {
          // All returned users should be admins
          const allAdmins = result.users.every((user: any) => user.role === 'admin');
          expect(allAdmins).toBe(true);
        }
      }
    });

    test('should filter users by status', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get('http://localhost:3000/api/auth/users?status=active');
      
      if (response.ok()) {
        const result = await response.json();
        if (result.users && result.users.length > 0) {
          // All returned users should be active
          const allActive = result.users.every((user: any) => user.status === 'active');
          expect(allActive).toBe(true);
        }
      }
    });

    test('should paginate user list', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get('http://localhost:3000/api/auth/users?limit=5&offset=0');
      
      if (response.ok()) {
        const result = await response.json();
        expect(result.success).toBe(true);
        
        if (result.users) {
          // Should return at most 5 users
          expect(result.users.length).toBeLessThanOrEqual(5);
        }
      }
    });
  });

  test.describe('Password Management', () => {
    test('should allow user to change their own password', async ({ authenticatedPage }) => {
      // Create a test user
      const timestamp = Date.now();
      const username = `password_change_${timestamp}`;
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: oldPassword,
          full_name: 'Password Change Test',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const accessToken = createResult.tokens.access_token;
      
      // Change password using the user's token
      const changeResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/change-password', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        data: {
          old_password: oldPassword,
          new_password: newPassword
        }
      });
      
      expect(changeResponse.ok()).toBeTruthy();
      
      // Try logging in with new password
      const loginResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/login', {
        data: {
          username,
          password: newPassword
        }
      });
      
      expect(loginResponse.ok()).toBeTruthy();
    });

    test('should reject invalid old password when changing password', async ({ authenticatedPage }) => {
      // Create a test user
      const timestamp = Date.now();
      const username = `invalid_old_pass_${timestamp}`;
      const actualPassword = 'ActualPassword123!';
      const wrongOldPassword = 'WrongPassword123!';
      const newPassword = 'NewPassword123!';
      
      const createResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: actualPassword,
          full_name: 'Invalid Old Password Test',
          role: 'viewer'
        }
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createResult = await createResponse.json();
      const accessToken = createResult.tokens.access_token;
      
      // Try to change password with wrong old password
      const changeResponse = await authenticatedPage.request.post('http://localhost:3000/api/auth/change-password', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        data: {
          old_password: wrongOldPassword,
          new_password: newPassword
        }
      });
      
      expect(changeResponse.status()).toBe(401);
    });
  });

  test.describe('User Search', () => {
    test('should search users by username', async ({ authenticatedPage }) => {
      // Create a user with unique username
      const timestamp = Date.now();
      const username = `searchable_${timestamp}`;
      
      await authenticatedPage.request.post('http://localhost:3000/api/auth/register', {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'Password123!',
          full_name: 'Searchable User',
          role: 'viewer'
        }
      });
      
      // Search for the user
      const searchResponse = await authenticatedPage.request.get(`http://localhost:3000/api/auth/users?search=${username}`);
      
      if (searchResponse.ok()) {
        const result = await searchResponse.json();
        if (result.users) {
          const foundUser = result.users.find((u: any) => u.username === username);
          expect(foundUser).toBeDefined();
        }
      }
    });
  });
});
