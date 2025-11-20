/**
 * Authentication Test Helpers
 * Provides utilities for testing authentication and authorization
 */

import { Request, Response } from 'express';
import { generateAuthTokens, hashPassword } from '../../src/auth/jwt';
import { JWTPayload, UserRole, UserSafe } from '../../src/models/User';
import { createTestUserSafe } from './factories';

/**
 * Create a mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    path: '/test',
    method: 'GET',
    ...overrides,
  };
}

/**
 * Create a mock Express response object
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create a mock next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Generate authentication tokens for a test user
 */
export function generateTestTokens(user?: Partial<UserSafe>) {
  const testUser = createTestUserSafe(user);
  return generateAuthTokens(testUser);
}

/**
 * Generate an access token for a test user with specific role
 */
export function generateTestAccessToken(role: UserRole = UserRole.EDITOR, userOverrides?: Partial<UserSafe>): string {
  const user = createTestUserSafe({ role, ...userOverrides });
  const tokens = generateAuthTokens(user);
  return tokens.access_token;
}

/**
 * Generate an admin access token
 */
export function generateAdminToken(): string {
  return generateTestAccessToken(UserRole.ADMIN);
}

/**
 * Generate an editor access token
 */
export function generateEditorToken(): string {
  return generateTestAccessToken(UserRole.EDITOR);
}

/**
 * Generate a viewer access token
 */
export function generateViewerToken(): string {
  return generateTestAccessToken(UserRole.VIEWER);
}

/**
 * Create a mock JWT payload
 */
export function createMockJWTPayload(overrides: Partial<JWTPayload> = {}): JWTPayload {
  const user = createTestUserSafe();
  return {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
    ...overrides,
  };
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(
  role: UserRole = UserRole.EDITOR,
  overrides: Partial<Request> = {}
): Partial<Request> {
  const token = generateTestAccessToken(role);
  const user = createMockJWTPayload({ role });
  
  return createMockRequest({
    headers: {
      authorization: `Bearer ${token}`,
    },
    user,
    ...overrides,
  });
}

/**
 * Create a request with admin authentication
 */
export function createAdminRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return createAuthenticatedRequest(UserRole.ADMIN, overrides);
}

/**
 * Create a request with editor authentication
 */
export function createEditorRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return createAuthenticatedRequest(UserRole.EDITOR, overrides);
}

/**
 * Create a request with viewer authentication
 */
export function createViewerRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return createAuthenticatedRequest(UserRole.VIEWER, overrides);
}

/**
 * Hash a test password (useful for seeding test data)
 */
export async function hashTestPassword(password: string = 'Test123!@#'): Promise<string> {
  return hashPassword(password);
}

/**
 * Create an invalid/malformed token for testing
 */
export function createInvalidToken(): string {
  return 'invalid.token.string';
}

/**
 * Create an expired token for testing
 * Note: This creates a token that's immediately expired
 */
export function createExpiredToken(): string {
  // This would need to be generated with a past expiry time
  // For now, return a recognizable pattern
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid';
}

/**
 * Assert that response status was called with expected code
 */
export function expectStatus(res: Partial<Response>, statusCode: number): void {
  expect(res.status).toHaveBeenCalledWith(statusCode);
}

/**
 * Assert that response JSON was called with expected data
 */
export function expectJsonResponse(res: Partial<Response>, data: any): void {
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining(data));
}

/**
 * Assert that error was passed to next
 */
export function expectNextCalledWithError(next: jest.Mock, errorType?: any): void {
  expect(next).toHaveBeenCalled();
  const error = next.mock.calls[0][0];
  expect(error).toBeDefined();
  if (errorType) {
    expect(error).toBeInstanceOf(errorType);
  }
}

/**
 * Assert that middleware called next without error
 */
export function expectNextCalledWithoutError(next: jest.Mock): void {
  expect(next).toHaveBeenCalledWith();
}
