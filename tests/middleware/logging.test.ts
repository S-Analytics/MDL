import { NextFunction, Request, Response } from 'express';
import {
    errorHandlingMiddleware,
    notFoundMiddleware,
    requestLoggingMiddleware
} from '../../src/middleware/logging';
import { isOperationalError, sendErrorResponse } from '../../src/utils/errors';
import { createRequestLogger, generateRequestId } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/utils/errors');
jest.mock('../../src/utils/logger');

describe('Logging Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    (generateRequestId as jest.Mock).mockReturnValue('test-request-id');
    (createRequestLogger as jest.Mock).mockReturnValue(mockLogger);

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      query: {},
      headers: {
        'user-agent': 'Test Agent',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn(),
      statusCode: 200,
    };

    nextFunction = jest.fn();
  });

  describe('requestLoggingMiddleware', () => {
    it('should generate and attach request ID', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(generateRequestId).toHaveBeenCalled();
      expect(mockRequest.requestId).toBe('test-request-id');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-request-id');
    });

    it('should attach request-scoped logger', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(createRequestLogger).toHaveBeenCalledWith('test-request-id', {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
      });
      expect(mockRequest.log).toBe(mockLogger);
    });

    it('should log incoming request', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          method: 'GET',
          url: '/api/test',
          query: {},
          userAgent: 'Test Agent',
        },
        'Incoming request'
      );
    });

    it('should set up finish event listener', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should log request completion with info level for 2xx status', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      )?.[1];

      mockResponse.statusCode = 200;
      finishCallback();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
        }),
        'Request completed'
      );
    });

    it('should log request completion with warn level for 4xx status', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      )?.[1];

      mockResponse.statusCode = 404;
      finishCallback();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
        }),
        'Request completed'
      );
    });

    it('should log request completion with warn level for 5xx status', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      )?.[1];

      mockResponse.statusCode = 500;
      finishCallback();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        }),
        'Request completed'
      );
    });

    it('should use x-forwarded-for header if present', () => {
      mockRequest.headers = {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Agent',
      };

      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(createRequestLogger).toHaveBeenCalledWith('test-request-id', {
        method: 'GET',
        url: '/api/test',
        ip: '192.168.1.1',
      });
    });

    it('should call next function', () => {
      requestLoggingMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('errorHandlingMiddleware', () => {
    let mockError: Error;

    beforeEach(() => {
      mockError = new Error('Test error');
      mockRequest.requestId = 'test-request-id';
      mockRequest.log = mockLogger;
      (isOperationalError as jest.Mock).mockReturnValue(true);
    });

    it('should send error response for operational errors', () => {
      (isOperationalError as jest.Mock).mockReturnValue(true);

      errorHandlingMiddleware(
        mockError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(sendErrorResponse).toHaveBeenCalledWith(
        mockResponse,
        mockError,
        'test-request-id'
      );
    });

    it('should handle programming errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      (isOperationalError as jest.Mock).mockReturnValue(false);
      
      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
      
      // Mock setTimeout to get the callback
      jest.useFakeTimers();

      errorHandlingMiddleware(
        mockError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.fatal).toHaveBeenCalledWith(
        { err: mockError },
        'Programming error detected - shutting down'
      );

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      expect(mockExit).toHaveBeenCalledWith(1);

      // Restore
      mockExit.mockRestore();
      jest.useRealTimers();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not exit for programming errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      (isOperationalError as jest.Mock).mockReturnValue(false);
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      errorHandlingMiddleware(
        mockError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.fatal).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();

      mockExit.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundMiddleware', () => {
    it('should return 404 with proper error structure', () => {
      const notFoundRequest: Partial<Request> = {
        requestId: 'test-request-id',
        method: 'POST',
        path: '/api/nonexistent',
      };
      const notFoundResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      notFoundMiddleware(notFoundRequest as Request, notFoundResponse as Response);

      expect(notFoundResponse.status).toHaveBeenCalledWith(404);
      expect(notFoundResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route POST /api/nonexistent not found',
        },
        requestId: 'test-request-id',
        timestamp: expect.any(String),
      });
    });

    it('should include timestamp in ISO format', () => {
      const notFoundRequest: Partial<Request> = {
        requestId: 'test-request-id',
        method: 'GET',
        path: '/test',
      };
      const notFoundResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      notFoundMiddleware(notFoundRequest as Request, notFoundResponse as Response);

      const jsonCall = (notFoundResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
