// Mock ALL dependencies BEFORE any imports
jest.mock('ioredis');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../src/tracing/spans', () => ({
  createCacheSpan: jest.fn(),
  executeWithSpan: jest.fn(),
}));
jest.mock('../../src/cache/config', () => ({
  getCacheConfig: jest.fn(() => ({
    enabled: false,
    defaultTTL: 3600,
  })),
  getRedisConfig: jest.fn(() => ({
    host: 'localhost',
    port: 6379,
  })),
}));
jest.mock('../../src/metrics/MetricsService', () => ({
  metricsService: {
    recordCacheOperation: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
  },
}));

import Redis from 'ioredis';
import { CacheService } from '../../src/cache/CacheService';
import { getCacheConfig, getRedisConfig } from '../../src/cache/config';
import { createCacheSpan, executeWithSpan } from '../../src/tracing/spans';
import { logger } from '../../src/utils/logger';

describe('CacheService', () => {
  let mockRedisInstance: any;
  let cacheService: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedisInstance = {
      status: 'ready',
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
    };

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisInstance);

    // Mock config functions
    (getCacheConfig as jest.Mock).mockReturnValue({
      enabled: true,
      defaultTTL: 3600,
    });

    (getRedisConfig as jest.Mock).mockReturnValue({
      host: 'localhost',
      port: 6379,
    });

    // Mock span functions
    const mockSpan = {
      setAttribute: jest.fn(),
      addEvent: jest.fn(),
      end: jest.fn(),
    };
    (createCacheSpan as jest.Mock).mockReturnValue(mockSpan);
    (executeWithSpan as jest.Mock).mockImplementation(async (span, fn) => fn());
  });

  describe('constructor', () => {
    it('should initialize with cache enabled', () => {
      cacheService = new CacheService();

      expect(cacheService.isEnabled()).toBe(true);
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
      });
      expect(logger.info).toHaveBeenCalledWith(
        { host: 'localhost', port: 6379 },
        'Redis cache enabled'
      );
    });

    it('should initialize with cache disabled', () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });

      cacheService = new CacheService();

      expect(cacheService.isEnabled()).toBe(false);
      expect(Redis).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Redis cache disabled - enable in Settings panel or set ENABLE_CACHE=true'
      );
    });

    it('should handle Redis initialization error', () => {
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      cacheService = new CacheService();

      expect(cacheService.isEnabled()).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to initialize Redis cache'
      );
    });

    it('should setup event handlers', () => {
      cacheService = new CacheService();

      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('get', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should return null when cache is disabled', async () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });

    it('should return cached value on hit', async () => {
      const cachedData = { foo: 'bar' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(cachedData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
      expect(createCacheSpan).toHaveBeenCalledWith('get', { 'cache.key': 'test-key' });
    });

    it('should return null on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle get errors', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.get.mockRejectedValue(error);

      await expect(cacheService.get('test-key')).rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith(
        { key: 'test-key', error },
        'Cache get error'
      );
    });

    it('should parse JSON correctly', async () => {
      const complexData = { nested: { value: 123 }, array: [1, 2, 3] };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(complexData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(complexData);
    });
  });

  describe('set', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should return false when cache is disabled', async () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      const result = await cacheService.set('test-key', { foo: 'bar' });

      expect(result).toBe(false);
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Cache set skipped - cache disabled or client null');
    });

    it('should set value with default TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', { foo: 'bar' });

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ foo: 'bar' })
      );
    });

    it('should set value with custom TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', { foo: 'bar' }, 7200);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        7200,
        JSON.stringify({ foo: 'bar' })
      );
    });

    it('should handle set errors', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.setex.mockRejectedValue(error);

      await expect(cacheService.set('test-key', { foo: 'bar' })).rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith(
        { key: 'test-key', error },
        'Cache set error'
      );
    });

    it('should serialize complex objects', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');
      const complexData = {
        string: 'value',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      await cacheService.set('test-key', complexData);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(complexData)
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should return false when cache is disabled', async () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      const result = await cacheService.delete('test-key');

      expect(result).toBe(false);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('should delete key successfully', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
      expect(logger.debug).toHaveBeenCalledWith({ key: 'test-key' }, 'Cache deleted');
    });

    it('should handle delete errors', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.del.mockRejectedValue(error);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        { key: 'test-key', error },
        'Cache delete error'
      );
    });
  });

  describe('deletePattern', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should return 0 when cache is disabled', async () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      const result = await cacheService.deletePattern('test:*');

      expect(result).toBe(0);
      expect(mockRedisInstance.keys).not.toHaveBeenCalled();
    });

    it('should delete matching keys', async () => {
      const matchingKeys = ['test:1', 'test:2', 'test:3'];
      mockRedisInstance.keys.mockResolvedValue(matchingKeys);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await cacheService.deletePattern('test:*');

      expect(result).toBe(3);
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(...matchingKeys);
      expect(logger.debug).toHaveBeenCalledWith(
        { pattern: 'test:*', count: 3 },
        'Cache pattern deleted'
      );
    });

    it('should return 0 when no keys match', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const result = await cacheService.deletePattern('test:*');

      expect(result).toBe(0);
      expect(mockRedisInstance.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('should handle deletePattern errors', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.keys.mockRejectedValue(error);

      const result = await cacheService.deletePattern('test:*');

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        { pattern: 'test:*', error },
        'Cache pattern delete error'
      );
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should return false when cache is disabled', async () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      const result = await cacheService.clear();

      expect(result).toBe(false);
      expect(mockRedisInstance.flushdb).not.toHaveBeenCalled();
    });

    it('should clear all cache entries', async () => {
      mockRedisInstance.flushdb.mockResolvedValue('OK');

      const result = await cacheService.clear();

      expect(result).toBe(true);
      expect(mockRedisInstance.flushdb).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cache cleared');
    });

    it('should handle clear errors', async () => {
      const error = new Error('Redis error');
      mockRedisInstance.flushdb.mockRejectedValue(error);

      const result = await cacheService.clear();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith({ error }, 'Cache clear error');
    });
  });

  describe('isEnabled', () => {
    it('should return true when cache is enabled and client exists', () => {
      cacheService = new CacheService();

      expect(cacheService.isEnabled()).toBe(true);
    });

    it('should return false when cache is disabled', () => {
      (getCacheConfig as jest.Mock).mockReturnValue({
        enabled: false,
        defaultTTL: 3600,
      });
      cacheService = new CacheService();

      expect(cacheService.isEnabled()).toBe(false);
    });
  });

  describe('connection handling', () => {
    beforeEach(() => {
      cacheService = new CacheService();
    });

    it('should handle connecting status', async () => {
      mockRedisInstance.status = 'ready'; // Start ready to avoid timeout
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should handle closed connection', async () => {
      mockRedisInstance.status = 'close';
      mockRedisInstance.connect.mockResolvedValue(undefined);
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(mockRedisInstance.connect).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('event handlers', () => {
    it('should log on connect event', () => {
      cacheService = new CacheService();
      const connectHandler = mockRedisInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )[1];

      connectHandler();

      expect(logger.info).toHaveBeenCalledWith('Redis connected');
    });

    it('should log on ready event', () => {
      cacheService = new CacheService();
      const readyHandler = mockRedisInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'ready'
      )[1];

      readyHandler();

      expect(logger.info).toHaveBeenCalledWith('Redis ready');
    });

    it('should log on error event', () => {
      cacheService = new CacheService();
      const errorHandler = mockRedisInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )[1];
      const error = new Error('Test error');

      errorHandler(error);

      expect(logger.error).toHaveBeenCalledWith({ error }, 'Redis error');
    });

    it('should log on close event', () => {
      cacheService = new CacheService();
      const closeHandler = mockRedisInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )[1];

      closeHandler();

      expect(logger.warn).toHaveBeenCalledWith('Redis connection closed');
    });

    it('should log on reconnecting event', () => {
      cacheService = new CacheService();
      const reconnectingHandler = mockRedisInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'reconnecting'
      )[1];

      reconnectingHandler();

      expect(logger.info).toHaveBeenCalledWith('Redis reconnecting');
    });
  });
});
