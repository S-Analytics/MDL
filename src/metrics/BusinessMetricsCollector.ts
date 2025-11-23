import { IMetricStore } from '../storage/MetricStore';
import { logger } from '../utils/logger';
import { metricsService } from './MetricsService';

/**
 * Business Metrics Collector
 * 
 * Periodically updates gauge metrics for business data:
 * - Total metrics by category
 * - Total domains
 * - Total objectives
 */
export class BusinessMetricsCollector {
  private store: IMetricStore | (() => IMetricStore);
  private intervalId: NodeJS.Timeout | null = null;
  private collectInterval: number;
  
  constructor(storeOrGetter: IMetricStore | (() => IMetricStore), intervalMs: number = 60000) {
    this.store = storeOrGetter;
    this.collectInterval = intervalMs;
  }
  
  /**
   * Get store instance (handles both direct store and getter function)
   */
  private getStore(): IMetricStore {
    return typeof this.store === 'function' ? this.store() : this.store;
  }
  
  /**
   * Start periodic collection
   */
  start() {
    if (this.intervalId) {
      logger.warn('BusinessMetricsCollector already started');
      return;
    }
    
    // Collect immediately on start
    this.collect().catch(error => {
      logger.error({ error }, 'Error in initial business metrics collection');
    });
    
    // Then collect periodically
    this.intervalId = setInterval(() => {
      this.collect().catch(error => {
        logger.error({ error }, 'Error in periodic business metrics collection');
      });
    }, this.collectInterval);
    
    logger.info({ intervalMs: this.collectInterval }, 'BusinessMetricsCollector started');
  }
  
  /**
   * Stop periodic collection
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('BusinessMetricsCollector stopped');
    }
  }
  
  /**
   * Collect and update all business metrics
   */
  async collect() {
    try {
      const store = this.getStore();
      
      // Get all metrics (without filters)
      const allMetrics = await store.findAll();
      
      // Count metrics by category
      const categoryCounts: Record<string, number> = {};
      allMetrics.forEach(metric => {
        const category = metric.category || 'unknown';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Update metrics_total gauges by category
      for (const [category, count] of Object.entries(categoryCounts)) {
        metricsService.updateMetricsTotal(category, count);
      }
      
      // Get domains (if store supports it)
      if ('getDomains' in store && typeof store.getDomains === 'function') {
        try {
          const domains = await (store as any).getDomains();
          metricsService.updateDomainsTotal(domains.length);
        } catch (error) {
          logger.debug('Store does not support getDomains method');
        }
      }
      
      // Get objectives (if store supports it)
      if ('getObjectives' in store && typeof store.getObjectives === 'function') {
        try {
          const objectives = await (store as any).getObjectives();
          metricsService.updateObjectivesTotal(objectives.length);
        } catch (error) {
          logger.debug('Store does not support getObjectives method');
        }
      }
      
      logger.debug({ 
        totalMetrics: allMetrics.length,
        categories: Object.keys(categoryCounts).length 
      }, 'Business metrics updated');
      
    } catch (error) {
      logger.error({ error }, 'Failed to collect business metrics');
    }
  }
}
