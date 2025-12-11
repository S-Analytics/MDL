import { NextFunction, Request, Response } from 'express';
import { cacheService } from '../../src/cache/CacheService';
import { cacheMiddleware, clearCache, invalidateCache } from '../../src/middleware/cache';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/cache/CacheService');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Cache Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonSpy: jest.Mock;
  let sendSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonSpy = jest.fn().mockReturnThis();
    sendSpy = jest.fn().mockReturnThis();

    mockRequest = {
      method: 'GET',
      path: '/api/v1/metrics',
      query: {},
      user: undefined,
    };

    mockResponse = {
      json: jsonSpy,
      send: sendSpy,
      setHeader: jest.fn(),
      statusCode: 200,
    };

    nextFunction = jest.fn();
  });

  describe('cacheMiddleware', () => {
    describe('request filtering', () => {
      it('should skip caching for non-GET requests', async () => {
        mockRequest.method = 'POST';
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(cacheService.get).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should skip caching when condition returns false', async () => {
        const condition = jest.fn().mockReturnValue(false);
        const middleware = cacheMiddleware({ condition });

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(condition).toHaveBeenCalledWith(mockRequest);
        expect(cacheService.get).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should proceed with caching when condition returns true', async () => {
        const condition = jest.fn().mockReturnValue(true);
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        const middleware = cacheMiddleware({ condition });

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(condition).toHaveBeenCalledWith(mockRequest);
        expect(cacheService.get).toHaveBeenCalled();
      });
    });

    describe('cache key generation', () => {
      it('should generate cache key with default generator', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(cacheService.get).toHaveBeenCalledWith('/api/v1/metrics:anonymous:{}');
      });

      it('should include user ID in cache key when authenticated', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        mockRequest.user = { userId: 'user123' } as any;
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(cacheService.get).toHaveBeenCalledWith('/api/v1/metrics:user123:{}');
      });

      it('should include sorted query parameters in cache key', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        mockRequest.query = { limit: '10', page: '2', sort: 'name' };
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        const expectedKey = '/api/v1/metrics:anonymous:{"limit":"10","page":"2","sort":"name"}';
        expect(cacheService.get).toHaveBeenCalledWith(expectedKey);
      });

      it('should use custom key generator when provided', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        const keyGenerator = jest.fn().mockReturnValue('custom-key');
        const middleware = cacheMiddleware({ keyGenerator });

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(keyGenerator).toHaveBeenCalledWith(mockRequest);
        expect(cacheService.get).toHaveBeenCalledWith('custom-key');
      });
    });

    describe('cache hit', () => {
      it('should return cached data on cache hit', async () => {
        const cachedData = { id: 1, name: 'Cached Metric' };
        (cacheService.get as jest.Mock).mockResolvedValue(cachedData);
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache-Key', expect.any(String));
        expect(jsonSpy).toHaveBeenCalledWith(cachedData);
        expect(nextFunction).not.toHaveBeenCalled();
      });

      it('should log cache hit', async () => {
        const cachedData = { id: 1 };
        (cacheService.get as jest.Mock).mockResolvedValue(cachedData);
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(logger.debug).toHaveBeenCalledWith(
          expect.objectContaining({ cacheKey: expect.any(String) }),
          'Cache HIT - serving from cache'
        );
      });
    });

    describe('cache miss', () => {
      it('should set cache headers on cache miss', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Cache-Key', expect.any(String));
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should cache response when json is called with 200 status', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue(undefined);
        const middleware = cacheMiddleware({ ttl: 300 });

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        // Simulate the route handler calling res.json
        const responseData = { id: 1, name: 'New Metric' };
        mockResponse.statusCode = 200;
        await (mockResponse.json as any)(responseData);

        // Wait for async cache operation
        await new Promise(resolve => setImmediate(resolve));

        expect(cacheService.set).toHaveBeenCalledWith(
          expect.any(String),
          responseData,
          300
        );
      });

      it('should not cache response with non-2xx status code', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue(undefined);
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        mockResponse.statusCode = 404;
        await (mockResponse.json as any)({ error: 'Not found' });

        await new Promise(resolve => setImmediate(resolve));

        expect(cacheService.set).not.toHaveBeenCalled();
      });

      it('should use custom TTL when provided', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue(undefined);
        const middleware = cacheMiddleware({ ttl: 600 });

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        mockResponse.statusCode = 200;
        await (mockResponse.json as any)({ data: 'test' });
        await new Promise(resolve => setImmediate(resolve));

        expect(cacheService.set).toHaveBeenCalledWith(
          expect.any(String),
          { data: 'test' },
          600
        );
      });
    });

    describe('error handling', () => {
      it('should continue on cache service error', async () => {
        (cacheService.get as jest.Mock).mockRejectedValue(new Error('Cache error'));
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(logger.error).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should log error when caching fails', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockRejectedValue(new Error('Set error'));
        const middleware = cacheMiddleware();

        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        mockResponse.statusCode = 200;
        await (mockResponse.json as any)({ data: 'test' });
        await new Promise(resolve => setImmediate(resolve));

        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ error: expect.any(Error) }),
          'Failed to cache response'
        );
      });
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache pattern on successful response', async () => {
      (cacheService.deletePattern as jest.Mock).mockResolvedValue(5);
      const middleware = invalidateCache('mdl:*/metrics:*');

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 200;
      (mockResponse.send as any)('Success');
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.deletePattern).toHaveBeenCalledWith('mdl:*/metrics:*');
      expect(logger.info).toHaveBeenCalledWith(
        { pattern: 'mdl:*/metrics:*', count: 5 },
        'Cache invalidated'
      );
    });

    it('should not invalidate cache on error response', async () => {
      const middleware = invalidateCache('mdl:*/metrics:*');

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 500;
      (mockResponse.send as any)('Error');
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.deletePattern).not.toHaveBeenCalled();
    });

    it('should not log when no keys are deleted', async () => {
      (cacheService.deletePattern as jest.Mock).mockResolvedValue(0);
      const middleware = invalidateCache('mdl:*/metrics:*');

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 200;
      (mockResponse.send as any)('Success');
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should log error when invalidation fails', async () => {
      (cacheService.deletePattern as jest.Mock).mockRejectedValue(new Error('Delete error'));
      const middleware = invalidateCache('mdl:*/metrics:*');

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 200;
      (mockResponse.send as any)('Success');
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to invalidate cache'
      );
    });

    it('should call next immediately', async () => {
      const middleware = invalidateCache('mdl:*/metrics:*');

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear entire cache on successful response', async () => {
      (cacheService.clear as jest.Mock).mockResolvedValue(undefined);
      const middleware = clearCache();

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 200;
      (mockResponse.send as any)('Success');
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.clear).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Entire cache cleared');
    });

    it('should not clear cache on error response', async () => {
      const middleware = clearCache();

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 400;
      (mockResponse.send as any)('Error');
      await new Promise(resolve => setImmediate(resolve));

      expect(cacheService.clear).not.toHaveBeenCalled();
    });

    it('should log error when clear fails', async () => {
      (cacheService.clear as jest.Mock).mockRejectedValue(new Error('Clear error'));
      const middleware = clearCache();

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.statusCode = 200;
      (mockResponse.send as any)('Success');
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to clear cache'
      );
    });

    it('should call next immediately', async () => {
      const middleware = clearCache();

      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
