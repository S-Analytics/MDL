/**
 * Test Configuration
 * 
 * Reads configuration values from environment variables (.env file)
 * Provides a centralized way to access test configuration
 */

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || '3000';

/**
 * Base URL for the application
 */
export const BASE_URL = `http://${HOST}:${PORT}`;

/**
 * API base URL
 */
export const API_URL = `${BASE_URL}/api`;

/**
 * Helper function to build full URL from path
 */
export function buildUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_URL}/${cleanPath}`;
}

/**
 * Helper function to build API URL from path
 */
export function buildApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
}
