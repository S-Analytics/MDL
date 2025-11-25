/**
 * Pagination Utility
 * 
 * Provides utilities for paginating API responses, including
 * parameter parsing, response creation, and RFC 5988 Link headers.
 */

import { Response } from 'express';

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Parse and validate pagination parameters from query string
 * 
 * @param query - Query parameters object (typically from req.query)
 * @param options - Optional configuration for defaults and limits
 * @returns Validated pagination parameters including calculated offset
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
  options?: PaginationOptions
): { page: number; limit: number; offset: number } {
  const defaultLimit = options?.limit || 50;
  const maxLimit = options?.maxLimit || 100;

  // Parse and validate page number (minimum 1)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);

  // Parse and validate limit (minimum 1, maximum maxLimit)
  let limit = Number.parseInt(String(query.limit || String(defaultLimit)), 10) || defaultLimit;
  limit = Math.min(Math.max(1, limit), maxLimit);

  // Calculate offset for database queries
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create a paginated response object
 * 
 * @param data - Array of data items for current page
 * @param total - Total number of items across all pages
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated response with data and metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit) || 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Add RFC 5988 Link headers and pagination metadata headers to response
 * 
 * Link header format:
 * Link: <url?page=1>; rel="first", <url?page=2>; rel="next"
 * 
 * Also adds custom headers:
 * - X-Total-Count: Total number of items
 * - X-Page: Current page number
 * - X-Per-Page: Items per page
 * - X-Total-Pages: Total number of pages
 * 
 * @param res - Express response object
 * @param pagination - Pagination metadata
 */
export function addPaginationHeaders(
  res: Response,
  pagination: PaginationMetadata
): void {
  const { page, limit, total, pages } = pagination;

  // Build base URL from request
  const protocol = res.req.protocol;
  const host = res.req.get('host');
  const path = res.req.path;
  const baseUrl = `${protocol}://${host}${path}`;

  // Preserve other query parameters
  const queryParams = { ...res.req.query };
  delete queryParams.page;
  delete queryParams.limit;
  const queryString = new URLSearchParams(
    queryParams as Record<string, string>
  ).toString();
  const baseUrlWithQuery = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  const paramSeparator = queryString ? '&' : '?';

  // Build RFC 5988 Link header
  const links: string[] = [];

  // First page
  if (page > 1) {
    links.push(
      `<${baseUrlWithQuery}${paramSeparator}page=1&limit=${limit}>; rel="first"`
    );
  }

  // Previous page
  if (page > 1) {
    links.push(
      `<${baseUrlWithQuery}${paramSeparator}page=${page - 1}&limit=${limit}>; rel="prev"`
    );
  }

  // Next page
  if (page < pages) {
    links.push(
      `<${baseUrlWithQuery}${paramSeparator}page=${page + 1}&limit=${limit}>; rel="next"`
    );
  }

  // Last page
  if (page < pages) {
    links.push(
      `<${baseUrlWithQuery}${paramSeparator}page=${pages}&limit=${limit}>; rel="last"`
    );
  }

  // Set Link header if we have any links
  if (links.length > 0) {
    res.setHeader('Link', links.join(', '));
  }

  // Set custom pagination headers
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Per-Page', limit.toString());
  res.setHeader('X-Total-Pages', pages.toString());
}

/**
 * Extract pagination info from response for client-side use
 * Useful for debugging or when Link headers aren't available
 * 
 * @param pagination - Pagination metadata
 * @returns Object with URLs for navigation
 */
export function getPaginationUrls(
  baseUrl: string,
  pagination: PaginationMetadata,
  queryParams?: Record<string, string>
): {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
} {
  const { page, limit, pages } = pagination;
  const query = queryParams ? `&${new URLSearchParams(queryParams).toString()}` : '';

  const urls: Record<string, string> = {};

  if (page > 1) {
    urls.first = `${baseUrl}?page=1&limit=${limit}${query}`;
    urls.prev = `${baseUrl}?page=${page - 1}&limit=${limit}${query}`;
  }

  if (page < pages) {
    urls.next = `${baseUrl}?page=${page + 1}&limit=${limit}${query}`;
    urls.last = `${baseUrl}?page=${pages}&limit=${limit}${query}`;
  }

  return urls;
}
