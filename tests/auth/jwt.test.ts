/**
 * JWT Utilities Tests
 * Tests for token generation, verification, and password management
 */

import {
    extractBearerToken,
    generateApiKey,
    generateAuthTokens,
    hashApiKey,
    hashPassword,
    hashRefreshToken,
    validatePasswordStrength,
    verifyAccessToken,
    verifyApiKey,
    verifyPassword,
    verifyRefreshToken,
} from '../../src/auth/jwt';
import { UserRole } from '../../src/models/User';
import { AuthenticationError } from '../../src/utils/errors';
import { createTestUserSafe } from '../helpers/factories';

describe('JWT Utilities', () => {
  describe('generateAuthTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user = createTestUserSafe();
      const tokens = generateAuthTokens(user);

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
      expect(tokens.token_type).toBe('Bearer');
      expect(tokens.expires_in).toBeGreaterThan(0);
      expect(tokens.token_id).toBeDefined();
    });

    it('should include user information in access token', () => {
      const user = createTestUserSafe({
        username: 'testuser123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      });

      const tokens = generateAuthTokens(user);
      const decoded = verifyAccessToken(tokens.access_token);

      expect(decoded.user_id).toBe(user.user_id);
      expect(decoded.username).toBe('testuser123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe(UserRole.ADMIN);
    });

    it('should use provided token_id if given', () => {
      const user = createTestUserSafe();
      const customTokenId = 'custom-token-id-123';
      
      const tokens = generateAuthTokens(user, customTokenId);
      
      expect(tokens.token_id).toBe(customTokenId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid access token', () => {
      const user = createTestUserSafe();
      const tokens = generateAuthTokens(user);
      
      const decoded = verifyAccessToken(tokens.access_token);
      
      expect(decoded.user_id).toBe(user.user_id);
      expect(decoded.username).toBe(user.username);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should throw AuthenticationError for invalid token', () => {
      const invalidToken = 'invalid.token.string';
      
      expect(() => verifyAccessToken(invalidToken)).toThrow(AuthenticationError);
      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid access token');
    });

    it('should throw AuthenticationError for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => verifyAccessToken(malformedToken)).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow(AuthenticationError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', () => {
      const user = createTestUserSafe();
      const tokens = generateAuthTokens(user);
      
      const decoded = verifyRefreshToken(tokens.refresh_token);
      
      expect(decoded.user_id).toBe(user.user_id);
      expect(decoded.token_id).toBe(tokens.token_id);
    });

    it('should throw AuthenticationError for invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token';
      
      expect(() => verifyRefreshToken(invalidToken)).toThrow(AuthenticationError);
      expect(() => verifyRefreshToken(invalidToken)).toThrow('Invalid refresh token');
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token-123';
      const authHeader = `Bearer ${token}`;
      
      const extracted = extractBearerToken(authHeader);
      
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractBearerToken(undefined);
      
      expect(extracted).toBeNull();
    });

    it('should return null for invalid format (no Bearer prefix)', () => {
      const extracted = extractBearerToken('test-token-123');
      
      expect(extracted).toBeNull();
    });

    it('should return null for wrong auth scheme', () => {
      const extracted = extractBearerToken('Basic dXNlcjpwYXNz');
      
      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const extracted = extractBearerToken('Bearer');
      
      expect(extracted).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'Test123!@#';
      
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test123!@#';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'Test123!@#';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test123!@#';
      const wrongPassword = 'Wrong123!@#';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should reject password with wrong case', async () => {
      const password = 'Test123!@#';
      const wrongCase = 'test123!@#';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongCase, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key with correct format', () => {
      const apiKey = generateApiKey();
      
      expect(apiKey).toMatch(/^mdl_[a-f0-9]{64}$/);
    });

    it('should generate unique API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should hash API key', () => {
      const apiKey = generateApiKey();
      
      const hash = hashApiKey(apiKey);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(apiKey);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should generate consistent hash for same API key', () => {
      const apiKey = generateApiKey();
      
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should verify correct API key', () => {
      const apiKey = generateApiKey();
      const hash = hashApiKey(apiKey);
      
      const isValid = verifyApiKey(apiKey, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key', () => {
      const apiKey1 = generateApiKey();
      const apiKey2 = generateApiKey();
      const hash = hashApiKey(apiKey1);
      
      const isValid = verifyApiKey(apiKey2, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('hashRefreshToken', () => {
    it('should hash refresh token', () => {
      const user = createTestUserSafe();
      const tokens = generateAuthTokens(user);
      
      const hash = hashRefreshToken(tokens.refresh_token);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(tokens.refresh_token);
      expect(hash.length).toBe(64); // SHA-256
    });

    it('should generate consistent hash', () => {
      const user = createTestUserSafe();
      const tokens = generateAuthTokens(user);
      
      const hash1 = hashRefreshToken(tokens.refresh_token);
      const hash2 = hashRefreshToken(tokens.refresh_token);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('Test123!@#');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const result = validatePasswordStrength('Test1!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('TEST123!@#');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('test123!@#');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('TestABC!@#');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('Test12345');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'Test123!@#' + 'a'.repeat(120);
      const result = validatePasswordStrength(longPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
