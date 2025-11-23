import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { logger } from '../utils/logger';

/**
 * MetricsService - Centralized Prometheus metrics collection
 * 
 * Provides:
 * - HTTP request metrics (counter, duration histogram, response size)
 * - Business metrics (metrics, domains, objectives counts)
 * - Cache metrics (hits, misses, size)
 * - Database metrics (pool connections, query duration)
 * - System metrics (via prom-client default collectors)
 */
export class MetricsService {
  private registry: Registry;
  
  // HTTP Metrics
  public httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
  public httpRequestDuration: Histogram<'method' | 'route' | 'status'>;
  public httpResponseSize: Histogram<'method' | 'route' | 'status'>;
  
  // Business Metrics
  public metricsTotal: Gauge<'category'>;
  public metricsCreated: Counter<'category'>;
  public domainsTotal: Gauge<string>;
  public domainsCreated: Counter<string>;
  public objectivesTotal: Gauge<string>;
  public objectivesCreated: Counter<string>;
  
  // Cache Metrics
  public cacheHits: Counter<'operation'>;
  public cacheMisses: Counter<'operation'>;
  public cacheSize: Gauge<string>;
  public cacheOperationDuration: Histogram<'operation'>;
  
  // Database Metrics
  public dbPoolActive: Gauge<string>;
  public dbPoolMax: Gauge<string>;
  public dbQueryDuration: Histogram<'operation'>;
  public dbErrors: Counter<'operation'>;
  
  // Error Metrics
  public errorsTotal: Counter<'type' | 'route'>;
  
  constructor() {
    this.registry = new Registry();
    
    // Collect default system metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({ 
      register: this.registry,
      prefix: 'mdl_',
    });
    
    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    
    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [this.registry],
    });
    
    // Initialize Business metrics
    this.metricsTotal = new Gauge({
      name: 'metrics_total',
      help: 'Total number of metrics by category',
      labelNames: ['category'],
      registers: [this.registry],
    });
    
    this.metricsCreated = new Counter({
      name: 'metrics_created_total',
      help: 'Total number of metrics created',
      labelNames: ['category'],
      registers: [this.registry],
    });
    
    this.domainsTotal = new Gauge({
      name: 'domains_total',
      help: 'Total number of domains',
      registers: [this.registry],
    });
    
    this.domainsCreated = new Counter({
      name: 'domains_created_total',
      help: 'Total number of domains created',
      registers: [this.registry],
    });
    
    this.objectivesTotal = new Gauge({
      name: 'objectives_total',
      help: 'Total number of objectives',
      registers: [this.registry],
    });
    
    this.objectivesCreated = new Counter({
      name: 'objectives_created_total',
      help: 'Total number of objectives created',
      registers: [this.registry],
    });
    
    // Initialize Cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['operation'],
      registers: [this.registry],
    });
    
    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['operation'],
      registers: [this.registry],
    });
    
    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Current cache size in bytes (estimated)',
      registers: [this.registry],
    });
    
    this.cacheOperationDuration = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });
    
    // Initialize Database metrics
    this.dbPoolActive = new Gauge({
      name: 'database_pool_active_connections',
      help: 'Number of active database connections',
      registers: [this.registry],
    });
    
    this.dbPoolMax = new Gauge({
      name: 'database_pool_max_connections',
      help: 'Maximum number of database connections',
      registers: [this.registry],
    });
    
    this.dbQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
    
    this.dbErrors = new Counter({
      name: 'database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation'],
      registers: [this.registry],
    });
    
    // Initialize Error metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors by type and route',
      labelNames: ['type', 'route'],
      registers: [this.registry],
    });
    
    logger.info('MetricsService initialized with Prometheus metrics');
  }
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Get registry content type for HTTP response
   */
  getContentType(): string {
    return this.registry.contentType;
  }
  
  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, responseSize: number) {
    const status = statusCode.toString();
    
    this.httpRequestsTotal.inc({ method, route, status });
    this.httpRequestDuration.observe({ method, route, status }, duration);
    this.httpResponseSize.observe({ method, route, status }, responseSize);
  }
  
  /**
   * Record business metric creation
   */
  recordMetricCreated(category: string) {
    this.metricsCreated.inc({ category });
  }
  
  /**
   * Update metrics total gauge
   */
  updateMetricsTotal(category: string, count: number) {
    this.metricsTotal.set({ category }, count);
  }
  
  /**
   * Record domain creation
   */
  recordDomainCreated() {
    this.domainsCreated.inc();
  }
  
  /**
   * Update domains total gauge
   */
  updateDomainsTotal(count: number) {
    this.domainsTotal.set(count);
  }
  
  /**
   * Record objective creation
   */
  recordObjectiveCreated() {
    this.objectivesCreated.inc();
  }
  
  /**
   * Update objectives total gauge
   */
  updateObjectivesTotal(count: number) {
    this.objectivesTotal.set(count);
  }
  
  /**
   * Record cache hit
   */
  recordCacheHit(operation: string) {
    this.cacheHits.inc({ operation });
  }
  
  /**
   * Record cache miss
   */
  recordCacheMiss(operation: string) {
    this.cacheMisses.inc({ operation });
  }
  
  /**
   * Update cache size estimate
   */
  updateCacheSize(sizeInBytes: number) {
    this.cacheSize.set(sizeInBytes);
  }
  
  /**
   * Record cache operation duration
   */
  recordCacheOperation(operation: string, duration: number) {
    this.cacheOperationDuration.observe({ operation }, duration);
  }
  
  /**
   * Update database pool metrics
   */
  updateDatabasePool(active: number, max: number) {
    this.dbPoolActive.set(active);
    this.dbPoolMax.set(max);
  }
  
  /**
   * Record database query duration
   */
  recordDatabaseQuery(operation: string, duration: number) {
    this.dbQueryDuration.observe({ operation }, duration);
  }
  
  /**
   * Record database error
   */
  recordDatabaseError(operation: string) {
    this.dbErrors.inc({ operation });
  }
  
  /**
   * Record error
   */
  recordError(type: string, route: string) {
    this.errorsTotal.inc({ type, route });
  }
  
  /**
   * Clear all metrics (useful for testing)
   */
  reset() {
    this.registry.clear();
  }
}

// Singleton instance
export const metricsService = new MetricsService();
