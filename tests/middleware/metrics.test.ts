import { Request, Response } from 'express';
import { metricsService } from '../../src/metrics/MetricsService';
import { metricsEndpointHandler, metricsMiddleware } from '../../src/middleware/metrics';

// Mock the metrics service
jest.mock('../../src/metrics/MetricsService', () => ({
  metricsService: {
    recordHttpRequest: jest.fn(),
    getMetrics: jest.fn(),
    getContentType: jest.fn(),
  },
}));

describe('Metrics Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let originalSend: jest.Mock;
  let originalJson: jest.Mock;
  let originalEnd: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    originalSend = jest.fn(function(this: any, body?: any) {
      return this;
    });
    originalJson = jest.fn(function(this: any, body?: any) {
      return this;
    });
    originalEnd = jest.fn(function(this: any, chunk?: any, encoding?: any, callback?: any) {
      return this;
    });

    mockRequest = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
    };

    mockResponse = {
      statusCode: 200,
      send: originalSend,
      json: originalJson,
      end: originalEnd,
    };

    nextFunction = jest.fn();
  });

  describe('metricsMiddleware', () => {
    it('should call next function', () => {
      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should track request when send is called with route path', () => {
      mockRequest.route = { path: '/api/users/:id' } as any;

      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Call the overridden send
      mockResponse.send!('{"data": "test"}');

      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/users/:id',
        200,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should track request when json is called with baseUrl fallback', () => {
      mockRequest.baseUrl = '/api/v1';

      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.json!({ data: 'test' });

      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/v1',
        200,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should track request with path fallback', () => {
      const pathRequest: Partial<Request> = {
        method: 'POST',
        path: '/fallback/path',
        url: '/fallback/path',
      };
      const pathResponse: Partial<Response> = {
        statusCode: 201,
        send: originalSend,
        json: originalJson,
        end: originalEnd,
      };

      metricsMiddleware(pathRequest as Request, pathResponse as Response, nextFunction);

      pathResponse.end!('response body');

      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'POST',
        '/fallback/path',
        201,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should track request with url as last fallback', () => {
      const urlRequest: Partial<Request> = {
        method: 'PUT',
        url: '/fallback/url',
      };
      const urlResponse: Partial<Response> = {
        statusCode: 204,
        send: originalSend,
        json: originalJson,
        end: originalEnd,
      };

      metricsMiddleware(urlRequest as Request, urlResponse as Response, nextFunction);

      urlResponse.send!();

      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'PUT',
        '/fallback/url',
        204,
        expect.any(Number),
        0
      );
    });

    it('should use unknown route when nothing is available', () => {
      const unknownRequest: Partial<Request> = {
        method: 'DELETE',
      };
      const unknownResponse: Partial<Response> = {
        statusCode: 404,
        send: originalSend,
        json: originalJson,
        end: originalEnd,
      };

      metricsMiddleware(unknownRequest as Request, unknownResponse as Response, nextFunction);

      unknownResponse.json!({ error: 'not found' });

      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'DELETE',
        'unknown',
        404,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should calculate response size for send', () => {
      mockRequest.route = { path: '/test' } as any;

      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      const body = '{"test": "data"}';
      mockResponse.send!(body);

      const recordCall = (metricsService.recordHttpRequest as jest.Mock).mock.calls[0];
      const responseSize = recordCall[4];
      
      expect(responseSize).toBe(Buffer.byteLength(body));
    });

    it('should calculate response size for json', () => {
      mockRequest.route = { path: '/test' } as any;

      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      const body = { test: 'data', nested: { value: 123 } };
      mockResponse.json!(body);

      const recordCall = (metricsService.recordHttpRequest as jest.Mock).mock.calls[0];
      const responseSize = recordCall[4];
      
      expect(responseSize).toBe(Buffer.byteLength(JSON.stringify(body)));
    });

    it('should only record metrics once when called multiple times', () => {
      mockRequest.route = { path: '/test' } as any;

      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      mockResponse.send!('first');
      mockResponse.send!('second');
      mockResponse.json!({ third: true });

      expect(metricsService.recordHttpRequest).toHaveBeenCalledTimes(1);
    });

    it('should calculate duration in seconds', () => {
      mockRequest.route = { path: '/test' } as any;

      const startTime = Date.now();
      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Wait a bit
      const delay = 50;
      const waitUntil = Date.now() + delay;
      while (Date.now() < waitUntil) {
        // busy wait
      }

      mockResponse.send!('test');

      const recordCall = (metricsService.recordHttpRequest as jest.Mock).mock.calls[0];
      const duration = recordCall[3];
      
      expect(duration).toBeGreaterThanOrEqual(delay / 1000); // At least 50ms = 0.05s
      expect(duration).toBeLessThan(1); // Should be less than 1 second
    });
  });

  describe('metricsEndpointHandler', () => {
    beforeEach(() => {
      mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should return metrics with correct content type', async () => {
      (metricsService.getContentType as jest.Mock).mockReturnValue('text/plain');
      (metricsService.getMetrics as jest.Mock).mockResolvedValue('# HELP test\ntest_metric 1');

      await metricsEndpointHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('# HELP test\ntest_metric 1');
    });

    it('should handle errors when collecting metrics', async () => {
      (metricsService.getMetrics as jest.Mock).mockRejectedValue(new Error('Collection failed'));

      await metricsEndpointHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Error collecting metrics');
    });

    it('should handle errors in getContentType', async () => {
      (metricsService.getContentType as jest.Mock).mockImplementation(() => {
        throw new Error('Content type error');
      });

      await metricsEndpointHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith('Error collecting metrics');
    });
  });
});
