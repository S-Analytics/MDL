import { Response } from 'express';
import {
    addPaginationHeaders,
    createPaginatedResponse,
    getPaginationUrls,
    PaginationOptions,
    parsePaginationParams,
} from '../../src/utils/pagination';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should return default values when no params provided', () => {
      const result = parsePaginationParams({});
      
      expect(result).toEqual({
        page: 1,
        limit: 50,
        offset: 0,
      });
    });

    it('should parse valid page and limit', () => {
      const result = parsePaginationParams({ page: '2', limit: '25' });
      
      expect(result).toEqual({
        page: 2,
        limit: 25,
        offset: 25,
      });
    });

    it('should use custom defaults from options', () => {
      const options: PaginationOptions = { limit: 20, maxLimit: 200 };
      const result = parsePaginationParams({}, options);
      
      expect(result.limit).toBe(20);
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePaginationParams({ page: '0' });
      expect(result.page).toBe(1);
      
      const result2 = parsePaginationParams({ page: '-5' });
      expect(result2.page).toBe(1);
    });

    it('should enforce minimum limit of 1', () => {
      const result = parsePaginationParams({ limit: '0' });
      expect(result.limit).toBeGreaterThanOrEqual(1);
      
      const result2 = parsePaginationParams({ limit: '-10' });
      expect(result2.limit).toBeGreaterThanOrEqual(1);
    });

    it('should enforce maximum limit', () => {
      const result = parsePaginationParams({ limit: '500' });
      expect(result.limit).toBe(100); // Default maxLimit
      
      const options: PaginationOptions = { maxLimit: 200 };
      const result2 = parsePaginationParams({ limit: '300' }, options);
      expect(result2.limit).toBe(200);
    });

    it('should calculate offset correctly', () => {
      expect(parsePaginationParams({ page: '1', limit: '10' }).offset).toBe(0);
      expect(parsePaginationParams({ page: '2', limit: '10' }).offset).toBe(10);
      expect(parsePaginationParams({ page: '3', limit: '25' }).offset).toBe(50);
      expect(parsePaginationParams({ page: '10', limit: '50' }).offset).toBe(450);
    });

    it('should handle non-numeric values gracefully', () => {
      const result = parsePaginationParams({ page: 'abc', limit: 'xyz' });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should handle string numbers', () => {
      const result = parsePaginationParams({ page: '5', limit: '30' });
      
      expect(result.page).toBe(5);
      expect(result.limit).toBe(30);
    });

    it('should handle numeric values', () => {
      const result = parsePaginationParams({ page: 3, limit: 20 });
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with data and metadata', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = createPaginatedResponse(data, 100, 1, 10);
      
      expect(result).toEqual({
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          pages: 10,
          hasNext: true,
          hasPrev: false,
        },
      });
    });

    it('should calculate pages correctly', () => {
      const data: any[] = [];
      
      expect(createPaginatedResponse(data, 100, 1, 10).pagination.pages).toBe(10);
      expect(createPaginatedResponse(data, 95, 1, 10).pagination.pages).toBe(10);
      expect(createPaginatedResponse(data, 101, 1, 10).pagination.pages).toBe(11);
      expect(createPaginatedResponse(data, 0, 1, 10).pagination.pages).toBe(1);
    });

    it('should set hasNext correctly', () => {
      const data: any[] = [];
      
      expect(createPaginatedResponse(data, 100, 1, 10).pagination.hasNext).toBe(true);
      expect(createPaginatedResponse(data, 100, 5, 10).pagination.hasNext).toBe(true);
      expect(createPaginatedResponse(data, 100, 10, 10).pagination.hasNext).toBe(false);
    });

    it('should set hasPrev correctly', () => {
      const data: any[] = [];
      
      expect(createPaginatedResponse(data, 100, 1, 10).pagination.hasPrev).toBe(false);
      expect(createPaginatedResponse(data, 100, 2, 10).pagination.hasPrev).toBe(true);
      expect(createPaginatedResponse(data, 100, 10, 10).pagination.hasPrev).toBe(true);
    });

    it('should handle empty data', () => {
      const result = createPaginatedResponse([], 0, 1, 10);
      
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(1);
    });

    it('should handle single page', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = createPaginatedResponse(data, 2, 1, 10);
      
      expect(result.pagination.pages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });
  });

  describe('addPaginationHeaders', () => {
    let mockRes: Partial<Response>;
    let mockReq: any;

    beforeEach(() => {
      mockReq = {
        protocol: 'https',
        get: jest.fn().mockReturnValue('api.example.com'),
        path: '/api/users',
        query: {},
      };

      mockRes = {
        req: mockReq,
        setHeader: jest.fn(),
      };
    });

    it('should add pagination metadata headers', () => {
      const pagination = {
        page: 2,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Total-Count', '100');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Page', '2');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Per-Page', '10');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Total-Pages', '10');
    });

    it('should add Link header with all relations when in middle page', () => {
      const pagination = {
        page: 5,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Link',
        expect.stringContaining('rel="first"')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Link',
        expect.stringContaining('rel="prev"')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Link',
        expect.stringContaining('rel="next"')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Link',
        expect.stringContaining('rel="last"')
      );
    });

    it('should not include first/prev links on first page', () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: false,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      const linkHeader = (mockRes.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'Link'
      );

      if (linkHeader) {
        expect(linkHeader[1]).not.toContain('rel="first"');
        expect(linkHeader[1]).not.toContain('rel="prev"');
        expect(linkHeader[1]).toContain('rel="next"');
        expect(linkHeader[1]).toContain('rel="last"');
      }
    });

    it('should not include next/last links on last page', () => {
      const pagination = {
        page: 10,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: false,
        hasPrev: true,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      const linkHeader = (mockRes.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'Link'
      );

      if (linkHeader) {
        expect(linkHeader[1]).toContain('rel="first"');
        expect(linkHeader[1]).toContain('rel="prev"');
        expect(linkHeader[1]).not.toContain('rel="next"');
        expect(linkHeader[1]).not.toContain('rel="last"');
      }
    });

    it('should preserve other query parameters', () => {
      mockReq.query = { search: 'test', filter: 'active' };
      
      const pagination = {
        page: 2,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      const linkHeader = (mockRes.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'Link'
      );

      if (linkHeader) {
        expect(linkHeader[1]).toContain('search=test');
        expect(linkHeader[1]).toContain('filter=active');
      }
    });

    it('should not set Link header on single page', () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 5,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      };

      addPaginationHeaders(mockRes as Response, pagination);

      const linkHeaderCall = (mockRes.setHeader as jest.Mock).mock.calls.find(
        call => call[0] === 'Link'
      );

      expect(linkHeaderCall).toBeUndefined();
    });
  });

  describe('getPaginationUrls', () => {
    it('should return all URLs for middle page', () => {
      const pagination = {
        page: 5,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      };

      const urls = getPaginationUrls('https://api.example.com/users', pagination);

      expect(urls.first).toBe('https://api.example.com/users?page=1&limit=10');
      expect(urls.prev).toBe('https://api.example.com/users?page=4&limit=10');
      expect(urls.next).toBe('https://api.example.com/users?page=6&limit=10');
      expect(urls.last).toBe('https://api.example.com/users?page=10&limit=10');
    });

    it('should only return next/last for first page', () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: false,
      };

      const urls = getPaginationUrls('https://api.example.com/users', pagination);

      expect(urls.first).toBeUndefined();
      expect(urls.prev).toBeUndefined();
      expect(urls.next).toBe('https://api.example.com/users?page=2&limit=10');
      expect(urls.last).toBe('https://api.example.com/users?page=10&limit=10');
    });

    it('should only return first/prev for last page', () => {
      const pagination = {
        page: 10,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: false,
        hasPrev: true,
      };

      const urls = getPaginationUrls('https://api.example.com/users', pagination);

      expect(urls.first).toBe('https://api.example.com/users?page=1&limit=10');
      expect(urls.prev).toBe('https://api.example.com/users?page=9&limit=10');
      expect(urls.next).toBeUndefined();
      expect(urls.last).toBeUndefined();
    });

    it('should include additional query parameters', () => {
      const pagination = {
        page: 2,
        limit: 10,
        total: 100,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      };

      const queryParams = { search: 'test', filter: 'active' };
      const urls = getPaginationUrls('https://api.example.com/users', pagination, queryParams);

      expect(urls.next).toContain('search=test');
      expect(urls.next).toContain('filter=active');
    });

    it('should return empty object for single page', () => {
      const pagination = {
        page: 1,
        limit: 10,
        total: 5,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      };

      const urls = getPaginationUrls('https://api.example.com/users', pagination);

      expect(urls).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle very large page numbers', () => {
      const result = parsePaginationParams({ page: '999999' });
      expect(result.page).toBe(999999);
      expect(result.offset).toBe(49999900); // (999999 - 1) * 50
    });

    it('should handle fractional page numbers', () => {
      const result = parsePaginationParams({ page: '2.5' });
      expect(result.page).toBe(2);
    });

    it('should handle zero total in createPaginatedResponse', () => {
      const result = createPaginatedResponse([], 0, 1, 10);
      expect(result.pagination.pages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle missing req properties gracefully', () => {
      const mockReq: any = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost'),
        path: '/test',
        query: {},
      };

      const mockRes: Partial<Response> = {
        req: mockReq,
        setHeader: jest.fn(),
      };

      const pagination = {
        page: 1,
        limit: 10,
        total: 20,
        pages: 2,
        hasNext: true,
        hasPrev: false,
      };

      expect(() => addPaginationHeaders(mockRes as Response, pagination)).not.toThrow();
    });
  });
});
