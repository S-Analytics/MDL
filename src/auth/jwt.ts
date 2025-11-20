/**
 * JWT utilities for authentication
 * Handles token generation, verification, and refresh
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthTokens, JWTPayload, UserSafe } from '../models/User';
import { AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

// Load JWT secrets from environment
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

// Token expiry times (in seconds)
const ACCESS_TOKEN_EXPIRY = Number.parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '900', 10); // 15 minutes
const REFRESH_TOKEN_EXPIRY = Number.parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10); // 7 days

/**
 * Generates authentication tokens (access + refresh) for a user
 * 
 * @param user - User object (safe version without password_hash)
 * @param tokenId - Optional token ID for refresh token (will be generated if not provided)
 * @returns Access and refresh tokens with expiry and token_id
 */
export function generateAuthTokens(user: UserSafe, tokenId?: string): AuthTokens & { token_id: string } {
  const payload: JWTPayload = {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  // Generate access token
  const access_token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'mdl-api',
    audience: 'mdl-client',
  });

  // Generate or use provided token ID
  const token_id = tokenId || uuidv4();

  // Generate refresh token with longer expiry and token_id
  const refresh_token = jwt.sign(
    { user_id: user.user_id, token_id },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'mdl-api',
      audience: 'mdl-client',
    }
  );

  logger.info(
    { user_id: user.user_id, username: user.username, token_id },
    'Generated authentication tokens'
  );

  return {
    access_token,
    refresh_token,
    expires_in: ACCESS_TOKEN_EXPIRY,
    token_type: 'Bearer',
    token_id,
  };
}

/**
 * Verifies and decodes an access token
 * 
 * @param token - JWT access token
 * @returns Decoded payload
 * @throws AuthenticationError if token is invalid or expired
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mdl-api',
      audience: 'mdl-client',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid access token');
    }
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Verifies and decodes a refresh token
 * 
 * @param token - JWT refresh token
 * @returns Payload with user_id and token_id
 * @throws AuthenticationError if token is invalid or expired
 */
export function verifyRefreshToken(token: string): { user_id: string; token_id: string } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mdl-api',
      audience: 'mdl-client',
    }) as { user_id: string; token_id: string };

    if (decoded.user_id && decoded.token_id) {
      return { user_id: decoded.user_id, token_id: decoded.token_id };
    }
    throw new AuthenticationError('Invalid refresh token payload');
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Extracts token from Authorization header
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Hashes a password using bcrypt
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a password against its hash
 * 
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generates a random API key
 * 
 * @returns API key string (not hashed)
 */
export function generateApiKey(): string {
  // Format: mdl_<32 random hex chars>
  return `mdl_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hashes an API key for storage
 * 
 * @param apiKey - Plain API key
 * @returns Hashed API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verifies an API key against its hash
 * 
 * @param apiKey - Plain API key
 * @param hash - Hashed API key
 * @returns True if API key matches
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
}

/**
 * Generates a refresh token hash for storage
 * 
 * @param refreshToken - JWT refresh token
 * @returns Hash of refresh token
 */
export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

/**
 * Validates password strength
 * 
 * @param password - Password to validate
 * @returns Validation result with errors
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
