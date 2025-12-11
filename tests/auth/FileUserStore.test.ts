import * as fs from 'node:fs/promises';
import { FileUserStore } from '../../src/auth/FileUserStore';
import { ApiKey, RefreshToken, User, UserCreateInput, UserRole, UserStatus, UserUpdateInput } from '../../src/models/User';
import { ConflictError, NotFoundError } from '../../src/utils/errors';

jest.mock('node:fs/promises');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('FileUserStore', () => {
  let store: FileUserStore;
  const testFilePath = '/tmp/test-users.json';
  let mockData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockData = {
      users: [],
      refreshTokens: [],
      apiKeys: [],
    };
    
    // Use a function so it reads the current mockData value each time
    (fs.readFile as jest.Mock).mockImplementation(() => Promise.resolve(JSON.stringify(mockData)));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    
    store = new FileUserStore(testFilePath);
  });

  describe('initialize', () => {
    it('should load data from file', async () => {
      const testUser = {
        user_id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      };
      
      mockData.users = [testUser];
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      
      await store.initialize();
      
      expect(fs.readFile).toHaveBeenCalledWith(testFilePath, 'utf-8');
    });

    it('should create new file if not exists', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await store.initialize();
      
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw on other file errors', async () => {
      const error = new Error('Permission denied');
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      
      await expect(store.initialize()).rejects.toThrow('Permission denied');
    });

    it('should convert date strings to Date objects', async () => {
      const testUser = {
        user_id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        last_login_at: '2024-01-02T00:00:00.000Z',
        metadata: {},
      };
      
      mockData.users = [testUser];
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
      
      await store.initialize();
      
      const user = await store.findById('1');
      expect(user?.created_at).toBeInstanceOf(Date);
      expect(user?.updated_at).toBeInstanceOf(Date);
      expect(user?.last_login_at).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should return user by id', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      const result = await store.findById('123');
      expect(result?.username).toBe('testuser');
    });

    it('should return null if user not found', async () => {
      const result = await store.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should return user by username (case-insensitive)', async () => {
      const user: User = {
        user_id: '123',
        username: 'TestUser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      const result = await store.findByUsername('testuser');
      expect(result?.user_id).toBe('123');
    });

    it('should return null if user not found', async () => {
      const result = await store.findByUsername('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should return user by email (case-insensitive)', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'Test@Example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      const result = await store.findByEmail('test@example.com');
      expect(result?.user_id).toBe('123');
    });
  });

  describe('create', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should create new user', async () => {
      const userData: UserCreateInput = {
        username: 'newuser',
        email: 'new@example.com',
        password_hash: 'hash',
        full_name: 'New User',
        role: UserRole.VIEWER,
      };
      
      const user = await store.create(userData);
      
      expect(user.user_id).toBeDefined();
      expect(user.username).toBe('newuser');
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw ConflictError if username exists', async () => {
      const existingUser: User = {
        user_id: '123',
        username: 'existing',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Existing User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [existingUser];
      await store.initialize();
      
      const userData: UserCreateInput = {
        username: 'existing',
        email: 'new@example.com',
        password_hash: 'hash',
        full_name: 'New User',
        role: UserRole.VIEWER,
      };
      
      await expect(store.create(userData)).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if email exists', async () => {
      const existingUser: User = {
        user_id: '123',
        username: 'existing',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Existing User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [existingUser];
      await store.initialize();
      
      const userData: UserCreateInput = {
        username: 'newuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'New User',
        role: UserRole.VIEWER,
      };
      
      await expect(store.create(userData)).rejects.toThrow(ConflictError);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should update user', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      const updates: UserUpdateInput = { user_id: '123', full_name: 'Updated Name' };
      const updated = await store.update('123', updates);
      
      expect(updated?.full_name).toBe('Updated Name');
    });

    it('should return null if user not found', async () => {
      const result = await store.update('nonexistent', { user_id: 'nonexistent', full_name: 'Test' });
      expect(result).toBeNull();
    });

    it('should throw ConflictError if email already exists', async () => {
      const user1: User = {
        user_id: '1',
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hash',
        full_name: 'User 1',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      const user2: User = {
        ...user1,
        user_id: '2',
        username: 'user2',
        email: 'user2@example.com',
      };
      
      mockData.users = [user1, user2];
      await store.initialize();
      
      await expect(
        store.update('1', { user_id: '1', email: 'user2@example.com' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should delete user and associated data', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      mockData.refreshTokens = [{ user_id: '123', token_id: 't1' }];
      mockData.apiKeys = [{ user_id: '123', key_id: 'k1' }];
      await store.initialize();
      
      const result = await store.delete('123');
      
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      const result = await store.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should update last login timestamp', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      await store.updateLastLogin('123');
      const updated = await store.findById('123');
      
      expect(updated?.last_login_at).toBeDefined();
    });

    it('should throw NotFoundError if user not found', async () => {
      await expect(store.updateLastLogin('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('changePassword', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should change user password', async () => {
      const user: User = {
        user_id: '123',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'oldhash',
        full_name: 'Test User',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {},
      };
      
      mockData.users = [user];
      await store.initialize();
      
      await store.changePassword('123', 'newhash');
      const updated = await store.findById('123');
      
      expect(updated?.password_hash).toBe('newhash');
    });

    it('should throw NotFoundError if user not found', async () => {
      await expect(store.changePassword('nonexistent', 'newhash')).rejects.toThrow(NotFoundError);
    });
  });

  describe('refresh tokens', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should save and find refresh token', async () => {
      const token: RefreshToken = {
        token_id: 't123',
        user_id: 'u123',
        token_hash: 'hash123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
        revoked: false,
      };
      
      await store.saveRefreshToken('u123', token);
      const found = await store.findRefreshToken('t123');
      
      expect(found?.token_id).toBe('t123');
    });

    it('should return null for expired token', async () => {
      const token: RefreshToken = {
        token_id: 't123',
        user_id: 'u123',
        token_hash: 'hash123',
        created_at: new Date(),
        expires_at: new Date(Date.now() - 86400000),
        revoked: false,
      };
      
      mockData.refreshTokens = [token];
      await store.initialize();
      
      const found = await store.findRefreshToken('t123');
      expect(found).toBeNull();
    });

    it('should revoke refresh token', async () => {
      const token: RefreshToken = {
        token_id: 't123',
        user_id: 'u123',
        token_hash: 'hash123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
        revoked: false,
      };
      
      mockData.refreshTokens = [token];
      await store.initialize();
      
      await store.revokeRefreshToken('t123');
      const found = await store.findRefreshToken('t123');
      
      expect(found).toBeNull();
    });

    it('should revoke all user refresh tokens', async () => {
      const tokens: RefreshToken[] = [
        {
          token_id: 't1',
          user_id: 'u123',
          token_hash: 'hash1',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          revoked: false,
        },
        {
          token_id: 't2',
          user_id: 'u123',
          token_hash: 'hash2',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          revoked: false,
        },
      ];
      
      mockData.refreshTokens = tokens;
      await store.initialize();
      
      await store.revokeAllRefreshTokens('u123');
      
      const found1 = await store.findRefreshToken('t1');
      const found2 = await store.findRefreshToken('t2');
      
      expect(found1).toBeNull();
      expect(found2).toBeNull();
    });
  });

  describe('API keys', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should save and find API key', async () => {
      const apiKey: ApiKey = {
        key_id: 'k123',
        user_id: 'u123',
        key_hash: 'hash123',
        name: 'Test Key',
        description: 'Test key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
      };
      
      await store.saveApiKey('u123', apiKey);
      const found = await store.findApiKey('k123');
      
      expect(found?.key_id).toBe('k123');
    });

    it('should find API key by hash', async () => {
      const apiKey: ApiKey = {
        key_id: 'k123',
        user_id: 'u123',
        key_hash: 'hash123',
        name: 'Test Key',
        description: 'Test key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
      };
      
      mockData.apiKeys = [apiKey];
      await store.initialize();
      
      const found = await store.findApiKeyByHash('hash123');
      
      expect(found?.key_id).toBe('k123');
    });

    it('should update last_used_at when finding by hash', async () => {
      const apiKey: ApiKey = {
        key_id: 'k123',
        user_id: 'u123',
        key_hash: 'hash123',
        name: 'Test Key',
        description: 'Test key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
      };
      
      mockData.apiKeys = [apiKey];
      await store.initialize();
      
      await store.findApiKeyByHash('hash123');
      const updated = await store.findApiKey('k123');
      
      expect(updated?.last_used_at).toBeDefined();
    });

    it('should list user API keys', async () => {
      const apiKeys: ApiKey[] = [
        {
          key_id: 'k1',
          user_id: 'u123',
          key_hash: 'hash1',
          name: 'Key 1',
          description: 'Key 1 description',
          scopes: ['read'],
          revoked: false,
          created_at: new Date(),
        },
        {
          key_id: 'k2',
          user_id: 'u123',
          key_hash: 'hash2',
          name: 'Key 2',
          description: 'Key 2 description',
          scopes: ['read', 'write'],
          revoked: false,
          created_at: new Date(),
        },
      ];
      
      mockData.apiKeys = apiKeys;
      await store.initialize();
      
      const keys = await store.listApiKeys('u123');
      expect(keys.length).toBe(2);
    });

    it('should revoke API key', async () => {
      const apiKey: ApiKey = {
        key_id: 'k123',
        user_id: 'u123',
        key_hash: 'hash123',
        name: 'Test Key',
        description: 'Test key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
      };
      
      mockData.apiKeys = [apiKey];
      await store.initialize();
      
      await store.revokeApiKey('k123');
      const found = await store.findApiKey('k123');
      
      expect(found).toBeNull();
    });
  });

  describe('cleanupExpired', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('should remove expired tokens and keys', async () => {
      const expiredToken: RefreshToken = {
        token_id: 't1',
        user_id: 'u1',
        token_hash: 'hash1',
        created_at: new Date(),
        expires_at: new Date(Date.now() - 86400000),
        revoked: false,
      };
      
      const expiredKey: ApiKey = {
        key_id: 'k1',
        user_id: 'u1',
        key_hash: 'hash1',
        name: 'Expired Key',
        description: 'Expired key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
        expires_at: new Date(Date.now() - 86400000),
      };
      
      mockData.refreshTokens = [expiredToken];
      mockData.apiKeys = [expiredKey];
      await store.initialize();
      
      await store.cleanupExpired();
      
      const foundToken = await store.findRefreshToken('t1');
      const foundKey = await store.findApiKey('k1');
      
      expect(foundToken).toBeNull();
      expect(foundKey).toBeNull();
    });

    it('should keep valid tokens and keys', async () => {
      const validToken: RefreshToken = {
        token_id: 't1',
        user_id: 'u1',
        token_hash: 'hash1',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000),
        revoked: false,
      };
      
      const validKey: ApiKey = {
        key_id: 'k1',
        user_id: 'u1',
        key_hash: 'hash1',
        name: 'Valid Key',
        description: 'Valid key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
      };
      
      mockData.refreshTokens = [validToken];
      mockData.apiKeys = [validKey];
      await store.initialize();
      
      await store.cleanupExpired();
      
      const foundToken = await store.findRefreshToken('t1');
      const foundKey = await store.findApiKey('k1');
      
      expect(foundToken).not.toBeNull();
      expect(foundKey).not.toBeNull();
    });
  });

  describe('list with filters', () => {
    beforeEach(async () => {
      mockData.users = [
        {
          user_id: '1',
          username: 'admin',
          email: 'admin@example.com',
          password_hash: 'hash1',
          full_name: 'Admin User',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          created_at: new Date('2024-01-01').toISOString(),
          updated_at: new Date('2024-01-01').toISOString(),
          metadata: {},
        },
        {
          user_id: '2',
          username: 'viewer',
          email: 'viewer@example.com',
          password_hash: 'hash2',
          full_name: 'Viewer User',
          role: UserRole.VIEWER,
          status: UserStatus.ACTIVE,
          created_at: new Date('2024-01-02').toISOString(),
          updated_at: new Date('2024-01-02').toISOString(),
          metadata: {},
        },
        {
          user_id: '3',
          username: 'suspended',
          email: 'suspended@example.com',
          password_hash: 'hash3',
          full_name: 'Suspended User',
          role: UserRole.VIEWER,
          status: UserStatus.SUSPENDED,
          created_at: new Date('2024-01-03').toISOString(),
          updated_at: new Date('2024-01-03').toISOString(),
          metadata: {},
        },
      ];
      await store.initialize();
    });

    it('should filter by status', async () => {
      const users = await store.list({ status: UserStatus.ACTIVE });
      expect(users).toHaveLength(2);
      expect(users.every(u => u.status === UserStatus.ACTIVE)).toBe(true);
    });

    it('should filter by role', async () => {
      const users = await store.list({ role: UserRole.ADMIN });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('admin');
    });

    it('should filter by both status and role', async () => {
      const users = await store.list({ 
        status: UserStatus.ACTIVE, 
        role: UserRole.VIEWER 
      });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('viewer');
    });

    it('should apply pagination with offset and limit', async () => {
      const users = await store.list({ offset: 1, limit: 1 });
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('viewer'); // Second in desc order (sorted by created_at desc)
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should log when tokens are revoked', async () => {
      const { logger } = require('../../src/utils/logger');
      
      mockData.refreshTokens = [
        {
          token_id: 't1',
          user_id: 'u1',
          token_hash: 'hash1',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          revoked: false,
        },
        {
          token_id: 't2',
          user_id: 'u1',
          token_hash: 'hash2',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          revoked: false,
        },
      ];
      await store.initialize();
      
      await store.revokeAllRefreshTokens('u1');
      
      expect(logger.info).toHaveBeenCalledWith(
        { user_id: 'u1', count: 2 },
        'All refresh tokens revoked'
      );
    });
  });

  describe('API key expiration', () => {
    it('should return null for expired API key in findApiKey', async () => {
      const expiredKey: ApiKey = {
        key_id: 'k1',
        user_id: 'u1',
        key_hash: 'hash1',
        name: 'Expired Key',
        description: 'Expired key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
        expires_at: new Date(Date.now() - 86400000), // Expired yesterday
      };
      
      mockData.apiKeys = [expiredKey];
      await store.initialize();
      
      const key = await store.findApiKey('k1');
      expect(key).toBeNull();
    });

    it('should return null for expired API key in findApiKeyByHash', async () => {
      const expiredKey: ApiKey = {
        key_id: 'k1',
        user_id: 'u1',
        key_hash: 'hash1',
        name: 'Expired Key',
        description: 'Expired key description',
        scopes: ['read'],
        revoked: false,
        created_at: new Date(),
        expires_at: new Date(Date.now() - 86400000), // Expired yesterday
      };
      
      mockData.apiKeys = [expiredKey];
      await store.initialize();
      
      const key = await store.findApiKeyByHash('hash1');
      expect(key).toBeNull();
    });
  });
});
