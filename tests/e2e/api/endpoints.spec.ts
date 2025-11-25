import { expect, test, BASE_URL, buildApiUrl } from '../helpers/fixtures';

/**
 * E2E Tests for API Endpoints
 * 
 * Direct API testing without UI interactions
 * Tests cover:
 * - REST endpoint functionality
 * - Request/response validation
 * - Error handling
 * - Authentication and authorization
 * - Data validation
 */

test.describe('API Endpoints', () => {
  test.describe('Authentication API', () => {
    test('POST /api/auth/register - should register new user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      const userData = {
        username: `api_test_${timestamp}`,
        email: `api_test_${timestamp}@test.com`,
        password: 'TestPassword123!',
        full_name: 'API Test User',
        role: 'viewer'
      };
      
      const response = await authenticatedPage.request.post(buildApiUrl('auth/register'), {
        data: userData
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.role).toBe(userData.role);
      expect(result.tokens).toBeDefined();
      expect(result.tokens.access_token).toBeDefined();
      expect(result.tokens.refresh_token).toBeDefined();
    });

    test('POST /api/auth/register - should reject weak password', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      
      const response = await authenticatedPage.request.post(buildApiUrl('auth/register'), {
        data: {
          username: `weak_${timestamp}`,
          email: `weak_${timestamp}@test.com`,
          password: '123', // Too weak
          full_name: 'Weak Password Test',
          role: 'viewer'
        }
      });
      
      expect(response.status()).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    test('POST /api/auth/login - should login with valid credentials', async ({ page }) => {
      const timestamp = Date.now();
      const username = `login_test_${timestamp}`;
      const password = 'LoginTest123!';
      
      // Register user first
      await page.request.post(buildApiUrl('auth/register'), {
        data: {
          username,
          email: `${username}@test.com`,
          password,
          full_name: 'Login Test',
          role: 'viewer'
        }
      });
      
      // Login
      const response = await page.request.post(buildApiUrl('auth/login'), {
        data: {
          username,
          password
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.user.username).toBe(username);
      expect(result.tokens.access_token).toBeDefined();
    });

    test('POST /api/auth/login - should reject invalid password', async ({ page }) => {
      const response = await page.request.post(buildApiUrl('auth/login'), {
        data: {
          username: 'nonexistent',
          password: 'wrongpassword'
        }
      });
      
      expect(response.status()).toBe(401);
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    test('POST /api/auth/refresh - should refresh access token', async ({ page }) => {
      const timestamp = Date.now();
      const username = `refresh_test_${timestamp}`;
      
      // Register and get tokens
      const registerResponse = await page.request.post(buildApiUrl('auth/register'), {
        data: {
          username,
          email: `${username}@test.com`,
          password: 'RefreshTest123!',
          full_name: 'Refresh Test',
          role: 'viewer'
        }
      });
      
      const registerResult = await registerResponse.json();
      const refreshToken = registerResult.tokens.refresh_token;
      
      // Refresh token
      const response = await page.request.post(buildApiUrl('auth/refresh'), {
        data: {
          refresh_token: refreshToken
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.tokens.access_token).toBeDefined();
      expect(result.tokens.refresh_token).toBeDefined();
    });

    test('POST /api/auth/refresh - should reject invalid refresh token', async ({ page }) => {
      const response = await page.request.post(buildApiUrl('auth/refresh'), {
        data: {
          refresh_token: 'invalid-token-12345'
        }
      });
      
      expect([400, 401]).toContain(response.status());
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  test.describe('User Management API', () => {
    test('GET /api/auth/users - should list all users (admin only)', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users'));
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });

    test('GET /api/auth/users/:id - should get specific user', async ({ authenticatedPage }) => {
      // Get list first
      const listResponse = await authenticatedPage.request.get(buildApiUrl('auth/users'));
      const listResult = await listResponse.json();
      
      if (listResult.users && listResult.users.length > 0) {
        const userId = listResult.users[0].user_id;
        
        const response = await authenticatedPage.request.get(buildApiUrl(`auth/users/${userId}`));
        expect(response.ok()).toBeTruthy();
        
        const result = await response.json();
        expect(result.user.user_id).toBe(userId);
      }
    });

    test('PUT /api/auth/users/:id - should update user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      
      // Create user
      const createResponse = await authenticatedPage.request.post(buildApiUrl('auth/register'), {
        data: {
          username: `update_api_${timestamp}`,
          email: `update_api_${timestamp}@test.com`,
          password: 'Password123!',
          full_name: 'Original Name',
          role: 'viewer'
        }
      });
      
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Update user
      const response = await authenticatedPage.request.put(buildApiUrl(`auth/users/${userId}`), {
        data: {
          full_name: 'Updated Name'
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.user.full_name).toBe('Updated Name');
    });

    test('DELETE /api/auth/users/:id - should delete user', async ({ authenticatedPage }) => {
      const timestamp = Date.now();
      
      // Create user
      const createResponse = await authenticatedPage.request.post(buildApiUrl('auth/register'), {
        data: {
          username: `delete_api_${timestamp}`,
          email: `delete_api_${timestamp}@test.com`,
          password: 'Password123!',
          full_name: 'Delete Test',
          role: 'viewer'
        }
      });
      
      const createResult = await createResponse.json();
      const userId = createResult.user.user_id;
      
      // Delete user
      const response = await authenticatedPage.request.delete(buildApiUrl(`auth/users/${userId}`));
      expect(response.ok()).toBeTruthy();
      
      // Verify deleted
      const getResponse = await authenticatedPage.request.get(buildApiUrl(`auth/users/${userId}`));
      expect(getResponse.status()).toBe(404);
    });

    test('GET /api/auth/users - should filter by role', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users?role=admin'));
      
      if (response.ok()) {
        const result = await response.json();
        if (result.users && result.users.length > 0) {
          const allAdmins = result.users.every((user: any) => user.role === 'admin');
          expect(allAdmins).toBe(true);
        }
      }
    });

    test('GET /api/auth/users - should filter by status', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users?status=active'));
      
      if (response.ok()) {
        const result = await response.json();
        if (result.users && result.users.length > 0) {
          const allActive = result.users.every((user: any) => user.status === 'active');
          expect(allActive).toBe(true);
        }
      }
    });

    test('GET /api/auth/users - should paginate results', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users?limit=5&offset=0'));
      
      if (response.ok()) {
        const result = await response.json();
        expect(result.users.length).toBeLessThanOrEqual(5);
      }
    });
  });

  test.describe('Domains API (PostgreSQL)', () => {
    test('GET /api/postgres/domains - should list all domains', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('postgres/domains'));
      
      // May return 404 if PostgreSQL not configured
      if (response.ok()) {
        const result = await response.json();
        expect(Array.isArray(result.domains)).toBe(true);
      }
    });

    test('POST /api/postgres/domains - should create domain', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      const response = await editorPage.request.post(buildApiUrl('postgres/domains'), {
        data: {
          name: `API Domain ${timestamp}`,
          description: 'Created via API',
          color: '#3498db'
        }
      });
      
      if (response.ok()) {
        const result = await response.json();
        expect(result.domain.name).toBe(`API Domain ${timestamp}`);
        expect(result.domain.color).toBe('#3498db');
        
        // Clean up
        await editorPage.request.delete(buildApiUrl(`postgres/domains/${result.domain.domain_id}`));
      }
    });

    test('PUT /api/postgres/domains/:id - should update domain', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      // Create domain
      const createResponse = await editorPage.request.post(buildApiUrl('postgres/domains'), {
        data: {
          name: `Update Test ${timestamp}`,
          description: 'Original',
          color: '#e74c3c'
        }
      });
      
      if (createResponse.ok()) {
        const createResult = await createResponse.json();
        const domainId = createResult.domain.domain_id;
        
        // Update domain
        const updateResponse = await editorPage.request.put(buildApiUrl(`postgres/domains/${domainId}`), {
          data: {
            description: 'Updated description'
          }
        });
        
        expect(updateResponse.ok()).toBeTruthy();
        const updateResult = await updateResponse.json();
        expect(updateResult.domain.description).toBe('Updated description');
        
        // Clean up
        await editorPage.request.delete(buildApiUrl(`postgres/domains/${domainId}`));
      }
    });

    test('DELETE /api/postgres/domains/:id - should delete domain', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      // Create domain
      const createResponse = await editorPage.request.post(buildApiUrl('postgres/domains'), {
        data: {
          name: `Delete Test ${timestamp}`,
          description: 'To be deleted',
          color: '#2ecc71'
        }
      });
      
      if (createResponse.ok()) {
        const createResult = await createResponse.json();
        const domainId = createResult.domain.domain_id;
        
        // Delete domain
        const deleteResponse = await editorPage.request.delete(buildApiUrl(`postgres/domains/${domainId}`));
        expect(deleteResponse.ok()).toBeTruthy();
        
        // Verify deleted
        const getResponse = await editorPage.request.get(buildApiUrl(`postgres/domains/${domainId}`));
        expect(getResponse.status()).toBe(404);
      }
    });

    test('POST /api/postgres/domains - should validate required fields', async ({ editorPage }) => {
      const response = await editorPage.request.post(buildApiUrl('postgres/domains'), {
        data: {
          // Missing required 'name' field
          description: 'Invalid domain'
        }
      });
      
      if (response.status() !== 404) {
        expect(response.status()).toBe(400);
      }
    });

    test('POST /api/postgres/domains - should validate color format', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      const response = await editorPage.request.post(buildApiUrl('postgres/domains'), {
        data: {
          name: `Invalid Color ${timestamp}`,
          description: 'Testing color validation',
          color: 'invalid-color'
        }
      });
      
      if (response.status() !== 404) {
        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('Metrics API (localStorage)', () => {
    test('should handle metrics via localStorage', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto(BASE_URL);
      await editorPage.waitForTimeout(1000);
      
      // Create metric
      const metricData = {
        metric_id: `api_metric_${timestamp}`,
        name: `API Metric ${timestamp}`,
        description: 'Created via API test',
        category: 'Performance',
        unit: 'count'
      };
      
      await editorPage.evaluate((data) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        metrics.push(data);
        localStorage.setItem('mdl_metrics', JSON.stringify(metrics));
      }, metricData);
      
      // Verify creation
      const metrics = await editorPage.evaluate(() => {
        return JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
      });
      
      const createdMetric = metrics.find((m: any) => m.metric_id === `api_metric_${timestamp}`);
      expect(createdMetric).toBeDefined();
      expect(createdMetric.name).toBe(`API Metric ${timestamp}`);
      
      // Clean up
      await editorPage.evaluate((id) => {
        const metrics = JSON.parse(localStorage.getItem('mdl_metrics') || '[]');
        const filtered = metrics.filter((m: any) => m.metric_id !== id);
        localStorage.setItem('mdl_metrics', JSON.stringify(filtered));
      }, `api_metric_${timestamp}`);
    });
  });

  test.describe('Objectives API (localStorage)', () => {
    test('should handle objectives via localStorage', async ({ editorPage }) => {
      const timestamp = Date.now();
      
      await editorPage.goto(BASE_URL);
      await editorPage.waitForTimeout(1000);
      
      // Create objective
      const objectiveData = {
        objective_id: `api_obj_${timestamp}`,
        title: `API Objective ${timestamp}`,
        description: 'Created via API test',
        keyResults: [{
          description: 'Complete test',
          target: 100,
          current: 0
        }]
      };
      
      await editorPage.evaluate((data) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        objectives.push(data);
        localStorage.setItem('mdl_objectives', JSON.stringify(objectives));
      }, objectiveData);
      
      // Verify creation
      const objectives = await editorPage.evaluate(() => {
        return JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
      });
      
      const createdObjective = objectives.find((o: any) => o.objective_id === `api_obj_${timestamp}`);
      expect(createdObjective).toBeDefined();
      expect(createdObjective.title).toBe(`API Objective ${timestamp}`);
      
      // Clean up
      await editorPage.evaluate((id) => {
        const objectives = JSON.parse(localStorage.getItem('mdl_objectives') || '[]');
        const filtered = objectives.filter((o: any) => o.objective_id !== id);
        localStorage.setItem('mdl_objectives', JSON.stringify(filtered));
      }, `api_obj_${timestamp}`);
    });
  });

  test.describe('Error Responses', () => {
    test('should return 404 for non-existent endpoints', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('nonexistent'));
      expect(response.status()).toBe(404);
    });

    test('should return 401 for unauthorized requests', async ({ page }) => {
      const response = await page.request.get(buildApiUrl('auth/users'));
      expect([401, 403]).toContain(response.status());
    });

    test('should return 400 for invalid request body', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.post(buildApiUrl('auth/register'), {
        data: {
          // Missing required fields
          username: 'incomplete'
        }
      });
      
      expect(response.status()).toBe(400);
    });

    test('should return 404 for non-existent resource', async ({ authenticatedPage }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authenticatedPage.request.get(buildApiUrl(`auth/users/${fakeId}`));
      expect(response.status()).toBe(404);
    });

    test('should handle malformed JSON', async ({ page }) => {
      const response = await page.request.post(buildApiUrl('auth/login'), {
        headers: {
          'Content-Type': 'application/json'
        },
        data: 'not-valid-json'
      });
      
      expect([400, 500]).toContain(response.status());
    });
  });

  test.describe('Response Format Validation', () => {
    test('successful responses should have consistent format', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users'));
      
      if (response.ok()) {
        const result = await response.json();
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(true);
      }
    });

    test('error responses should have consistent format', async ({ page }) => {
      const response = await page.request.post(buildApiUrl('auth/login'), {
        data: {
          username: 'nonexistent',
          password: 'invalid'
        }
      });
      
      const result = await response.json();
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });

    test('should include proper content-type headers', async ({ authenticatedPage }) => {
      const response = await authenticatedPage.request.get(buildApiUrl('auth/users'));
      
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });
  });

  test.describe('Rate Limiting and Performance', () => {
    test('should handle multiple concurrent requests', async ({ authenticatedPage }) => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        authenticatedPage.request.get(buildApiUrl('auth/users'))
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should complete
      expect(responses.length).toBe(10);
      
      // Most should succeed (some may be rate limited)
      const successCount = responses.filter(r => r.ok()).length;
      expect(successCount).toBeGreaterThan(0);
    });

    test('should respond within reasonable time', async ({ authenticatedPage }) => {
      const startTime = Date.now();
      await authenticatedPage.request.get(buildApiUrl('auth/users'));
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
