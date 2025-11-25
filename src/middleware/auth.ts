/**
 * Authentication and authorization middleware
 * Protects routes and checks user permissions
 */

import { NextFunction, Request, Response } from 'express';
import { IUserStore } from '../auth/IUserStore';
import { extractBearerToken, hashApiKey, verifyAccessToken } from '../auth/jwt';
import { JWTPayload, UserRole, toUserSafe } from '../models/User';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * 
 * @example
 * ```typescript
 * app.get('/api/protected', authenticate, (req, res) => {
 *   // req.user is available
 * });
 * ```
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify and decode token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = payload;

    // Log authentication
    if (req.log) {
      req.log.info(
        { user_id: payload.user_id, username: payload.username },
        'User authenticated'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 * 
 * @example
 * ```typescript
 * app.get('/api/optional-auth', optionalAuthenticate, (req, res) => {
 *   if (req.user) {
 *     // User is authenticated
 *   } else {
 *     // User is not authenticated, but that's okay
 *   }
 * });
 * ```
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (_error: unknown) {
    // Ignore authentication errors for optional auth - continue without user
    // This is expected behavior for optional authentication
    next();
  }
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 * 
 * @param allowedRoles - Roles that are allowed to access the route
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * app.post('/api/admin',
 *   authenticate,
 *   authorize([UserRole.ADMIN]),
 *   handler
 * );
 * ```
 */
export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        {
          user_id: req.user.user_id,
          username: req.user.username,
          role: req.user.role,
          required_roles: allowedRoles,
          path: req.path,
        },
        'Authorization failed'
      );

      throw new AuthorizationError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    next();
  };
}

/**
 * Checks if user is admin
 * Combines authentication and authorization
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    authenticate(req, res, () => {
      try {
        authorize([UserRole.ADMIN])(req, res, next);
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Checks if user is editor or admin
 * Combines authentication and authorization
 */
export function requireEditor(req: Request, res: Response, next: NextFunction): void {
  try {
    authenticate(req, res, () => {
      try {
        authorize([UserRole.EDITOR, UserRole.ADMIN])(req, res, next);
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Checks if user is viewer, editor, or admin (i.e., any authenticated user)
 * Shorthand for authenticate middleware
 */
export const requireAuth = authenticate;

/**
 * Middleware to check if user owns the resource or is admin
 * 
 * @param getUserIdFromRequest - Function to extract user_id from request
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * app.put('/api/users/:id',
 *   authenticate,
 *   requireOwnerOrAdmin((req) => req.params.id),
 *   handler
 * );
 * ```
 */
export function requireOwnerOrAdmin(
  getUserIdFromRequest: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const resourceUserId = getUserIdFromRequest(req);
    const isOwner = req.user.user_id === resourceUserId;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      logger.warn(
        {
          user_id: req.user.user_id,
          resource_user_id: resourceUserId,
          path: req.path,
        },
        'Ownership authorization failed'
      );

      throw new AuthorizationError(
        'Access denied. You can only access your own resources.'
      );
    }

    next();
  };
}

/**
 * API Key authentication middleware factory
 * Verifies API key from X-API-Key header
 * 
 * @param getUserStore - Function to get user store instance
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/public',
 *   authenticateApiKey(() => userStore),
 *   handler
 * );
 * ```
 */
export function authenticateApiKey(getUserStore: () => IUserStore) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new AuthenticationError('No API key provided');
      }

      const userStore = getUserStore();
      const keyHash = hashApiKey(apiKey);
      const apiKeyRecord = await userStore.findApiKeyByHash(keyHash);

      if (!apiKeyRecord) {
        throw new AuthenticationError('Invalid API key');
      }

      // Get user for the API key
      const user = await userStore.findById(apiKeyRecord.user_id);
      if (!user?.status || user.status !== 'active') {
        throw new AuthenticationError('Invalid API key');
      }

      // Attach user to request
      const userSafe = toUserSafe(user);
      req.user = {
        user_id: userSafe.user_id,
        username: userSafe.username,
        email: userSafe.email,
        role: userSafe.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
