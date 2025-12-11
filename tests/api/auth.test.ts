/**
 * Unit Tests for Authentication API Routes
 * 
 * Focuses on error handling and edge cases not covered by integration tests.
 */

import express, { Application, NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { createAuthRouter } from '../../src/api/auth';
import { IUserStore } from '../../src/auth/IUserStore';
import * as jwt from '../../src/auth/jwt';
import { ApiKey, RefreshToken, User, UserRole, UserStatus } from '../../src/models/User';

// Mock dependencies BEFORE imports
jest.mock('../../src/auth/jwt');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = {
      user_id: req.headers.authorization?.includes('admin') ? 'admin-id' : 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: req.headers.authorization?.includes('admin') ? 'admin' : 'viewer',
      status: 'active',
    };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
  requireOwnerOrAdmin: () => (req: any, res: any, next: any) => {
    if (req.user?.role !== 'admin' && req.user?.user_id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  },
}));

describe('Auth Router Unit Tests', () => {
  let app: Application;
  let mockUserStore: jest.Mocked<IUserStore>;
  let mockJwt: jest.Mocked<typeof jwt>;

  const sampleUser: User = {
    user_id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    full_name: 'Test User',
    role: UserRole.VIEWER,
    status: UserStatus.ACTIVE,
    created_at: new Date(),
    updated_at: new Date(),
    last_login_at: undefined,
  };

  beforeEach(() => {
    // Create mock user store
    mockUserStore = {
      initialize: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastLogin: jest.fn(),
      changePassword: jest.fn(),
      saveRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllRefreshTokens: jest.fn(),
      saveApiKey: jest.fn(),
      findApiKey: jest.fn(),
      findApiKeyByHash: jest.fn(),
      listApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      updateApiKeyLastUsed: jest.fn(),
      cleanupExpired: jest.fn(),
    } as jest.Mocked<IUserStore>;

    mockJwt = jwt as jest.Mocked<typeof jwt>;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(mockUserStore));
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || err.statusCode || 500).json({
        error: err.message || 'Internal Server Error',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    beforeEach(() => {
      mockJwt.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] });
      mockJwt.hashPassword.mockResolvedValue('hashed_password');
      mockJwt.generateAuthTokens.mockReturnValue({
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        token_id: 'token-123',
        expires_in: 900,
      });
      mockJwt.hashRefreshToken.mockReturnValue('hashed_refresh');
    });

    it('should reject weak password', async () => {
      // Password 'weak' fails Joi validation (needs uppercase, number, special char)
      // So we expect Joi validation error, not password strength error
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user',
          email: 'user@test.com',
          password: 'weak',
          full_name: 'User',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle create error', async () => {
      mockUserStore.create.mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user',
          email: 'user@test.com',
          password: 'SecurePass123!',
          full_name: 'User',
        })
        .expect(500);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => {
      mockJwt.verifyPassword.mockResolvedValue(true);
      mockJwt.generateAuthTokens.mockReturnValue({
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        token_id: 'token-123',
        expires_in: 900,
      });
      mockJwt.hashRefreshToken.mockReturnValue('hashed_refresh');
    });

    it('should reject non-existent user', async () => {
      mockUserStore.findByUsername.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'none', password: 'ValidPass123!' })
        .expect(401);

      expect(response.body.error).toBe('Invalid username or password');
    });

    it('should reject inactive user', async () => {
      mockUserStore.findByUsername.mockResolvedValue({
        ...sampleUser,
        status: UserStatus.SUSPENDED,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'ValidPass123!' })
        .expect(401);

      expect(response.body.error).toBe('Account is not active');
    });

    it('should reject invalid password', async () => {
      mockUserStore.findByUsername.mockResolvedValue(sampleUser);
      mockJwt.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'WrongPass123!' })
        .expect(401);

      expect(response.body.error).toBe('Invalid username or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    const validToken: RefreshToken = {
      token_id: 'token-123',
      user_id: 'user-123',
      token_hash: 'hashed_refresh',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      revoked: false,
    };

    beforeEach(() => {
      mockJwt.verifyRefreshToken.mockReturnValue({ token_id: 'token-123', user_id: 'user-123' } as any);
      mockJwt.hashRefreshToken.mockReturnValue('hashed_refresh');
      mockJwt.generateAuthTokens.mockReturnValue({
        access_token: 'new_token',
        refresh_token: 'new_refresh',
        token_type: 'Bearer',
        token_id: 'token-456',
        expires_in: 900,
      });
    });

    it('should reject invalid token', async () => {
      mockUserStore.findRefreshToken.mockResolvedValue(null);

      await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid' })
        .expect(401);
    });

    it('should reject mismatched hash', async () => {
      mockUserStore.findRefreshToken.mockResolvedValue({ ...validToken, token_hash: 'different' });

      await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'token' })
        .expect(401);
    });

    it('should reject when user not found', async () => {
      mockUserStore.findRefreshToken.mockResolvedValue(validToken);
      mockUserStore.findById.mockResolvedValue(null);

      await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'token' })
        .expect(401);
    });

    it('should reject inactive user', async () => {
      mockUserStore.findRefreshToken.mockResolvedValue(validToken);
      mockUserStore.findById.mockResolvedValue({ ...sampleUser, status: UserStatus.SUSPENDED });

      await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout with valid refresh token', async () => {
      mockJwt.verifyRefreshToken.mockReturnValue({ token_id: 'token-123', user_id: 'user-123' });
      mockUserStore.revokeRefreshToken.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer token')
        .send({ refresh_token: 'valid_refresh_token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
      expect(mockUserStore.revokeRefreshToken).toHaveBeenCalledWith('token-123');
    });

    it('should succeed even with invalid refresh token', async () => {
      mockJwt.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer token')
        .send({ refresh_token: 'invalid_token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 404 when user not found', async () => {
      mockUserStore.findById.mockResolvedValue(null);

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token')
        .expect(404);
    });
  });

  describe('POST /api/auth/change-password', () => {
    beforeEach(() => {
      mockJwt.verifyPassword.mockResolvedValue(true);
      mockJwt.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] });
      mockJwt.hashPassword.mockResolvedValue('new_hash');
    });

    it('should return 404 when user not found', async () => {
      mockUserStore.findById.mockResolvedValue(null);

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer token')
        .send({ current_password: 'old', new_password: 'NewPass123!' })
        .expect(404);
    });

    it('should reject incorrect current password', async () => {
      mockUserStore.findById.mockResolvedValue(sampleUser);
      mockJwt.verifyPassword.mockResolvedValue(false);

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer token')
        .send({ current_password: 'wrong', new_password: 'NewPass123!' })
        .expect(401);
    });

    it('should reject weak new password', async () => {
      mockUserStore.findById.mockResolvedValue(sampleUser);
      mockJwt.validatePasswordStrength.mockReturnValue({ valid: false, errors: ['Too weak'] });

      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer token')
        .send({ current_password: 'old', new_password: 'weak' })
        .expect(400);
    });

    it('should successfully change password', async () => {
      mockUserStore.findById.mockResolvedValue(sampleUser);
      mockJwt.verifyPassword.mockResolvedValue(true);
      mockJwt.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] });
      mockJwt.hashPassword.mockResolvedValue('new_hashed_password');
      mockUserStore.changePassword.mockResolvedValue();
      mockUserStore.revokeAllRefreshTokens.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer token')
        .send({ current_password: 'OldPass123!', new_password: 'NewPass123!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
      expect(mockUserStore.changePassword).toHaveBeenCalledWith('user-123', 'new_hashed_password');
      expect(mockUserStore.revokeAllRefreshTokens).toHaveBeenCalledWith('user-123');
    });
  });

  describe('GET /api/auth/api-keys', () => {
    it('should list user API keys', async () => {
      const mockApiKeys = [
        {
          key_id: 'key-1',
          user_id: 'user-123',
          name: 'Test Key 1',
          description: '',
          scopes: ['metrics:read'],
          created_at: new Date(),
          last_used_at: undefined,
          expires_at: undefined,
          revoked: false,
        },
        {
          key_id: 'key-2',
          user_id: 'user-123',
          name: 'Test Key 2',
          description: '',
          scopes: ['metrics:write'],
          created_at: new Date(),
          last_used_at: undefined,
          expires_at: undefined,
          revoked: false,
        },
      ];
      mockUserStore.listApiKeys.mockResolvedValue(mockApiKeys);

      const response = await request(app)
        .get('/api/auth/api-keys')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.api_keys).toHaveLength(2);
      expect(response.body.api_keys[0].key_id).toBe('key-1');
      expect(response.body.api_keys[1].key_id).toBe('key-2');
      expect(mockUserStore.listApiKeys).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /api/auth/api-keys', () => {
    beforeEach(() => {
      mockJwt.generateApiKey.mockReturnValue('generated_key');
      mockJwt.hashApiKey.mockReturnValue('hashed_key');
    });

    it('should create API key', async () => {
      mockUserStore.saveApiKey.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Test Key', scopes: ['metrics:read'] })
        .expect(201);

      expect(response.body.api_key).toBe('generated_key');
    });

    it('should handle save error', async () => {
      mockUserStore.saveApiKey.mockRejectedValue(new Error('Save failed'));

      await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Test Key', scopes: ['metrics:read'] })
        .expect(500);
    });
  });

  describe('DELETE /api/auth/api-keys/:id', () => {
    const validKeyId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const apiKey: ApiKey = {
      key_id: validKeyId,
      user_id: 'user-123',
      key_hash: 'hash',
      name: 'Test',
      description: '',
      scopes: ['metrics:read'],
      created_at: new Date(),
      last_used_at: undefined,
      expires_at: undefined,
      revoked: false,
    };

    it('should return 404 when key not found', async () => {
      mockUserStore.findApiKey.mockResolvedValue(null);

      await request(app)
        .delete(`/api/auth/api-keys/${validKeyId}`)
        .set('Authorization', 'Bearer token')
        .expect(404);
    });

    it('should reject revoking another user key', async () => {
      mockUserStore.findApiKey.mockResolvedValue({ ...apiKey, user_id: 'other' });

      await request(app)
        .delete(`/api/auth/api-keys/${validKeyId}`)
        .set('Authorization', 'Bearer token')
        .expect(401);
    });

    it('should successfully revoke own key', async () => {
      mockUserStore.findApiKey.mockResolvedValue(apiKey);
      mockUserStore.revokeApiKey.mockResolvedValue();

      const response = await request(app)
        .delete(`/api/auth/api-keys/${validKeyId}`)
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('API key revoked');
      expect(mockUserStore.revokeApiKey).toHaveBeenCalledWith(validKeyId);
    });

    it('should allow admin to revoke any key', async () => {
      mockUserStore.findApiKey.mockResolvedValue({ ...apiKey, user_id: 'other' });
      mockUserStore.revokeApiKey.mockResolvedValue();

      await request(app)
        .delete(`/api/auth/api-keys/${validKeyId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);
    });
  });

  describe('POST /api/auth/users (admin)', () => {
    beforeEach(() => {
      mockJwt.validatePasswordStrength.mockReturnValue({ valid: true, errors: [] });
      mockJwt.hashPassword.mockResolvedValue('hashed');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          username: 'new',
          email: 'new@test.com',
          password: 'weak',
          full_name: 'New User',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });

    it('should create user with custom status', async () => {
      const createdUser = { ...sampleUser, status: UserStatus.ACTIVE };
      const updatedUser = { ...sampleUser, status: UserStatus.SUSPENDED };
      
      mockUserStore.create.mockResolvedValue(createdUser);
      mockUserStore.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .post('/api/auth/users')
        .set('Authorization', 'Bearer admin-token')
        .send({
          username: 'new',
          email: 'new@test.com',
          password: 'SecurePass123!',
          full_name: 'New User',
          status: 'suspended',
        })
        .expect(201);

      expect(mockUserStore.update).toHaveBeenCalled();
      expect(response.body.user.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('GET /api/auth/users (admin)', () => {
    it('should list with filters', async () => {
      mockUserStore.list.mockResolvedValue([sampleUser]);

      await request(app)
        .get('/api/auth/users?role=viewer&limit=10')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(mockUserStore.list).toHaveBeenCalledWith({
        limit: 10,
        offset: undefined,
        role: 'viewer',
        status: undefined,
      });
    });
  });

  describe('GET /api/auth/users/:id (admin)', () => {
    it('should return 404 when not found', async () => {
      mockUserStore.findById.mockResolvedValue(null);

      const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
      await request(app)
        .get(`/api/auth/users/${validUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('PUT /api/auth/users/:id (admin)', () => {
    it('should return 404 when not found', async () => {
      mockUserStore.update.mockResolvedValue(null);

      const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
      await request(app)
        .put(`/api/auth/users/${validUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .send({ full_name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/auth/users/:id (admin)', () => {
    it('should prevent deleting own account', async () => {
      await request(app)
        .delete('/api/auth/users/admin-id')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });

    it('should return 404 when not found', async () => {
      mockUserStore.delete.mockResolvedValue(false);

      const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
      await request(app)
        .delete(`/api/auth/users/${validUserId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });
});
