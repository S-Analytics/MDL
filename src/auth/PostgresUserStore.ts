/**
 * PostgreSQL user storage implementation
 * Uses PostgreSQL for production user management
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    ApiKey,
    RefreshToken,
    toApiKeySafe,
    toUserSafe,
    User,
    UserCreateInput,
    UserRole,
    UserSafe,
    UserStatus,
    UserUpdateInput,
} from '../models/User';
import { DatabasePool } from '../utils/database';
import { ConflictError, DatabaseError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { IUserStore } from './IUserStore';

/**
 * PostgreSQL implementation of user storage
 * Stores users, refresh tokens, and API keys in PostgreSQL database
 */
export class PostgresUserStore implements IUserStore {
  private pool: Pool | DatabasePool;

  constructor(pool: Pool | DatabasePool) {
    this.pool = pool;
  }

  /**
   * Initialize store by creating necessary tables
   */
  async initialize(): Promise<void> {
    const isDatabasePool = 'query' in this.pool && typeof (this.pool as any).query === 'function';
    const client = isDatabasePool ? this.pool : await (this.pool as Pool).connect();

    try {
      // Create users table
      await (client as any).query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id UUID PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMP,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);

      // Create refresh_tokens table
      await (client as any).query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          token_id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT false
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
      `);

      // Create api_keys table
      await (client as any).query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          key_id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          key_hash VARCHAR(255) NOT NULL,
          scopes TEXT[] NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP,
          revoked BOOLEAN NOT NULL DEFAULT false
        );
        CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      `);

