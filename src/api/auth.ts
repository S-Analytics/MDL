/**
 * Authentication and user management API routes
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IUserStore } from '../auth/IUserStore';
import {
    generateApiKey,
    generateAuthTokens,
    hashApiKey,
    hashPassword,
    hashRefreshToken,
    validatePasswordStrength,
    verifyPassword,
    verifyRefreshToken,
} from '../auth/jwt';
import {
    authenticate,
    requireAdmin,
    requireOwnerOrAdmin,
} from '../middleware/auth';
import {
    validateBody,
    validateParams,
    validateQuery,
} from '../middleware/validation';
import {
    ApiKey,
    RefreshToken,
    toUserSafe,
    UserCreateInput,
    UserRole,
} from '../models/User';
import {
    asyncHandler,
    AuthenticationError,
    NotFoundError,
    ValidationError,
} from '../utils/errors';
import {
    adminCreateUserSchema,
    apiKeyCreateSchema,
    apiKeyIdParamSchema,
    changePasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    userIdParamSchema,
    userListQuerySchema,
    userUpdateSchema,
} from '../validation/schemas';

export function createAuthRouter(userStore: IUserStore) {
  const router = express.Router();

  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * POST /auth/register
   * Register a new user
   */
  router.post(
    '/register',
    validateBody(registerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, email, password, full_name, role } = req.body;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.errors.join('; '));
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user
      const userData: UserCreateInput = {
        username,
        email,
        password_hash,
        full_name,
        role: role || UserRole.VIEWER,
      };

      const user = await userStore.create(userData);

      // Generate tokens
      const tokens = generateAuthTokens(toUserSafe(user));

      // Store refresh token
      const refreshToken: RefreshToken = {
        token_id: tokens.token_id,
        user_id: user.user_id,
        token_hash: hashRefreshToken(tokens.refresh_token),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date(),
        revoked: false,
      };
      await userStore.saveRefreshToken(user.user_id, refreshToken);

      res.status(201).json({
        success: true,
        user: toUserSafe(user),
        tokens,
      });
    })
  );

  /**
   * POST /auth/login
   * Login with username and password
   */
  router.post(
    '/login',
    validateBody(loginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, password } = req.body;

      // Find user
      const user = await userStore.findByUsername(username);
      if (!user) {
        throw new AuthenticationError('Invalid username or password');
      }

      // Check user status
      if (user.status !== 'active') {
        throw new AuthenticationError('Account is not active');
      }

      // Verify password
      const validPassword = await verifyPassword(password, user.password_hash);
      if (!validPassword) {
        throw new AuthenticationError('Invalid username or password');
      }

      // Update last login
      await userStore.updateLastLogin(user.user_id);

      // Generate tokens
      const tokens = generateAuthTokens(toUserSafe(user));

      // Store refresh token
      const refreshToken: RefreshToken = {
        token_id: tokens.token_id,
        user_id: user.user_id,
        token_hash: hashRefreshToken(tokens.refresh_token),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date(),
        revoked: false,
      };
      await userStore.saveRefreshToken(user.user_id, refreshToken);

      res.json({
        success: true,
        user: toUserSafe(user),
        tokens,
      });
    })
  );

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  router.post(
    '/refresh',
    validateBody(refreshTokenSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { refresh_token } = req.body;

      // Verify refresh token
      const payload = verifyRefreshToken(refresh_token);
      const tokenHash = hashRefreshToken(refresh_token);

      // Find stored refresh token
      const storedToken = await userStore.findRefreshToken(payload.token_id);
      if (!storedToken?.token_hash || storedToken.token_hash !== tokenHash) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Find user
      const user = await userStore.findById(storedToken.user_id);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Check user status
      if (user.status !== 'active') {
        throw new AuthenticationError('Account is not active');
      }

      // Generate new tokens
      const tokens = generateAuthTokens(toUserSafe(user));

      // Store new refresh token and revoke old one
      await userStore.revokeRefreshToken(storedToken.token_id);
      const newRefreshToken: RefreshToken = {
        token_id: tokens.token_id,
        user_id: user.user_id,
        token_hash: hashRefreshToken(tokens.refresh_token),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date(),
        revoked: false,
      };
      await userStore.saveRefreshToken(user.user_id, newRefreshToken);

      res.json({
        success: true,
        tokens,
      });
    })
  );

  // ============================================================================
  // AUTHENTICATED ENDPOINTS
  // ============================================================================

  /**
   * POST /auth/logout
   * Logout (revoke refresh token)
   */
  router.post(
    '/logout',
    authenticate,
    validateBody(refreshTokenSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { refresh_token } = req.body;

      try {
        const payload = verifyRefreshToken(refresh_token);
        await userStore.revokeRefreshToken(payload.token_id);
      } catch (_error: unknown) {
        // Ignore errors - token might already be invalid/revoked
        // Log for debugging but still return success to client
        if (req.log) {
          req.log.debug('Error revoking refresh token during logout (expected if already invalid)');
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    })
  );

  /**
   * GET /auth/me
   * Get current user info
   */
  router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const user = await userStore.findById(req.user!.user_id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        user: toUserSafe(user),
      });
    })
  );

  /**
   * POST /auth/change-password
   * Change current user's password
   */
  router.post(
    '/change-password',
    authenticate,
    validateBody(changePasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { current_password, new_password } = req.body;
      const userId = req.user!.user_id;

      // Find user
      const user = await userStore.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const validPassword = await verifyPassword(current_password, user.password_hash);
      if (!validPassword) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(new_password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.errors.join('; '));
      }

      // Hash and update password
      const newPasswordHash = await hashPassword(new_password);
      await userStore.changePassword(userId, newPasswordHash);

      // Revoke all refresh tokens to force re-login on all devices
      await userStore.revokeAllRefreshTokens(userId);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again on all devices.',
      });
    })
  );

  // ============================================================================
  // API KEY ENDPOINTS
  // ============================================================================

  /**
   * GET /auth/api-keys
   * List current user's API keys
   */
  router.get(
    '/api-keys',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
      const apiKeys = await userStore.listApiKeys(req.user!.user_id);

      res.json({
        success: true,
        api_keys: apiKeys,
      });
    })
  );

  /**
   * POST /auth/api-keys
   * Create new API key
   */
  router.post(
    '/api-keys',
    authenticate,
    validateBody(apiKeyCreateSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { name, description, expires_at, scopes } = req.body;
      const userId = req.user!.user_id;

      // Generate API key
      const apiKeyValue = generateApiKey();
      const keyHash = hashApiKey(apiKeyValue);

      // Create API key record
      const apiKey: ApiKey = {
        key_id: uuidv4(),
        user_id: userId,
        key_hash: keyHash,
        name,
        description: description || '',
        scopes,
        created_at: new Date(),
        last_used_at: undefined,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        revoked: false,
      };

      await userStore.saveApiKey(userId, apiKey);

      res.status(201).json({
        success: true,
        api_key: apiKeyValue, // Return raw key only once
        key_info: {
          key_id: apiKey.key_id,
          name: apiKey.name,
          scopes: apiKey.scopes,
          created_at: apiKey.created_at,
          expires_at: apiKey.expires_at,
        },
        message: 'Store this API key securely. It will not be shown again.',
      });
    })
  );

  /**
   * DELETE /auth/api-keys/:id
   * Revoke API key
   */
  router.delete(
    '/api-keys/:id',
    authenticate,
    validateParams(apiKeyIdParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const keyId = req.params.id;
      const userId = req.user!.user_id;

      // Check if key belongs to user (unless admin)
      const apiKey = await userStore.findApiKey(keyId);
      if (!apiKey) {
        throw new NotFoundError('API key not found');
      }

      if (apiKey.user_id !== userId && req.user!.role !== UserRole.ADMIN) {
        throw new AuthenticationError('Cannot revoke another user\'s API key');
      }

      await userStore.revokeApiKey(keyId);

      res.json({
        success: true,
        message: 'API key revoked',
      });
    })
  );

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  /**
   * POST /auth/users
   * Create a new user (admin only)
   */
  router.post(
    '/users',
    authenticate,
    requireAdmin,
    validateBody(adminCreateUserSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, email, password, full_name, role, status } = req.body;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.errors.join('; '));
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Create user
      const userData: UserCreateInput = {
        username,
        email,
        password_hash,
        full_name,
        role: role || UserRole.VIEWER,
      };

      const user = await userStore.create(userData);

      // Update status if provided and not default active
      if (status && status !== 'active') {
        const updatedUser = await userStore.update(user.user_id, { 
          user_id: user.user_id,
          status 
        });
        if (updatedUser) {
          res.status(201).json({
            success: true,
            user: toUserSafe(updatedUser),
            message: 'User created successfully',
          });
          return;
        }
      }

      res.status(201).json({
        success: true,
        user: toUserSafe(user),
        message: 'User created successfully',
      });
    })
  );

  /**
   * GET /auth/users
   * List all users (admin only)
   */
  router.get(
    '/users',
    authenticate,
    requireAdmin,
    validateQuery(userListQuerySchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { limit, offset, role, status } = req.query as {
        limit?: string;
        offset?: string;
        role?: string;
        status?: string;
      };

      const users = await userStore.list({
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        offset: offset ? Number.parseInt(offset, 10) : undefined,
        role,
        status,
      });

      res.json({
        success: true,
        users,
        count: users.length,
      });
    })
  );

  /**
   * GET /auth/users/:id
   * Get user by ID (admin or owner)
   */
  router.get(
    '/users/:id',
    authenticate,
    validateParams(userIdParamSchema),
    requireOwnerOrAdmin((req) => req.params.id),
    asyncHandler(async (req: Request, res: Response) => {
      const user = await userStore.findById(req.params.id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        user: toUserSafe(user),
      });
    })
  );

  /**
   * PUT /auth/users/:id
   * Update user (admin only)
   */
  router.put(
    '/users/:id',
    authenticate,
    requireAdmin,
    validateParams(userIdParamSchema),
    validateBody(userUpdateSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.params.id;
      const updates = req.body;

      const user = await userStore.update(userId, updates);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        user: toUserSafe(user),
      });
    })
  );

  /**
   * DELETE /auth/users/:id
   * Delete user (admin only)
   */
  router.delete(
    '/users/:id',
    authenticate,
    requireAdmin,
    validateParams(userIdParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.params.id;

      // Prevent deleting yourself
      if (userId === req.user!.user_id) {
        throw new ValidationError('Cannot delete your own account');
      }

      const deleted = await userStore.delete(userId);

      if (!deleted) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        message: 'User deleted',
      });
    })
  );

  return router;
}
