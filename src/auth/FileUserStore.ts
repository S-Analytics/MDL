/**
 * File-based user storage implementation
 * Uses JSON file for development/testing
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import {
    ApiKey,
    RefreshToken,
    toApiKeySafe,
    toUserSafe,
    User,
    UserCreateInput,
    UserSafe,
    UserStatus,
    UserUpdateInput,
} from '../models/User';
import { ConflictError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { IUserStore } from './IUserStore';

interface FileUserData {
  users: User[];
  refreshTokens: RefreshToken[];
  apiKeys: ApiKey[];
}

/**
 * File-based implementation of user storage
 * Stores users, refresh tokens, and API keys in JSON file
 */
export class FileUserStore implements IUserStore {
  private readonly filePath: string;
  private data: FileUserData;
  private savePromise: Promise<void> | null = null;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'users.json');
    this.data = {
      users: [],
      refreshTokens: [],
      apiKeys: [],
    };
  }

  /**
   * Initialize store by loading data from file
   */
  async initialize(): Promise<void> {
    try {
      const fileData = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(fileData);
      
      // Convert date strings to Date objects
      this.data.users = this.data.users.map((user) => ({
        ...user,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login_at: user.last_login_at ? new Date(user.last_login_at) : undefined,
      }));
      
      this.data.refreshTokens = this.data.refreshTokens.map((token) => ({
        ...token,
        created_at: new Date(token.created_at),
        expires_at: new Date(token.expires_at),
      }));
      
      this.data.apiKeys = this.data.apiKeys.map((key) => ({
        ...key,
        created_at: new Date(key.created_at),
        last_used_at: key.last_used_at ? new Date(key.last_used_at) : undefined,
        expires_at: key.expires_at ? new Date(key.expires_at) : undefined,
      }));
      
      logger.info({ path: this.filePath }, 'FileUserStore initialized');
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, create empty data
        await this.save();
        logger.info({ path: this.filePath }, 'Created new user data file');
      } else {
        throw error;
      }
    }
  }

  /**
   * Save data to file
   */
  private async save(): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    
    // Write to file
    await fs.writeFile(
      this.filePath,
      JSON.stringify(this.data, null, 2),
      'utf-8'
    );
  }

  /**
   * Queue a save operation (debounced)
   */
  private queueSave(): void {
    this.savePromise ??= this.save().finally(() => {
      this.savePromise = null;
    });
  }

  async findById(userId: string): Promise<User | null> {
    const user = this.data.users.find((u) => u.user_id === userId);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = this.data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    return user || null;
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    role?: string;
  }): Promise<UserSafe[]> {
    let users = [...this.data.users];
    
    // Filter by status
    if (options?.status) {
      users = users.filter((u) => u.status === options.status);
    }
    
    // Filter by role
    if (options?.role) {
      users = users.filter((u) => u.role === options.role);
    }
    
    // Sort by created_at descending
    users.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    users = users.slice(offset, offset + limit);
    
    return users.map(toUserSafe);
  }

  async create(userData: UserCreateInput): Promise<User> {
    // Check for existing username
    const existingUsername = await this.findByUsername(userData.username);
    if (existingUsername) {
      throw new ConflictError(`Username '${userData.username}' already exists`);
    }
    
    // Check for existing email
    const existingEmail = await this.findByEmail(userData.email);
    if (existingEmail) {
      throw new ConflictError(`Email '${userData.email}' already exists`);
    }
    
    // Create new user
    const now = new Date();
    const user: User = {
      user_id: uuidv4(),
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      full_name: userData.full_name,
      role: userData.role,
      status: UserStatus.ACTIVE,
      created_at: now,
      updated_at: now,
      metadata: userData.metadata || {},
    };
    
    this.data.users.push(user);
    this.queueSave();
    
    logger.info({ user_id: user.user_id, username: user.username }, 'User created');
    
    return user;
  }

  async update(userId: string, updates: UserUpdateInput): Promise<User | null> {
    const userIndex = this.data.users.findIndex((u) => u.user_id === userId);
    
    if (userIndex === -1) {
      return null;
    }
    
    // Check for email conflict if updating email
    if (updates.email) {
      const existingEmail = await this.findByEmail(updates.email);
      if (existingEmail && existingEmail.user_id !== userId) {
        throw new ConflictError(`Email '${updates.email}' already exists`);
      }
    }
    
    // Update user
    const user = this.data.users[userIndex];
    this.data.users[userIndex] = {
      ...user,
      ...updates,
      updated_at: new Date(),
    };
    
    this.queueSave();
    
    logger.info({ user_id: userId, updates: Object.keys(updates) }, 'User updated');
    
    return this.data.users[userIndex];
  }

  async delete(userId: string): Promise<boolean> {
    const userIndex = this.data.users.findIndex((u) => u.user_id === userId);
    
    if (userIndex === -1) {
      return false;
    }
    
    // Remove user
    this.data.users.splice(userIndex, 1);
    
    // Remove associated refresh tokens
    this.data.refreshTokens = this.data.refreshTokens.filter(
      (t) => t.user_id !== userId
    );
    
    // Remove associated API keys
    this.data.apiKeys = this.data.apiKeys.filter((k) => k.user_id !== userId);
    
    this.queueSave();
    
    logger.info({ user_id: userId }, 'User deleted');
    
    return true;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const userIndex = this.data.users.findIndex((u) => u.user_id === userId);
    
    if (userIndex === -1) {
      throw new NotFoundError('User not found');
    }
    
    this.data.users[userIndex].last_login_at = new Date();
    this.queueSave();
  }

  async changePassword(userId: string, newPasswordHash: string): Promise<void> {
    const userIndex = this.data.users.findIndex((u) => u.user_id === userId);
    
    if (userIndex === -1) {
      throw new NotFoundError('User not found');
    }
    
    this.data.users[userIndex].password_hash = newPasswordHash;
    this.data.users[userIndex].updated_at = new Date();
    this.queueSave();
    
    logger.info({ user_id: userId }, 'Password changed');
  }

  async saveRefreshToken(userId: string, refreshToken: RefreshToken): Promise<void> {
    this.data.refreshTokens.push(refreshToken);
    this.queueSave();
  }

  async findRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    const token = this.data.refreshTokens.find((t) => t.token_id === tokenId);
    
    if (!token) {
      return null;
    }
    
    // Check if expired or revoked
    if (token.revoked || token.expires_at < new Date()) {
      return null;
    }
    
    return token;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    const tokenIndex = this.data.refreshTokens.findIndex(
      (t) => t.token_id === tokenId
    );
    
    if (tokenIndex !== -1) {
      this.data.refreshTokens[tokenIndex].revoked = true;
      this.queueSave();
      
      logger.info({ token_id: tokenId }, 'Refresh token revoked');
    }
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    let revokedCount = 0;
    
    this.data.refreshTokens = this.data.refreshTokens.map((token) => {
      if (token.user_id === userId && !token.revoked) {
        revokedCount++;
        return { ...token, revoked: true };
      }
      return token;
    });
    
    if (revokedCount > 0) {
      this.queueSave();
      logger.info({ user_id: userId, count: revokedCount }, 'All refresh tokens revoked');
    }
  }

  async saveApiKey(userId: string, apiKey: ApiKey): Promise<void> {
    this.data.apiKeys.push(apiKey);
    this.queueSave();
    
    logger.info({ user_id: userId, key_id: apiKey.key_id }, 'API key created');
  }

  async findApiKey(keyId: string): Promise<ApiKey | null> {
    const key = this.data.apiKeys.find((k) => k.key_id === keyId);
    
    if (!key) {
      return null;
    }
    
    // Check if expired
    if (key.expires_at && key.expires_at < new Date()) {
      return null;
    }
    
    return key;
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    const key = this.data.apiKeys.find((k) => k.key_hash === keyHash);
    
    if (!key) {
      return null;
    }
    
    // Check if expired
    if (key.expires_at && key.expires_at < new Date()) {
      return null;
    }
    
    // Update last used timestamp
    const keyIndex = this.data.apiKeys.findIndex((k) => k.key_id === key.key_id);
    if (keyIndex !== -1) {
      this.data.apiKeys[keyIndex].last_used_at = new Date();
      this.queueSave();
    }
    
    return key;
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'key_hash'>[]> {
    const keys = this.data.apiKeys.filter((k) => k.user_id === userId);
    return keys.map(toApiKeySafe);
  }

  async revokeApiKey(keyId: string): Promise<void> {
    const keyIndex = this.data.apiKeys.findIndex((k) => k.key_id === keyId);
    
    if (keyIndex !== -1) {
      this.data.apiKeys.splice(keyIndex, 1);
      this.queueSave();
      
      logger.info({ key_id: keyId }, 'API key revoked');
    }
  }

  async cleanupExpired(): Promise<void> {
    const now = new Date();
    
    const initialTokenCount = this.data.refreshTokens.length;
    this.data.refreshTokens = this.data.refreshTokens.filter(
      (t) => !t.revoked && t.expires_at > now
    );
    const removedTokens = initialTokenCount - this.data.refreshTokens.length;
    
    const initialKeyCount = this.data.apiKeys.length;
    this.data.apiKeys = this.data.apiKeys.filter(
      (k) => !k.expires_at || k.expires_at > now
    );
    const removedKeys = initialKeyCount - this.data.apiKeys.length;
    
    if (removedTokens > 0 || removedKeys > 0) {
      this.queueSave();
      logger.info(
        { removed_tokens: removedTokens, removed_keys: removedKeys },
        'Cleaned up expired tokens and keys'
      );
    }
  }
}
