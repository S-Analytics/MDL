import Redis from 'ioredis';
import { createCacheSpan, executeWithSpan } from '../tracing/spans';
import { logger } from '../utils/logger';
import { getCacheConfig, getRedisConfig } from './config';

export class CacheService {
  private client: Redis | null = null;
  private enabled: boolean;
  
  constructor() {
    const config = getCacheConfig();
    this.enabled = config.enabled;
    
    if (this.enabled) {
      try {
        const redisConfig = getRedisConfig();
        this.client = new Redis(redisConfig);
        this.setupEventHandlers();
        logger.info({ host: redisConfig.host, port: redisConfig.port }, 'Redis cache enabled');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Redis cache');
        this.enabled = false;
      }
    } else {
      logger.info('Redis cache disabled - enable in Settings panel or set ENABLE_CACHE=true');
    }
  }
  
  public isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }
  
  private async ensureConnected(): Promise<void> {
    if (!this.client || !this.enabled) return;
    
    const status = this.client.status;
    
    // If connecting, wait for ready
    if (status === 'connecting' || status === 'wait') {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 5000);
        
        this.client!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    // If closed, reconnect
    else if (status === 'close' || status === 'end' || status === 'reconnecting') {
      await this.client.connect();
    }
  }
  
  private setupEventHandlers() {
    if (!this.client) return;
    
    this.client.on('connect', () => {
      logger.info('Redis connected');
    });
    
    this.client.on('ready', () => {
      logger.info('Redis ready');
    });
    
    this.client.on('error', (error) => {
      logger.error({ error }, 'Redis error');
    });
    
    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
    
    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    
    const span = createCacheSpan('get', {
      'cache.key': key,
    });
    
    return executeWithSpan(span, async () => {
      const startTime = Date.now();
      try {
        await this.ensureConnected();
        const value = await this.client!.get(key);
        
        // Record metrics
        const duration = (Date.now() - startTime) / 1000;
        const { metricsService } = await import('../metrics/MetricsService');
        metricsService.recordCacheOperation('get', duration);
        
        if (!value) {
          metricsService.recordCacheMiss('get');
          span.setAttribute('cache.hit', false);
          return null;
        }
        
        metricsService.recordCacheHit('get');
        span.setAttribute('cache.hit', true);
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(value) as T;
      } catch (error) {
        logger.error({ key, error }, 'Cache get error');
        const { metricsService } = await import('../metrics/MetricsService');
        metricsService.recordCacheMiss('get');
        span.setAttribute('cache.hit', false);
        throw error;
      }
    });
  }
  
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.enabled || !this.client) {
      logger.warn('Cache set skipped - cache disabled or client null');
      return false;
    }
    
    const span = createCacheSpan('set', {
      'cache.key': key,
      'cache.ttl': ttl || getCacheConfig().defaultTTL,
    });
    
    return executeWithSpan(span, async () => {
      const startTime = Date.now();
      
      try {
        await this.ensureConnected();
        const serialized = JSON.stringify(value);
        const config = getCacheConfig();
        const expiry = ttl || config.defaultTTL;
        
        logger.info({ key, ttl: expiry, status: this.client!.status }, 'Attempting cache set');
        const result = await this.client!.setex(key, expiry, serialized);
        logger.info({ key, ttl: expiry, result }, 'Cache set complete');
        
        // Record metrics
        const duration = (Date.now() - startTime) / 1000;
        const { metricsService } = await import('../metrics/MetricsService');
        metricsService.recordCacheOperation('set', duration);
        
        span.addEvent('cache.set', {
          'cache.size': serialized.length,
        });
        
        return true;
      } catch (error) {
        logger.error({ key, error }, 'Cache set error');
        throw error;
      }
    });
  }
  
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.client) return false;
    
    try {
      await this.ensureConnected();
      await this.client.del(key);
      logger.debug({ key }, 'Cache deleted');
      return true;
    } catch (error) {
      logger.error({ key, error }, 'Cache delete error');
      return false;
    }
  }
  
  async deletePattern(pattern: string): Promise<number> {
    if (!this.enabled || !this.client) return 0;
    
    try {
      await this.ensureConnected();
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(...keys);
      logger.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
      return keys.length;
    } catch (error) {
      logger.error({ pattern, error }, 'Cache pattern delete error');
      return 0;
    }
  }
  
  async clear(): Promise<boolean> {
    if (!this.enabled || !this.client) return false;
    
    try {
      await this.client.flushdb();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error({ error }, 'Cache clear error');
      return false;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    if (!this.enabled || !this.client) return true; // Consider disabled cache as healthy
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Cache health check failed');
      return false;
    }
  }
  
  async getStats(): Promise<{ connected: boolean; keys: number; stats: Record<string, string>; memory: Record<string, string> } | null> {
    if (!this.enabled || !this.client) return null;
    
    try {
      await this.ensureConnected();
      const info = await this.client.info('stats');
      const dbsize = await this.client.dbsize();
      const memory = await this.client.info('memory');
      
      return {
        connected: this.client.status === 'ready',
        keys: dbsize,
        stats: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory)
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return null;
    }
  }
  
  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    }
    
    return stats;
  }
  
  async close(): Promise<void> {
    if (this.enabled && this.client) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
