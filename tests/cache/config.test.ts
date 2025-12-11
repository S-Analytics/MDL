import * as fs from 'fs';
import { getCacheConfig, getRedisConfig } from '../../src/cache/config';

jest.mock('fs');

describe('Cache Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getRedisConfig', () => {
    it('should return default config when no settings file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const config = getRedisConfig();
      
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6379);
      expect(config.db).toBe(0);
      expect(config.keyPrefix).toBe('mdl:');
      expect(config.maxRetriesPerRequest).toBe(3);
    });

    it('should use environment variables when settings file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret';
      process.env.REDIS_DB = '2';
      
      const config = getRedisConfig();
      
      expect(config.host).toBe('redis.example.com');
      expect(config.port).toBe(6380);
      expect(config.password).toBe('secret');
      expect(config.db).toBe(2);
    });

    it('should handle settings file read error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });
      
      // Should fall back to environment variables
      const config = getRedisConfig();
      
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6379);
    });

    it('should use settings from file when available', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        redis: {
          host: 'settings-redis.com',
          port: 7000,
          password: 'settings-pass',
          db: 3,
        }
      }));
      
      const config = getRedisConfig();
      
      expect(config.host).toBe('settings-redis.com');
      expect(config.port).toBe(7000);
      expect(config.password).toBe('settings-pass');
      expect(config.db).toBe(3);
    });

    it('should include retryStrategy function', () => {
      const config = getRedisConfig();
      
      expect(config.retryStrategy).toBeDefined();
      expect(typeof config.retryStrategy).toBe('function');
    });

    it('should calculate retry delay correctly', () => {
      const config = getRedisConfig();
      
      if (config.retryStrategy) {
        // First retry: 50ms
        expect(config.retryStrategy(1)).toBe(50);
        // Second retry: 100ms
        expect(config.retryStrategy(2)).toBe(100);
        // Large retry count: capped at 2000ms
        expect(config.retryStrategy(100)).toBe(2000);
      }
    });

    it('should not include password in config when not provided', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      delete process.env.REDIS_PASSWORD;
      
      const config = getRedisConfig();
      
      expect(config.password).toBeUndefined();
    });
  });

  describe('getCacheConfig', () => {
    it('should return default config when no settings exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      delete process.env.ENABLE_CACHE;
      
      const config = getCacheConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.defaultTTL).toBe(300);
      expect(config.maxTTL).toBe(3600);
    });

    it('should use environment variable for cache enabled', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      process.env.ENABLE_CACHE = 'true';
      
      const config = getCacheConfig();
      
      expect(config.enabled).toBe(true);
    });

    it('should use custom TTL values from environment', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      process.env.CACHE_TTL = '600';
      process.env.CACHE_MAX_TTL = '7200';
      
      const config = getCacheConfig();
      
      expect(config.defaultTTL).toBe(600);
      expect(config.maxTTL).toBe(7200);
    });

    it('should prefer settings file for cache enabled status', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        redis: {
          enabled: true,
        }
      }));
      process.env.ENABLE_CACHE = 'false';
      
      const config = getCacheConfig();
      
      expect(config.enabled).toBe(true);
    });

    it('should handle disabled cache in settings', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        redis: {
          enabled: false,
        }
      }));
      
      const config = getCacheConfig();
      
      expect(config.enabled).toBe(false);
    });
  });
});
