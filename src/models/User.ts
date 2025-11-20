/**
 * User model and authentication interfaces
 * Defines user structure and authentication-related types
 */

/**
 * User role levels
 */
export enum UserRole {
  VIEWER = 'viewer',    // Can only read metrics
  EDITOR = 'editor',    // Can read and modify metrics
  ADMIN = 'admin',      // Full access including user management
}

/**
 * User status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * User entity
 */
export interface User {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  metadata?: Record<string, any>;
}

/**
 * User without sensitive information (for API responses)
 */
export interface UserSafe {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  metadata?: Record<string, any>;
}

/**
 * User creation input
 */
export interface UserCreateInput {
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  status?: UserStatus;
  metadata?: Record<string, unknown>;
}

/**
 * User update input (all fields optional except user_id)
 */
export interface UserUpdateInput {
  user_id: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  status?: UserStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Password change input
 */
export interface PasswordChangeInput {
  user_id: string;
  current_password: string;
  new_password: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  iat?: number;  // Issued at
  exp?: number;  // Expires at
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;  // Access token expiry in seconds
  token_type: 'Bearer';
}

/**
 * Refresh token entity
 */
export interface RefreshToken {
  token_id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked: boolean;
}

/**
 * API Key entity
 */
export interface ApiKey {
  key_id: string;
  user_id: string;
  name: string;
  description: string;
  key_hash: string;
  scopes: string[];
  expires_at?: Date;
  created_at: Date;
  last_used_at?: Date;
  revoked: boolean;
}

/**
 * API Key creation input
 */
export interface ApiKeyCreateInput {
  user_id: string;
  name: string;
  description?: string;
  scopes: string[];
  expires_at?: Date;
}

/**
 * API Key safe (without hash)
 */
export interface ApiKeySafe {
  key_id: string;
  user_id: string;
  name: string;
  description: string;
  scopes: string[];
  expires_at?: Date;
  created_at: Date;
  last_used_at?: Date;
  revoked: boolean;
}

/**
 * Helper to convert User to UserSafe
 */
export function toUserSafe(user: User): UserSafe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Helper to convert ApiKey to ApiKeySafe
 */
export function toApiKeySafe(apiKey: ApiKey): ApiKeySafe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key_hash, ...safe } = apiKey;
  return safe;
}
