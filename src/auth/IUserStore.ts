/**
 * User storage interface
 * Defines operations for managing user data
 */

import {
    ApiKey,
    RefreshToken,
    User,
    UserCreateInput,
    UserSafe,
    UserUpdateInput,
} from '../models/User';

/**
 * Interface for user data storage implementations
 */
export interface IUserStore {
  /**
   * Find user by ID
   * @param userId - User ID to search for
   * @returns User if found, null otherwise
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Find user by username
   * @param username - Username to search for
   * @returns User if found, null otherwise
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by email
   * @param email - Email to search for
   * @returns User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * List all users
   * @param options - Pagination and filtering options
   * @returns Array of users (safe version without password_hash)
   */
  list(options?: {
    limit?: number;
    offset?: number;
    status?: string;
    role?: string;
  }): Promise<UserSafe[]>;

  /**
   * Create new user
   * @param userData - User data to create
   * @returns Created user
   */
  create(userData: UserCreateInput): Promise<User>;

  /**
   * Update existing user
   * @param userId - User ID to update
   * @param updates - Fields to update
   * @returns Updated user if found, null otherwise
   */
  update(userId: string, updates: UserUpdateInput): Promise<User | null>;

  /**
   * Delete user
   * @param userId - User ID to delete
   * @returns True if deleted, false if not found
   */
  delete(userId: string): Promise<boolean>;

  /**
   * Update user's last login timestamp
   * @param userId - User ID
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Change user password
   * @param userId - User ID
   * @param newPasswordHash - New password hash
   */
  changePassword(userId: string, newPasswordHash: string): Promise<void>;

  /**
   * Store refresh token
   * @param userId - User ID
   * @param refreshToken - Refresh token data
   */
  saveRefreshToken(userId: string, refreshToken: RefreshToken): Promise<void>;

  /**
   * Find refresh token by ID
   * @param tokenId - Token ID
   * @returns Refresh token if found and not revoked/expired
   */
  findRefreshToken(tokenId: string): Promise<RefreshToken | null>;

  /**
   * Revoke refresh token
   * @param tokenId - Token ID to revoke
   */
  revokeRefreshToken(tokenId: string): Promise<void>;

  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID
   */
  revokeAllRefreshTokens(userId: string): Promise<void>;

  /**
   * Store API key
   * @param userId - User ID
   * @param apiKey - API key data
   */
  saveApiKey(userId: string, apiKey: ApiKey): Promise<void>;

  /**
   * Find API key by ID
   * @param keyId - API key ID
   * @returns API key if found and not expired
   */
  findApiKey(keyId: string): Promise<ApiKey | null>;

  /**
   * Find API key by hash
   * @param keyHash - API key hash
   * @returns API key if found and not expired
   */
  findApiKeyByHash(keyHash: string): Promise<ApiKey | null>;

  /**
   * List user's API keys
   * @param userId - User ID
   * @returns Array of API keys (safe version without hash)
   */
  listApiKeys(userId: string): Promise<Omit<ApiKey, 'key_hash'>[]>;

  /**
   * Revoke API key
   * @param keyId - API key ID
   */
  revokeApiKey(keyId: string): Promise<void>;

  /**
   * Clean up expired tokens and keys
   */
  cleanupExpired(): Promise<void>;
}
