import {
    createRequestLogger,
    generateRequestId,
    logAuth,
    logError,
    logger,
    logQuery,
    logShutdown,
    logStartup,
    maskSensitive,
} from '../../src/utils/logger';

// Mock fs module
jest.mock('fs');

// Mock pino
jest.mock('pino', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  const pinoMock = jest.fn(() => mockLogger);
  Object.assign(pinoMock, {
    stdSerializers: {
      err: (err: Error) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      }),
      req: jest.fn(),
      res: jest.fn(),
    },
  });
  return pinoMock;
});

describe('Logger Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate a valid string ID', () => {
      const requestId = generateRequestId();
      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs starting with expected prefix', () => {
      const requestId = generateRequestId();
      // In test environment, uuid is mocked to return 'test-uuid-...'
      expect(requestId).toContain('test-uuid');
    });
  });

  describe('createRequestLogger', () => {
    it('should create child logger with request ID', () => {
      const requestId = 'test-request-123';
      createRequestLogger(requestId);

      expect(logger.child).toHaveBeenCalledWith({ requestId });
    });

    it('should create child logger with additional context', () => {
      const requestId = 'test-request-123';
      const additionalContext = { userId: 'user-456', action: 'test-action' };
      createRequestLogger(requestId, additionalContext);

      expect(logger.child).toHaveBeenCalledWith({
        requestId,
        userId: 'user-456',
        action: 'test-action',
      });
    });

    it('should create child logger without additional context', () => {
      const requestId = 'test-request-123';
      createRequestLogger(requestId);

      expect(logger.child).toHaveBeenCalledWith({ requestId });
    });
  });

  describe('maskSensitive', () => {
    it('should mask values longer than 4 characters', () => {
      const masked = maskSensitive('secret123456');
      expect(masked).toBe('se****56');
    });

    it('should handle empty strings', () => {
      const masked = maskSensitive('');
      expect(masked).toBe('');
    });

    it('should mask short values with asterisks', () => {
      const masked = maskSensitive('abc');
      expect(masked).toBe('****');
    });

    it('should mask exactly 4 character values', () => {
      const masked = maskSensitive('abcd');
      expect(masked).toBe('****');
    });

    it('should mask 5 character values correctly', () => {
      const masked = maskSensitive('abcde');
      expect(masked).toBe('ab****de');
    });

    it('should mask long tokens correctly', () => {
      const masked = maskSensitive('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(masked).toBe('ey****J9');
    });

    it('should handle undefined values', () => {
      const masked = maskSensitive(undefined as unknown as string);
      expect(masked).toBe('');
    });

    it('should handle null values', () => {
      const masked = maskSensitive(null as unknown as string);
      expect(masked).toBe('');
    });
  });

  describe('logQuery', () => {
    it('should log database query with duration', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = ['user-123'];
      const duration = 42;

      logQuery(query, params, duration);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          query,
          params: 1,
          duration: '42ms',
        },
        'Database query executed'
      );
    });

    it('should log query with request ID', () => {
      const query = 'INSERT INTO metrics VALUES ($1, $2, $3)';
      const params = ['metric-1', 'Test Metric', 100];
      const duration = 15;
      const requestId = 'req-789';

      logQuery(query, params, duration, requestId);

      expect(logger.child).toHaveBeenCalledWith({ requestId });
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should truncate long queries', () => {
      const longQuery = 'SELECT * FROM table WHERE ' + 'a = 1 AND '.repeat(50);
      const params: unknown[] = [];
      const duration = 100;

      logQuery(longQuery, params, duration);

      const callArgs = (logger.debug as jest.Mock).mock.calls[0];
      expect(callArgs[0].query.length).toBeLessThanOrEqual(200);
    });

    it('should log query with multiple parameters', () => {
      const query = 'UPDATE metrics SET value = $1 WHERE id = $2 AND timestamp = $3';
      const params = [42, 'metric-123', new Date()];
      const duration = 25;

      logQuery(query, params, duration);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          query,
          params: 3,
          duration: '25ms',
        },
        'Database query executed'
      );
    });

    it('should log query with empty parameters', () => {
      const query = 'SELECT NOW()';
      const params: unknown[] = [];
      const duration = 5;

      logQuery(query, params, duration);

      expect(logger.debug).toHaveBeenCalledWith(
        {
          query,
          params: 0,
          duration: '5ms',
        },
        'Database query executed'
      );
    });
  });

  describe('logAuth', () => {
    it('should log login event', () => {
      const userId = 'user-123';
      logAuth('login', userId);

      expect(logger.info).toHaveBeenCalledWith(
        {
          event: 'auth.login',
          userId,
        },
        'Authentication event: login'
      );
    });

    it('should log logout event with metadata', () => {
      const userId = 'user-456';
      const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' };
      logAuth('logout', userId, metadata);

      expect(logger.info).toHaveBeenCalledWith(
        {
          event: 'auth.logout',
          userId,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        'Authentication event: logout'
      );
    });

    it('should log token refresh event', () => {
      const userId = 'user-789';
      logAuth('token_refresh', userId);

      expect(logger.info).toHaveBeenCalledWith(
        {
          event: 'auth.token_refresh',
          userId,
        },
        'Authentication event: token_refresh'
      );
    });

    it('should log failed login event', () => {
      const userId = 'user-fail';
      const metadata = { reason: 'invalid_password', attempts: 3 };
      logAuth('failed_login', userId, metadata);

      expect(logger.info).toHaveBeenCalledWith(
        {
          event: 'auth.failed_login',
          userId,
          reason: 'invalid_password',
          attempts: 3,
        },
        'Authentication event: failed_login'
      );
    });
  });

  describe('logError', () => {
    it('should log error without context', () => {
      const error = new Error('Test error');
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
        },
        'Test error'
      );
    });

    it('should log error with context', () => {
      const error = new Error('Database connection failed');
      const context = { dbHost: 'localhost', dbPort: 5432 };
      logError(error, context);

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          dbHost: 'localhost',
          dbPort: 5432,
        },
        'Database connection failed'
      );
    });

    it('should log error with request ID', () => {
      const error = new Error('Request failed');
      const context = { statusCode: 500 };
      const requestId = 'req-error-123';
      logError(error, context, requestId);

      expect(logger.child).toHaveBeenCalledWith({ requestId });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log error with minimal context', () => {
      const error = new Error('Minimal error');
      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
        },
        'Minimal error'
      );
    });
  });

  describe('logStartup', () => {
    it('should log startup information', () => {
      const config = {
        port: 3000,
        host: 'localhost',
        storageMode: 'postgres',
        dbConnected: true,
      };

      logStartup(config);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            port: 3000,
            host: 'localhost',
            storageMode: 'postgres',
            dbConnected: true,
          }),
        }),
        'MDL Application started'
      );
    });

    it('should log startup with memory storage', () => {
      const config = {
        port: 8080,
        host: '0.0.0.0',
        storageMode: 'memory',
        dbConnected: false,
      };

      logStartup(config);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            port: 8080,
            host: '0.0.0.0',
            storageMode: 'memory',
            dbConnected: false,
          }),
        }),
        'MDL Application started'
      );
    });
  });

  describe('logShutdown', () => {
    it('should log shutdown with reason', () => {
      const reason = 'SIGTERM received';
      logShutdown(reason);

      expect(logger.info).toHaveBeenCalledWith(
        { reason: 'SIGTERM received' },
        'MDL Application shutting down'
      );
    });

    it('should log shutdown with uncaught exception', () => {
      const reason = 'Uncaught exception: TypeError';
      logShutdown(reason);

      expect(logger.info).toHaveBeenCalledWith(
        { reason },
        'MDL Application shutting down'
      );
    });

    it('should log shutdown with manual reason', () => {
      const reason = 'Manual shutdown by admin';
      logShutdown(reason);

      expect(logger.info).toHaveBeenCalledWith(
        { reason },
        'MDL Application shutting down'
      );
    });
  });

  describe('logger instance', () => {
    it('should have all standard log methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.trace).toBeDefined();
      expect(logger.fatal).toBeDefined();
    });

    it('should have child method', () => {
      expect(logger.child).toBeDefined();
      expect(typeof logger.child).toBe('function');
    });
  });

  describe('logger configuration paths', () => {
    it('should handle production JSON output path', () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      const originalLogPretty = process.env.LOG_PRETTY;
      
      // Set production environment
      process.env.NODE_ENV = 'production';
      process.env.LOG_PRETTY = 'false';
      
      // Re-import logger to trigger production path
      jest.resetModules();
      const { logger: prodLogger } = require('../../src/utils/logger');
      
      expect(prodLogger).toBeDefined();
      expect(prodLogger.info).toBeDefined();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalLogPretty !== undefined) {
        process.env.LOG_PRETTY = originalLogPretty;
      } else {
        delete process.env.LOG_PRETTY;
      }
      jest.resetModules();
    });
  });

  describe('logger serializers', () => {
    it('should serialize request objects', () => {
      const mockReq = {
        id: 'req-123',
        method: 'GET',
        url: '/api/test',
        query: { page: '1' },
        params: { id: '456' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Agent',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      // Get the pino mock first
      const pino = require('pino');
      const initialCallCount = pino.mock.calls.length;
      
      // Re-import logger to get fresh instance with the mock still active
      jest.resetModules();
      
      // Re-mock pino after reset
      jest.mock('pino', () => {
        const mockLogger = {
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
          trace: jest.fn(),
          fatal: jest.fn(),
          child: jest.fn().mockReturnThis(),
        };
        const pinoMock = jest.fn(() => mockLogger);
        Object.assign(pinoMock, {
          stdSerializers: {
            err: (err: Error) => ({
              type: err.constructor.name,
              message: err.message,
              stack: err.stack,
            }),
            req: jest.fn(),
            res: jest.fn(),
          },
        });
        return pinoMock;
      });
      
      const pinoAfterReset = require('pino');
      const loggerModule = require('../../src/utils/logger');
      
      // Check that pino was called with serializers
      expect(pinoAfterReset.mock.calls.length).toBeGreaterThan(0);
      const pinoConfig = pinoAfterReset.mock.calls[pinoAfterReset.mock.calls.length - 1][0];
      expect(pinoConfig.serializers).toBeDefined();
      expect(pinoConfig.serializers.req).toBeDefined();
      expect(pinoConfig.serializers.res).toBeDefined();
      expect(pinoConfig.serializers.err).toBeDefined();
      
      // Test req serializer
      if (typeof pinoConfig.serializers.req === 'function') {
        const serialized = pinoConfig.serializers.req(mockReq);
        expect(serialized).toHaveProperty('id', 'req-123');
        expect(serialized).toHaveProperty('method', 'GET');
        expect(serialized).toHaveProperty('url', '/api/test');
        expect(serialized).toHaveProperty('query', { page: '1' });
        expect(serialized).toHaveProperty('remoteAddress', '192.168.1.1');
        expect(serialized).toHaveProperty('userAgent', 'Test Agent');
      }
    });

    it('should serialize response objects', () => {
      const mockRes = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
      };

      jest.resetModules();
      const pino = require('pino');
      require('../../src/utils/logger');
      
      const pinoConfig = pino.mock.calls[pino.mock.calls.length - 1][0];
      
      // Test res serializer
      if (typeof pinoConfig.serializers.res === 'function') {
        const serialized = pinoConfig.serializers.res(mockRes);
        expect(serialized).toHaveProperty('statusCode', 200);
      }
    });

    it('should use pino standard error serializer', () => {
      jest.resetModules();
      const pino = require('pino');
      require('../../src/utils/logger');
      
      const pinoConfig = pino.mock.calls[pino.mock.calls.length - 1][0];
      
      // Test that err serializer is pino.stdSerializers.err
      expect(pinoConfig.serializers.err).toBe(pino.stdSerializers.err);
    });
  });
});
