/**
 * User Model Tests
 * Tests for User model helper functions
 */

import {
    ApiKey,
    toApiKeySafe,
    toUserSafe,
    User,
    UserRole,
    UserStatus,
} from '../../src/models/User';

describe('User Model Helpers', () => {
  describe('toUserSafe', () => {
    it('should remove password_hash from user object', () => {
      const user: User = {
        user_id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'super-secret-hash',
        full_name: 'Test User',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      const safe = toUserSafe(user);

      expect(safe).not.toHaveProperty('password_hash');
      expect(safe.user_id).toBe('user-123');
      expect(safe.username).toBe('testuser');
      expect(safe.email).toBe('test@example.com');
      expect(safe.full_name).toBe('Test User');
      expect(safe.role).toBe(UserRole.EDITOR);
      expect(safe.status).toBe(UserStatus.ACTIVE);
    });

    it('should preserve all other user fields', () => {
      const user: User = {
        user_id: 'user-456',
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'secret-hash',
        full_name: 'Admin User',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-02'),
        last_login_at: new Date('2025-01-03'),
        metadata: {
          department: 'Engineering',
          preferences: { theme: 'dark' },
        },
      };

      const safe = toUserSafe(user);

      expect(safe.last_login_at).toEqual(user.last_login_at);
      expect(safe.metadata).toEqual(user.metadata);
      expect(safe.created_at).toEqual(user.created_at);
      expect(safe.updated_at).toEqual(user.updated_at);
    });

    it('should handle user with minimal fields', () => {
      const user: User = {
        user_id: 'user-789',
        username: 'viewer',
        email: 'viewer@example.com',
        password_hash: 'hash',
        full_name: 'Viewer User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const safe = toUserSafe(user);

      expect(safe).not.toHaveProperty('password_hash');
      expect(safe).not.toHaveProperty('last_login_at');
      expect(safe).not.toHaveProperty('metadata');
    });
  });

  describe('toApiKeySafe', () => {
    it('should remove key_hash from API key object', () => {
      const apiKey: ApiKey = {
        key_id: 'key-123',
        user_id: 'user-123',
        name: 'Production API Key',
        description: 'API key for production use',
        key_hash: 'super-secret-hash',
        scopes: ['read', 'write'],
        created_at: new Date('2025-01-01'),
        revoked: false,
      };

      const safe = toApiKeySafe(apiKey);

      expect(safe).not.toHaveProperty('key_hash');
      expect(safe.key_id).toBe('key-123');
      expect(safe.user_id).toBe('user-123');
      expect(safe.name).toBe('Production API Key');
      expect(safe.description).toBe('API key for production use');
      expect(safe.scopes).toEqual(['read', 'write']);
      expect(safe.revoked).toBe(false);
    });

    it('should preserve all other API key fields', () => {
      const apiKey: ApiKey = {
        key_id: 'key-456',
        user_id: 'user-456',
        name: 'Test Key',
        description: 'Testing key',
        key_hash: 'hash',
        scopes: ['read'],
        created_at: new Date('2025-01-01'),
        expires_at: new Date('2026-01-01'),
        last_used_at: new Date('2025-01-15'),
        revoked: true,
      };

      const safe = toApiKeySafe(apiKey);

      expect(safe.expires_at).toEqual(apiKey.expires_at);
      expect(safe.last_used_at).toEqual(apiKey.last_used_at);
      expect(safe.created_at).toEqual(apiKey.created_at);
      expect(safe.revoked).toBe(true);
    });

    it('should handle API key with minimal fields', () => {
      const apiKey: ApiKey = {
        key_id: 'key-789',
        user_id: 'user-789',
        name: 'Simple Key',
        description: 'Basic key',
        key_hash: 'hash',
        scopes: [],
        created_at: new Date(),
        revoked: false,
      };

      const safe = toApiKeySafe(apiKey);

      expect(safe).not.toHaveProperty('key_hash');
      expect(safe).not.toHaveProperty('expires_at');
      expect(safe).not.toHaveProperty('last_used_at');
      expect(safe.scopes).toEqual([]);
    });

    it('should handle API key with empty scopes', () => {
      const apiKey: ApiKey = {
        key_id: 'key-empty',
        user_id: 'user-empty',
        name: 'No Scopes Key',
        description: 'Key without scopes',
        key_hash: 'hash',
        scopes: [],
        created_at: new Date(),
        revoked: false,
      };

      const safe = toApiKeySafe(apiKey);

      expect(safe.scopes).toEqual([]);
      expect(Array.isArray(safe.scopes)).toBe(true);
    });
  });
});