      logger.info('PostgresUserStore tables initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize PostgresUserStore tables');
      throw new DatabaseError('Failed to initialize user store');
    } finally {
      if ('release' in client) {
        client.release();
      }
    }
  }

  private async executeQuery(query: string, params?: any[]): Promise<any> {
    if ('query' in this.pool && typeof this.pool.query === 'function') {
      return await (this.pool as DatabasePool).query(query, params);
    } else {
      return await (this.pool as Pool).query(query, params);
    }
  }

  async findById(userId: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    role?: string;
  }): Promise<UserSafe[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    if (options?.role) {
      query += ` AND role = $${paramIndex}`;
      params.push(options.role);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.executeQuery(query, params);
    return result.rows.map((row: any) => toUserSafe(this.mapRowToUser(row)));
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

    const userId = uuidv4();
    const now = new Date();

    const result = await this.executeQuery(
      `INSERT INTO users (
        user_id, username, email, password_hash, full_name, role, status, created_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        userData.username,
        userData.email,
        userData.password_hash,
        userData.full_name,
        userData.role,
        userData.status || UserStatus.ACTIVE,
        now,
        now,
        JSON.stringify(userData.metadata || {}),
      ]
    );

    logger.info({ user_id: userId, username: userData.username }, 'User created');

    return this.mapRowToUser(result.rows[0]);
  }

  async update(userId: string, updates: UserUpdateInput): Promise<User | null> {
    // Check for email conflict if updating email
    if (updates.email) {
      const existingEmail = await this.findByEmail(updates.email);
      if (existingEmail && existingEmail.user_id !== userId) {
        throw new ConflictError(`Email '${updates.email}' already exists`);
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(updates.email);
      paramIndex++;
    }

    if (updates.full_name !== undefined) {
      fields.push(`full_name = $${paramIndex}`);
      values.push(updates.full_name);
      paramIndex++;
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex}`);
      values.push(updates.role);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(updates.metadata));
      paramIndex++;
    }

    if (fields.length === 0) {
      return await this.findById(userId);
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(userId);

    const result = await this.executeQuery(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ user_id: userId, updates: Object.keys(updates) }, 'User updated');

    return this.mapRowToUser(result.rows[0]);
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.executeQuery(
      'DELETE FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rowCount === 0) {
      return false;
    }

    logger.info({ user_id: userId }, 'User deleted');

    return true;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.executeQuery(
      'UPDATE users SET last_login_at = $1 WHERE user_id = $2',
      [new Date(), userId]
    );
  }

  async changePassword(userId: string, newPasswordHash: string): Promise<void> {
    const result = await this.executeQuery(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3',
      [newPasswordHash, new Date(), userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found');
    }

    logger.info({ user_id: userId }, 'Password changed');
  }

  async saveRefreshToken(userId: string, refreshToken: RefreshToken): Promise<void> {
    await this.executeQuery(
      `INSERT INTO refresh_tokens (token_id, user_id, token_hash, created_at, expires_at, revoked)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        refreshToken.token_id,
        userId,
        refreshToken.token_hash,
        refreshToken.created_at,
        refreshToken.expires_at,
        refreshToken.revoked,
      ]
    );
  }

  async findRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    const result = await this.executeQuery(
      `SELECT * FROM refresh_tokens 
       WHERE token_id = $1 AND revoked = false AND expires_at > NOW()`,
      [tokenId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToRefreshToken(result.rows[0]);
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.executeQuery(
      'UPDATE refresh_tokens SET revoked = true WHERE token_id = $1',
      [tokenId]
    );

    logger.info({ token_id: tokenId }, 'Refresh token revoked');
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const result = await this.executeQuery(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
      [userId]
    );

    logger.info(
      { user_id: userId, count: result.rowCount },
      'All refresh tokens revoked'
    );
  }

  async saveApiKey(userId: string, apiKey: ApiKey): Promise<void> {
    await this.executeQuery(
      `INSERT INTO api_keys (key_id, user_id, name, description, key_hash, scopes, created_at, last_used_at, expires_at, revoked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        apiKey.key_id,
        userId,
        apiKey.name,
        apiKey.description,
        apiKey.key_hash,
        apiKey.scopes,
        apiKey.created_at,
        apiKey.last_used_at,
        apiKey.expires_at,
        apiKey.revoked,
      ]
    );

    logger.info({ user_id: userId, key_id: apiKey.key_id }, 'API key created');
  }

  async findApiKey(keyId: string): Promise<ApiKey | null> {
    const result = await this.executeQuery(
      `SELECT * FROM api_keys 
       WHERE key_id = $1 AND revoked = false AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToApiKey(result.rows[0]);
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    const result = await this.executeQuery(
      `SELECT * FROM api_keys 
       WHERE key_hash = $1 AND revoked = false AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const apiKey = this.mapRowToApiKey(result.rows[0]);

    // Update last_used_at
    await this.executeQuery(
      'UPDATE api_keys SET last_used_at = $1 WHERE key_id = $2',
      [new Date(), apiKey.key_id]
    );

    return apiKey;
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'key_hash'>[]> {
    const result = await this.executeQuery(
      'SELECT * FROM api_keys WHERE user_id = $1 AND revoked = false ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map((row: any) => toApiKeySafe(this.mapRowToApiKey(row)));
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await this.executeQuery(
      'UPDATE api_keys SET revoked = true WHERE key_id = $1',
      [keyId]
    );

    logger.info({ key_id: keyId }, 'API key revoked');
  }

  async cleanupExpired(): Promise<void> {
    const tokenResult = await this.executeQuery(
      'DELETE FROM refresh_tokens WHERE revoked = true OR expires_at < NOW()'
    );

    const keyResult = await this.executeQuery(
      'DELETE FROM api_keys WHERE revoked = true OR (expires_at IS NOT NULL AND expires_at < NOW())'
    );

    logger.info(
      {
        removed_tokens: tokenResult.rowCount,
        removed_keys: keyResult.rowCount,
      },
      'Cleaned up expired tokens and keys'
    );
  }

  private mapRowToUser(row: any): User {
    return {
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      full_name: row.full_name,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_login_at: row.last_login_at ? new Date(row.last_login_at) : undefined,
      metadata: row.metadata || {},
    };
  }

  private mapRowToRefreshToken(row: any): RefreshToken {
    return {
      token_id: row.token_id,
      user_id: row.user_id,
      token_hash: row.token_hash,
      created_at: new Date(row.created_at),
      expires_at: new Date(row.expires_at),
      revoked: row.revoked,
    };
  }

  private mapRowToApiKey(row: any): ApiKey {
    return {
      key_id: row.key_id,
      user_id: row.user_id,
      name: row.name,
      description: row.description || '',
      key_hash: row.key_hash,
      scopes: row.scopes,
      created_at: new Date(row.created_at),
      last_used_at: row.last_used_at ? new Date(row.last_used_at) : undefined,
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
      revoked: row.revoked,
    };
  }
}
