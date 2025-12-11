import { NextFunction, Request, Response } from 'express';
import {
    getPerformanceStats,
    getPerformanceStatsEndpoint,
    performanceMonitoring,
    resetPerformanceStats
} from '../../src/middleware/performance';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

import { logger } from '../../src/utils/logger';

describe('Performance Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Reset performance stats before each test
    resetPerformanceStats();

    mockRequest = {
      method: 'GET',
      path: '/test',
      route: { path: '/test' }as any,
    };

    const mockSend = jest.fn(function(this: any, data?: any) {
      return this;
    });

    mockResponse = {
      setHeader: jest.fn(),
      send: mockSend,
      headersSent: false,
      statusCode: 200,
      on: jest.fn((event: string, callback: Function) => {
        if (event === 'finish') {
          // Simulate async completion
          setImmediate(() => callback());
        }
        return mockResponse as Response;
      }),
    };

    nextFunction = jest.fn();

    jest.clearAllMocks();
  });

  describe('performanceMonitoring', () => {
    describe('configuration', () => {
      it('should create middleware with default configuration', () => {
        const middleware = performanceMonitoring();
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
      });

      it('should create middleware with custom configuration', () => {
        const middleware = performanceMonitoring({
          slowRequestThreshold: 500,
          logAllRequests: true,
          enabled: true,
        });
        expect(middleware).toBeDefined();
      });

      it('should skip monitoring when disabled', () => {
        const middleware = performanceMonitoring({ enabled: false });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockResponse.on).not.toHaveBeenCalled();
      });

      it('should enable monitoring with custom threshold', () => {
        const middleware = performanceMonitoring({
          enabled: true,
          slowRequestThreshold: 100,
        });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
      });
    });

    describe('response time tracking', () => {
      it('should call next immediately', () => {
        const middleware = performanceMonitoring({ enabled: true });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it('should set up response finish listener', () => {
        const middleware = performanceMonitoring({ enabled: true });
        
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
      });

      it('should add X-Response-Time header when enabled', (done) => {
        const middleware = performanceMonitoring({
          enabled: true,
          addResponseTimeHeader: true,
        });

        mockResponse.on = jest.fn((event: string, callback: Function) => {
          if (event === 'finish') {
            callback();
            setTimeout(() => {
              expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'X-Response-Time',
                expect.stringMatching(/^\d+\.\d{2}ms$/)
              );
              done();
            }, 10);
          }
          return mockResponse as Response;
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        
        // Trigger send to set header
        (mockResponse.send as jest.Mock)();
      });

      it('should not add header when disabled', () => {
        const middleware = performanceMonitoring({
          enabled: true,
          addResponseTimeHeader: false,
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)();

        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });

      it('should not add header if headers already sent', () => {
        mockResponse.headersSent = true;
        const middleware = performanceMonitoring({
          enabled: true,
          addResponseTimeHeader: true,
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        (mockResponse.send as jest.Mock)();

        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });
    });

    describe('slow request detection', () => {
      it('should log warning for slow requests', (done) => {
        const middleware = performanceMonitoring({
          enabled: true,
          slowRequestThreshold: 0, // All requests will be slow
        });

        mockResponse.on = jest.fn((event: string, callback: Function) => {
          if (event === 'finish') {
            callback();
            setTimeout(() => {
              expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                  msg: 'Slow request detected',
                  method: 'GET',
                  path: '/test',
                })
              );
              done();
            }, 10);
          }
          return mockResponse as Response;
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      });

      it('should not log warning for fast requests', (done) => {
        const middleware = performanceMonitoring({
          enabled: true,
          slowRequestThreshold: 10000, // Very high threshold
        });

        mockResponse.on = jest.fn((event: string, callback: Function) => {
          if (event === 'finish') {
            callback();
            setTimeout(() => {
              expect(logger.warn).not.toHaveBeenCalled();
              done();
            }, 10);
          }
          return mockResponse as Response;
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      });
    });

    describe('request logging', () => {
      it('should log all requests when logAllRequests is true', (done) => {
        const middleware = performanceMonitoring({
          enabled: true,
          logAllRequests: true,
        });

        mockResponse.on = jest.fn((event: string, callback: Function) => {
          if (event === 'finish') {
            callback();
            setTimeout(() => {
              expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({
                  msg: 'Request completed',
                  method: 'GET',
                  path: '/test',
                })
              );
              done();
            }, 10);
          }
          return mockResponse as Response;
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      });

      it('should not log requests when logAllRequests is false', (done) => {
        const middleware = performanceMonitoring({
          enabled: true,
          logAllRequests: false,
        });

        mockResponse.on = jest.fn((event: string, callback: Function) => {
          if (event === 'finish') {
            callback();
            setTimeout(() => {
              expect(logger.info).not.toHaveBeenCalled();
              done();
            }, 10);
          }
          return mockResponse as Response;
        });

        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      });
    });
  });

  describe('getPerformanceStats', () => {
    it('should return initial stats with zero requests', () => {
      const stats = getPerformanceStats();
      
      expect(stats).toEqual({
        totalRequests: 0,
        slowRequests: 0,
        slowRequestRate: 0,
        topEndpoints: [],
      });
    });

    it('should track request statistics', (done) => {
      const middleware = performanceMonitoring({
        enabled: true,
        slowRequestThreshold: 10000,
      });

      mockResponse.on = jest.fn((event: string, callback: Function) => {
        if (event === 'finish') {
          callback();
          setTimeout(() => {
            const stats = getPerformanceStats();
            expect(stats.totalRequests).toBe(1);
            expect(stats.slowRequests).toBe(0);
            expect(stats.topEndpoints.length).toBe(1);
            expect(stats.topEndpoints[0].path).toBe('/test');
            done();
          }, 10);
        }
        return mockResponse as Response;
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    });

    it('should calculate slow request rate correctly', (done) => {
      const middleware = performanceMonitoring({
        enabled: true,
        slowRequestThreshold: 0, // All requests slow
      });

      mockResponse.on = jest.fn((event: string, callback: Function) => {
        if (event === 'finish') {
          callback();
          setTimeout(() => {
            const stats = getPerformanceStats();
            expect(stats.slowRequestRate).toBe(100);
            done();
          }, 10);
        }
        return mockResponse as Response;
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    });
  });

  describe('resetPerformanceStats', () => {
    it('should reset all statistics', (done) => {
      const middleware = performanceMonitoring({ enabled: true });

      mockResponse.on = jest.fn((event: string, callback: Function) => {
        if (event === 'finish') {
          callback();
          setTimeout(() => {
            // Stats should show 1 request
            let stats = getPerformanceStats();
            expect(stats.totalRequests).toBe(1);

            // Reset
            resetPerformanceStats();

            // Stats should be zero
            stats = getPerformanceStats();
            expect(stats).toEqual({
              totalRequests: 0,
              slowRequests: 0,
              slowRequestRate: 0,
              topEndpoints: [],
            });
            done();
          }, 10);
        }
        return mockResponse as Response;
      });

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
    });
  });

  describe('getPerformanceStats', () => {
    it('should return zero slow request rate when no requests tracked', () => {
      // Reset to get fresh stats with no requests
      resetPerformanceStats();
      const stats = getPerformanceStats();
      
      expect(stats.totalRequests).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(stats.slowRequestRate).toBe(0); // This tests the else branch in line 99
      expect(stats.topEndpoints).toEqual([]);
    });

    it('should calculate slow request rate correctly with requests', async () => {
      resetPerformanceStats();
      
      // Create a fresh mock for this test
      const slowMockRequest: Partial<Request> = {
        method: 'GET',
        path: '/slow',
        route: { path: '/slow' } as any,
      };
      
      const slowMockResponse: Partial<Response> = {
        setHeader: jest.fn(),
        send: jest.fn(function(this: any) { return this; }),
        headersSent: false,
        statusCode: 200,
        on: jest.fn(),
      };
      
      const middleware = performanceMonitoring({ slowRequestThreshold: 1 });
      
      // Use a promise to wait for the 'finish' event
      const finishPromise = new Promise<void>((resolve) => {
        (slowMockResponse.on as jest.Mock).mockImplementation((event: string, callback: Function) => {
          if (event === 'finish') {
            setTimeout(() => {
              callback();
              resolve();
            }, 50); // Ensure it's slow enough
          }
          return slowMockResponse as Response;
        });
      });

      middleware(slowMockRequest as Request, slowMockResponse as Response, nextFunction);
      
      await finishPromise;
      
      const stats = getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.slowRequests).toBeGreaterThan(0);
      expect(stats.slowRequestRate).toBeGreaterThan(0);
    });
  });

  describe('getPerformanceStatsEndpoint', () => {
    it('should return performance stats as JSON', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn(),
      } as unknown as Response;

      getPerformanceStatsEndpoint(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            performance: expect.any(Object),
            memory: expect.objectContaining({
              heapUsed: expect.stringMatching(/^\d+\.\d{2}MB$/),
              heapTotal: expect.stringMatching(/^\d+\.\d{2}MB$/),
              external: expect.stringMatching(/^\d+\.\d{2}MB$/),
              rss: expect.stringMatching(/^\d+\.\d{2}MB$/),
            }),
            uptime: expect.stringMatching(/^\d+\.\d{2} minutes$/),
          }),
        })
      );
    });

    it('should include current memory usage', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn(),
      } as unknown as Response;

      getPerformanceStatsEndpoint(mockReq, mockRes);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(call.data.memory).toBeDefined();
      expect(call.data.memory.heapUsed).toBeDefined();
      expect(call.data.memory.heapTotal).toBeDefined();
    });

    it('should include process uptime', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn(),
      } as unknown as Response;

      getPerformanceStatsEndpoint(mockReq, mockRes);

      const call = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(call.data.uptime).toBeDefined();
      expect(typeof call.data.uptime).toBe('string');
    });
  });
});
