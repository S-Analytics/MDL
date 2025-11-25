/**
 * Authentication Middleware Tests
 * Tests for authenticate, authorize, and related middleware
 */

import { NextFunction, Request, Response } from 'express';
import { IUserStore } from '../../src/auth/IUserStore';
import {
    authenticate,
    authenticateApiKey,
    authorize,
    optionalAuthenticate,
    requireAdmin,
    requireEditor,
    requireOwnerOrAdmin,
} from '../../src/middleware/auth';
import { UserRole, UserStatus } from '../../src/models/User';
import { AuthenticationError, AuthorizationError } from '../../src/utils/errors';
import {
    createInvalidToken,
    createMockJWTPayload,
    createMockNext,
    createMockRequest,
    createMockResponse,
    generateTestAccessToken,
} from '../helpers/auth';
import { createTestApiKey } from '../helpers/factories';

describe('Authentication Middleware', () => {
  describe('authenticate', () => {
    it('should authenticate user with valid token', () => {
      const token = generateTestAccessToken(UserRole.EDITOR);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.role).toBe(UserRole.EDITOR);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(req.user).toBeUndefined();
    });

    it('should reject request with invalid token', () => {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${createInvalidToken()}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(req.user).toBeUndefined();
    });

    it('should reject request with malformed authorization header', () => {
      const req = createMockRequest({
        headers: { authorization: 'NotBearer token123' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should reject request with missing token after Bearer', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should attach user info to request', () => {
      const token = generateTestAccessToken(UserRole.ADMIN);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.user_id).toBeDefined();
      expect(req.user?.username).toBeDefined();
      expect(req.user?.email).toBeDefined();
      expect(req.user?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate user when valid token provided', () => {
      const token = generateTestAccessToken(UserRole.EDITOR);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      optionalAuthenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.role).toBe(UserRole.EDITOR);
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user when no token provided', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      optionalAuthenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid token provided', () => {
      const req = createMockRequest({
        headers: { authorization: `Bearer ${createInvalidToken()}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      optionalAuthenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    it('should allow user with correct role', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ role: UserRole.ADMIN }),
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow user with any of the allowed roles', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ role: UserRole.EDITOR }),
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN, UserRole.EDITOR]);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject user with insufficient role', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ role: UserRole.VIEWER }),
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN]);

      expect(() => middleware(req, res, next)).toThrow(AuthorizationError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without user', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN]);

      expect(() => middleware(req, res, next)).toThrow(AuthenticationError);
    });

    it('should reject viewer trying to access admin-only resource', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ role: UserRole.VIEWER }),
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN]);

      expect(() => middleware(req, res, next)).toThrow(AuthorizationError);
    });

    it('should reject editor trying to access admin-only resource', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ role: UserRole.EDITOR }),
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authorize([UserRole.ADMIN]);

      expect(() => middleware(req, res, next)).toThrow(AuthorizationError);
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user', () => {
      const token = generateTestAccessToken(UserRole.ADMIN);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireAdmin(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.role).toBe(UserRole.ADMIN);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject editor user', () => {
      const token = generateTestAccessToken(UserRole.EDITOR);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should reject viewer user', () => {
      const token = generateTestAccessToken(UserRole.VIEWER);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should reject unauthenticated request', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('requireEditor', () => {
    it('should allow admin user', () => {
      const token = generateTestAccessToken(UserRole.ADMIN);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireEditor(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow editor user', () => {
      const token = generateTestAccessToken(UserRole.EDITOR);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireEditor(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject viewer user', () => {
      const token = generateTestAccessToken(UserRole.VIEWER);
      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireEditor(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should reject unauthenticated request', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      requireEditor(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('requireOwnerOrAdmin', () => {
    const getUserIdFromParams = (req: Request) => req.params.id;

    it('should allow user to access their own resource', () => {
      const userId = 'user-123';
      const req = createMockRequest({
        user: createMockJWTPayload({ user_id: userId, role: UserRole.VIEWER }),
        params: { id: userId },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = requireOwnerOrAdmin(getUserIdFromParams);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow admin to access any resource', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ user_id: 'admin-123', role: UserRole.ADMIN }),
        params: { id: 'different-user-456' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = requireOwnerOrAdmin(getUserIdFromParams);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject user trying to access another user\'s resource', () => {
      const req = createMockRequest({
        user: createMockJWTPayload({ user_id: 'user-123', role: UserRole.VIEWER }),
        params: { id: 'different-user-456' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = requireOwnerOrAdmin(getUserIdFromParams);

      expect(() => middleware(req, res, next)).toThrow(AuthorizationError);
      expect(() => middleware(req, res, next)).toThrow('You can only access your own resources');
    });

    it('should reject unauthenticated request', () => {
      const req = createMockRequest({
        params: { id: 'user-123' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = requireOwnerOrAdmin(getUserIdFromParams);

      expect(() => middleware(req, res, next)).toThrow(AuthenticationError);
    });
  });

  describe('authenticateApiKey', () => {
    it('should authenticate user with valid API key', async () => {
      const userId = 'test-user-123';
      const apiKey = createTestApiKey({ user_id: userId });
      
      const mockUserStore: Partial<IUserStore> = {
        findApiKeyByHash: jest.fn().mockResolvedValue(apiKey),
        findById: jest.fn().mockResolvedValue({
          user_id: userId,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          full_name: 'Test User',
          role: UserRole.EDITOR,
          status: UserStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      const req = createMockRequest({
        headers: { 'x-api-key': 'test-api-key' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authenticateApiKey(() => mockUserStore as IUserStore);
      await middleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.user_id).toBe(userId);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject request without API key', async () => {
      const mockUserStore: Partial<IUserStore> = {};

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authenticateApiKey(() => mockUserStore as IUserStore);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should reject request with invalid API key', async () => {
      const mockUserStore: Partial<IUserStore> = {
        findApiKeyByHash: jest.fn().mockResolvedValue(null),
      };

      const req = createMockRequest({
        headers: { 'x-api-key': 'invalid-api-key' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authenticateApiKey(() => mockUserStore as IUserStore);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should reject API key for inactive user', async () => {
      const userId = 'test-user-123';
      const apiKey = createTestApiKey({ user_id: userId });
      
      const mockUserStore: Partial<IUserStore> = {
        findApiKeyByHash: jest.fn().mockResolvedValue(apiKey),
        findById: jest.fn().mockResolvedValue({
          user_id: userId,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          full_name: 'Test User',
          role: UserRole.EDITOR,
          status: UserStatus.INACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      const req = createMockRequest({
        headers: { 'x-api-key': 'test-api-key' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext() as NextFunction;

      const middleware = authenticateApiKey(() => mockUserStore as IUserStore);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });
});
