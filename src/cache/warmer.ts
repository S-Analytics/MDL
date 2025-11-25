import { IMetricStore } from '../storage';
import { logger } from '../utils/logger';
import { cacheService } from './CacheService';

export interface CacheWarmerConfig {
  enabled: boolean;
  warmOnStartup: boolean;
  scheduledInterval?: number; // minutes
  maxMetricsToWarm?: number;
}

/**
 * Cache Warmer
 * 
 * Pre-populates the cache with frequently accessed data to improve
 * initial response times and reduce database load.
 * 
 * Warming Strategies:
 * 1. Individual metrics (most accessed)
 * 2. Common filter queries (category, tier, domain)
 * 3. Full metrics list
 */
export class CacheWarmer {
  private intervalId?: NodeJS.Timeout;
  private isWarming = false;

  constructor(
    private metricStore: IMetricStore,
    private config: CacheWarmerConfig = {
      enabled: true,
      warmOnStartup: true,
      scheduledInterval: 30,
      maxMetricsToWarm: 100
    }
  ) {}

  /**
   * Start cache warming
   * 
   * Performs initial warming if configured, then schedules periodic warming.
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Cache warming disabled');
      return;
    }

    if (this.config.warmOnStartup) {
      await this.warmCache();
    }

    if (this.config.scheduledInterval && this.config.scheduledInterval > 0) {
      this.scheduleWarming(this.config.scheduledInterval);
    }
  }

  /**
   * Stop scheduled cache warming
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Cache warming stopped');
    }
  }

  /**
   * Schedule periodic cache warming
   * 
   * @param intervalMinutes - Interval in minutes between warming runs
   */
  private scheduleWarming(intervalMinutes: number): void {
    logger.info({ intervalMinutes }, 'Scheduling cache warming');
    
    this.intervalId = setInterval(async () => {
      await this.warmCache();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Warm the cache with frequently accessed data
   * 
   * This method can be called manually or runs on schedule.
   * Uses a lock to prevent concurrent warming operations.
   */
  async warmCache(): Promise<void> {
    if (this.isWarming) {
      logger.debug('Cache warming already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      logger.info('Starting cache warming');

      const stats = {
        metricsWarmed: 0,
        queriesWarmed: 0,
        errors: 0,
        duration: 0
      };

      // 1. Warm full metrics list (most common query)
      await this.warmMetricsList(stats);

      // 2. Warm common category queries
      await this.warmCategoryQueries(stats);

      // 3. Warm common tier queries
      await this.warmTierQueries(stats);

      // 4. Warm individual metrics (top N most accessed)
      await this.warmIndividualMetrics(stats);

      stats.duration = Date.now() - startTime;
      logger.info(stats, 'Cache warming completed');

    } catch (error) {
      logger.error({ error }, 'Cache warming failed');
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm full metrics list
   */
  private async warmMetricsList(stats: { queriesWarmed: number; errors: number }): Promise<void> {
    try {
      const metrics = await this.metricStore.findAll();
      
      // Cache as it would appear in API response
      const cacheData = {
        success: true,
        data: metrics,
        count: metrics.length
      };

      // Key format matches what middleware generates for anonymous user
      const key = '/api/v1/metrics:anonymous:{}';
      await cacheService.set(key, cacheData, 300); // 5 minutes
      
      stats.queriesWarmed++;
      logger.debug({ key, count: metrics.length }, 'Warmed metrics list');
    } catch (error) {
      stats.errors++;
      logger.error({ error }, 'Failed to warm metrics list');
    }
  }

  /**
   * Warm common category filter queries
   */
  private async warmCategoryQueries(stats: { queriesWarmed: number; errors: number }): Promise<void> {
    const categories = ['operational', 'strategic', 'tactical'];
    
    for (const category of categories) {
      try {
        const metrics = await this.metricStore.findAll({ category });
        
        const cacheData = {
          success: true,
          data: metrics,
          count: metrics.length
        };

        // Key format: path:userId:sortedQuery
        const key = `/api/v1/metrics:anonymous:{"category":"${category}"}`;
        await cacheService.set(key, cacheData, 300); // 5 minutes
        
        stats.queriesWarmed++;
        logger.debug({ key, category, count: metrics.length }, 'Warmed category query');
      } catch (error) {
        stats.errors++;
        logger.error({ error, category }, 'Failed to warm category query');
      }
    }
  }

  /**
   * Warm common tier filter queries
   */
  private async warmTierQueries(stats: { queriesWarmed: number; errors: number }): Promise<void> {
    const tiers = ['tier1', 'tier2', 'tier3'];
    
    for (const tier of tiers) {
      try {
        const metrics = await this.metricStore.findAll({ tier });
        
        const cacheData = {
          success: true,
          data: metrics,
          count: metrics.length
        };

        const key = `/api/v1/metrics:anonymous:{"tier":"${tier}"}`;
        await cacheService.set(key, cacheData, 300); // 5 minutes
        
        stats.queriesWarmed++;
        logger.debug({ key, tier, count: metrics.length }, 'Warmed tier query');
      } catch (error) {
        stats.errors++;
        logger.error({ error, tier }, 'Failed to warm tier query');
      }
    }
  }

  /**
   * Warm individual metrics
   * 
   * Warms up to maxMetricsToWarm individual metric entries
   */
  private async warmIndividualMetrics(stats: { metricsWarmed: number; errors: number }): Promise<void> {
    try {
      const metrics = await this.metricStore.findAll();
      const metricsToWarm = Math.min(
        metrics.length,
        this.config.maxMetricsToWarm || 100
      );

      for (let i = 0; i < metricsToWarm; i++) {
        const metric = metrics[i];
        
        try {
          const cacheData = {
            success: true,
            data: metric
          };

          const key = `/api/v1/metrics/${metric.metric_id}:anonymous:{}`;
          await cacheService.set(key, cacheData, 600); // 10 minutes
          
          stats.metricsWarmed++;
        } catch (error) {
          stats.errors++;
          logger.error({ error, metricId: metric.metric_id }, 'Failed to warm individual metric');
        }
      }

      logger.debug({ count: metricsToWarm }, 'Warmed individual metrics');
    } catch (error) {
      stats.errors++;
      logger.error({ error }, 'Failed to warm individual metrics');
    }
  }

  /**
   * Get warmer status
   */
  getStatus(): {
    enabled: boolean;
    isWarming: boolean;
    scheduled: boolean;
    scheduledInterval?: number;
  } {
    return {
      enabled: this.config.enabled,
      isWarming: this.isWarming,
      scheduled: !!this.intervalId,
      scheduledInterval: this.config.scheduledInterval
    };
  }
}

/**
 * Create and configure cache warmer from environment
 */
export function createCacheWarmer(metricStore: IMetricStore): CacheWarmer {
  const config: CacheWarmerConfig = {
    enabled: process.env.ENABLE_CACHE_WARMING === 'true',
    warmOnStartup: process.env.CACHE_WARM_ON_STARTUP !== 'false', // Default true
    scheduledInterval: parseInt(process.env.CACHE_WARM_INTERVAL || '30'),
    maxMetricsToWarm: parseInt(process.env.CACHE_WARM_MAX_METRICS || '100')
  };

  return new CacheWarmer(metricStore, config);
}
