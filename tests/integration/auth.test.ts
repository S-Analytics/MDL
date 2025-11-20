/**
 * Integration Tests for Authentication API
 * 
 * Tests authentication endpoints including registration, login, token refresh,
 * password changes, and API key management.
 */

import { Application } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { FileUserStore } from '../../src/auth/FileUserStore';
import { cleanupTestServer, createTestServer, createTestUserWithToken } from '../helpers/testServer';

describe('Authentication API Integration Tests', () => {
  let app: Application;
  let userStore: FileUserStore;
  const testAuthFile = path.join(process.cwd(), 'data', 'test-users.json');

  beforeAll(async () => {
    // Create test auth file
    const dir = path.dirname(testAuthFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(testAuthFile, JSON.stringify({
      users: [],
      refreshTokens: [],
      apiKeys: [],
    }));

    userStore = new FileUserStore(testAuthFile);
    await userStore.initialize();

    app = await createTestServer({ authEnabled: true, userStore });
  });

  afterAll(() => {
    cleanupTestServer();
  });

  beforeEach(async () => {
    // Clean up users between tests - ensure file is properly reset
    const emptyData = {
      users: [],
      refreshTokens: [],
      apiKeys: [],
    };
    
    // Write synchronously and ensure it's complete
    try {
      fs.writeFileSync(testAuthFile, JSON.stringify(emptyData, null, 2), 'utf-8');
      
      // Verify the file was written correctly before reinitializing
      const content = fs.readFileSync(testAuthFile, 'utf-8');
      if (!content || content.trim() === '') {
        throw new Error('Failed to write test auth file');
      }
      
      await userStore.initialize();
    } catch (error) {
      console.error('Error in beforeEach cleanup:', error);
      // Recreate the file if something went wrong
      fs.writeFileSync(testAuthFile, JSON.stringify(emptyData, null, 2), 'utf-8');
      await userStore.initialize();
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          full_name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.email).toBe('newuser@test.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('access_token');
      expect(response.body.tokens).toHaveProperty('refresh_token');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakpass',
          email: 'weak@test.com',
          password: 'weak',
          full_name: 'Weak Password User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      // Message could be "Validation failed" or contain password requirement details
      expect(response.body.error.message.toLowerCase()).toMatch(/password|validation/);
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invalidemail',
          email: 'not-an-email',
          password: 'ValidPass123!',
          full_name: 'Invalid Email User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          email: 'first@test.com',
          password: 'Pass123!',
          full_name: 'First User',
        })
        .expect(201);

      // Try to create second user with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          email: 'second@test.com',
          password: 'Pass123!',
          full_name: 'Second User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message.toLowerCase()).toContain('username');
    });

    it('should set default role to viewer', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'defaultrole',
          email: 'default@test.com',
          password: 'Pass123!',
          full_name: 'Default Role User',
        })
        .expect(201);

      expect(response.body.user.role).toBe('viewer');
    });
  });

  describe('POST /api/auth/login', () => {
    let loginUsername: string;
    
    beforeEach(async () => {
      // Create a test user for login tests with unique username each time
      loginUsername = `loginuser_${Date.now()}`;
      await createTestUserWithToken(userStore, {
        username: loginUsername,
        email: `${loginUsername}@test.com`,
        password: 'LoginPass123!',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: loginUsername,
          password: 'LoginPass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(loginUsername);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('access_token');
      expect(response.body.tokens).toHaveProperty('refresh_token');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: loginUsername,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Pass123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject login with missing credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: loginUsername,
        })
        .expect(400);

      await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Pass123!',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let refreshUsername: string;

    beforeEach(async () => {
      refreshUsername = `refreshuser_${Date.now()}`;
      const { refreshToken: token } = await createTestUserWithToken(userStore, {
        username: refreshUsername,
        email: `${refreshUsername}@test.com`,
        password: 'RefreshPass123!',
      });
      refreshToken = token;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('access_token');
      expect(response.body.tokens).toHaveProperty('refresh_token');
      expect(response.body.tokens.refresh_token).not.toBe(refreshToken); // Should get new refresh token
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject refresh with missing token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;
    let refreshToken: string;
    const logoutUsername = `logoutuser_${Date.now()}`;

    beforeEach(async () => {
      const result = await createTestUserWithToken(userStore, {
        username: logoutUsername,
        email: `${logoutUsername}@test.com`,
        password: 'LogoutPass123!',
      });
      token = result.token;
      refreshToken = result.refreshToken;
    });

    it('should logout user with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out');
    });

    it('should reject logout without authentication', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;
    let meUsername: string;

    beforeEach(async () => {
      meUsername = `meuser_${Date.now()}`;
      const result = await createTestUserWithToken(userStore, {
        username: meUsername,
        email: `${meUsername}@test.com`,
        password: 'MePass123!',
      });
      token = result.token;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(meUsername);
      expect(response.body.user.email).toBe(`${meUsername}@test.com`);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
