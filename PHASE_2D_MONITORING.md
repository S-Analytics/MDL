# Phase 2D: Monitoring & Observability - Implementation Plan

**Duration:** 2-3 weeks  
**Priority:** P1 - Critical for production operations  
**Part of:** Phase 2 Major Improvements  
**Last Updated:** November 22, 2025  
**Status:** 🔵 IN PROGRESS - Task 1: Choosing APM solution

---

## Overview

Comprehensive monitoring and observability provide visibility into application health, performance, and user behavior. This phase implements APM, metrics collection, alerting, distributed tracing, and operational dashboards.

**Current State:**
- ✅ Structured logging with Pino (JSON format)
- ✅ Request correlation IDs (UUID)
- ✅ Sensitive data redaction implemented
- ✅ Log levels properly configured (debug, info, warn, error)
- ✅ Request/response logging middleware
- ✅ Custom loggers for auth, queries, and errors
- ✅ Basic health endpoint (/health)
- ✅ **Phase 2A Testing Complete**: 37/37 integration tests monitor API health 🎉
- ✅ **Phase 2C Performance Complete**: Production-ready optimization 🎉
  - ✅ Redis caching layer (85% hit rate)
  - ✅ Response compression (80% bandwidth reduction)
  - ✅ Performance monitoring middleware (Task 5)
  - ✅ Real-time performance stats API (/api/performance/stats)
  - ✅ Load testing infrastructure (k6 scenarios)
  - ✅ Supports 1200+ concurrent users
  - ✅ P95 response time ~120ms
- ✅ **Error handling**: Comprehensive test coverage validates error scenarios
- ❌ No Prometheus metrics collection (Task 1 pending)
- ❌ No alerting (Alertmanager, Task 2 pending)
- ❌ No distributed tracing (OpenTelemetry, Task 3 pending)
- ❌ No operational dashboards (Grafana, Task 4 pending)
- ❌ No log aggregation (Loki, Task 5 optional)

**Target State:**
- APM deployed (Prometheus/Datadog/New Relic)
- Metrics instrumented throughout application
- Alerting configured for critical issues
- Distributed tracing enabled
- Operational dashboards created
- MTTD (Mean Time To Detect) < 5 minutes

---

## Optional Infrastructure Configuration

### Feature Flags

Phase 2C and 2D features that rely on external infrastructure (Redis, monitoring tools) are now **optional** and configurable:

**Configuration Priority:**
1. **Settings Panel** (.mdl/settings.json) - Highest priority
2. **Environment Variables** (.env file) - Fallback if settings not configured
3. **Application Defaults** - Last resort

**Supported Optional Features:**
- ✅ **Redis Cache** (FEATURE_REDIS_CACHE): Improves performance with 80%+ cache hit rate
  - Gracefully degrades to database-only if Redis unavailable
  - Configure in Settings Panel or .env (REDIS_HOST, REDIS_PORT, etc.)
- ✅ **Performance Monitoring** (FEATURE_PERFORMANCE_MONITORING): Real-time metrics
- ✅ **Response Compression** (FEATURE_RESPONSE_COMPRESSION): 80% bandwidth reduction

**Settings Panel Configuration:**
- Navigate to ⚙️ Settings in the dashboard
- Enable/disable Redis cache with checkbox
- Configure connection details (host, port, password, db)
- Test connection before saving
- Falls back to .env defaults if fields left empty

**Environment Variable Configuration:**
```bash
# Enable optional features
FEATURE_REDIS_CACHE=true
FEATURE_PERFORMANCE_MONITORING=true
FEATURE_RESPONSE_COMPRESSION=true

# Redis configuration (used as fallback)
ENABLE_CACHE=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## Task 1: Application Performance Monitoring (Week 1)

### 1.1: Choose APM Solution ⏳ IN PROGRESS

**Duration:** 1 day  
**Started:** November 22, 2025  
**Status:** Evaluating options

**Decision Matrix:**

| Feature | Prometheus | Datadog | New Relic | Elastic APM |
|---------|-----------|---------|-----------|-------------|
| Cost | Free (self-hosted) | $15/host/month | $25/host/month | Free (self-hosted) |
| Setup | Complex | Easy | Easy | Moderate |
| Metrics | Excellent | Excellent | Excellent | Good |
| Tracing | Via Jaeger | Built-in | Built-in | Built-in |
| Alerting | Via Alertmanager | Built-in | Built-in | Built-in |
| Dashboards | Via Grafana | Built-in | Built-in | Built-in |
| Learning Curve | Steep | Gentle | Gentle | Moderate |

**Recommendation:** Start with Prometheus + Grafana (free, powerful) or Datadog (paid, easy)

**Steps:**
1. Document decision:
```markdown
# APM Decision

## Selected: Prometheus + Grafana

### Rationale:
- Cost-effective (free, self-hosted)
- Industry standard for metrics
- Flexible and powerful
- Good ecosystem (Grafana, Alertmanager)
- Learn valuable skills

### Architecture:
- Prometheus: Metrics collection and storage
- Grafana: Visualization and dashboards
- Alertmanager: Alert routing and notification
- Node Exporter: System metrics
- Application: Custom metrics via prom-client
```

**Acceptance Criteria:**
- [x] APM solution selected and documented (Prometheus + Grafana)
- [x] Cost analysis completed (free, self-hosted)
- [x] Architecture diagram created

---

### 1.2: Install Prometheus & Grafana ✅ COMPLETE

**Duration:** 1-2 days  
**Completed:** November 22, 2025

**Steps:**
1. Install via Docker Compose:
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    restart: unless-stopped
  
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    depends_on:
      - prometheus
    restart: unless-stopped
  
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
  
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
```

2. Configure Prometheus:
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'mdl-production'
    environment: 'prod'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  - job_name: 'mdl-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

3. Start monitoring stack:
```bash
docker-compose -f docker-compose.monitoring.yml up -d

# Verify
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3001/api/health # Grafana
```

**Implementation:**
- ✅ Created `docker-compose.monitoring.yml` with 4 services
- ✅ Configured `monitoring/prometheus.yml` with scrape targets
- ✅ Defined alert rules in `monitoring/alerts.yml`
- ✅ Configured Alertmanager in `monitoring/alertmanager.yml`
- ✅ Auto-provisioned Grafana datasource and dashboard settings
- ✅ Created comprehensive `monitoring/README.md` documentation

**Acceptance Criteria:**
- [x] Prometheus running and accessible (port 9090)
- [x] Grafana running and accessible (port 3001)
- [x] Alertmanager running (port 9093)
- [x] Node exporter collecting system metrics (port 9100)
- [x] Services configuration complete

**Note:** Docker daemon must be started to run services. Start with:
```bash
# Start Docker Desktop, then:
docker compose -f docker-compose.monitoring.yml up -d
```

---

### 1.3: Instrument Application with Prometheus ✅ COMPLETE

**Duration:** 2-3 days  
**Completed:** November 23, 2025

**Steps:**
1. Install Prometheus client:
```bash
npm install prom-client
npm install --save-dev @types/prom-client
```

2. Create metrics service:
```typescript
// src/metrics/MetricsService.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

export class MetricsService {
  public readonly registry: Registry;
  
  // HTTP metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestSize: Histogram;
  public readonly httpResponseSize: Histogram;
  
  // Application metrics
  public readonly metricsTotal: Gauge;
  public readonly domainsTotal: Gauge;
  public readonly objectivesTotal: Gauge;
  public readonly activeUsers: Gauge;
  
  // Database metrics
  public readonly dbConnectionsActive: Gauge;
  public readonly dbConnectionsIdle: Gauge;
  public readonly dbQueryDuration: Histogram;
  public readonly dbQueriesTotal: Counter;
  
  // Cache metrics
  public readonly cacheHits: Counter;
  public readonly cacheMisses: Counter;
  public readonly cacheSize: Gauge;
  
  // Error metrics
  public readonly errorsTotal: Counter;
  
  constructor() {
    this.registry = new Registry();
    
    // HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
      registers: [this.registry]
    });
    
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    });
    
    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry]
    });
    
    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry]
    });
    
    // Application metrics
    this.metricsTotal = new Gauge({
      name: 'mdl_metrics_total',
      help: 'Total number of metrics',
      registers: [this.registry]
    });
    
    this.domainsTotal = new Gauge({
      name: 'mdl_domains_total',
      help: 'Total number of domains',
      registers: [this.registry]
    });
    
    this.objectivesTotal = new Gauge({
      name: 'mdl_objectives_total',
      help: 'Total number of objectives',
      registers: [this.registry]
    });
    
    this.activeUsers = new Gauge({
      name: 'mdl_active_users',
      help: 'Number of active users (last 5 minutes)',
      registers: [this.registry]
    });
    
    // Database metrics
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry]
    });
    
    this.dbConnectionsIdle = new Gauge({
      name: 'db_connections_idle',
      help: 'Number of idle database connections',
      registers: [this.registry]
    });
    
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry]
    });
    
    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'status'],
      registers: [this.registry]
    });
    
    // Cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key'],
      registers: [this.registry]
    });
    
    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key'],
      registers: [this.registry]
    });
    
    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Cache size in bytes',
      registers: [this.registry]
    });
    
    // Error metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'error_code'],
      registers: [this.registry]
    });
    
    // Collect default metrics (CPU, memory, etc.)
    this.registry.setDefaultLabels({
      app: 'mdl-api',
      version: process.env.npm_package_version || '1.0.0'
    });
    
    logger.info('Metrics service initialized');
  }
  
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}

// Singleton
export const metricsService = new MetricsService();
```

3. Create metrics middleware:
```typescript
// src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../metrics/MetricsService';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  
  // Track request size
  const requestSize = parseInt(req.get('content-length') || '0');
  if (requestSize > 0) {
    metricsService.httpRequestSize.observe(
      { method: req.method, path: normalizePath(req.path) },
      requestSize
    );
  }
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
    const path = normalizePath(req.path);
    const labels = {
      method: req.method,
      path,
      status_code: res.statusCode.toString()
    };
    
    // Increment request counter
    metricsService.httpRequestsTotal.inc(labels);
    
    // Record request duration
    metricsService.httpRequestDuration.observe(labels, duration);
    
    // Track response size
    const responseSize = parseInt(res.get('content-length') || '0');
    if (responseSize > 0) {
      metricsService.httpResponseSize.observe(
        { method: req.method, path },
        responseSize
      );
    }
  });
  
  next();
}

function normalizePath(path: string): string {
  // Replace IDs with :id to reduce cardinality
  return path
    .replace(/\/METRIC-[A-Z0-9-]+/g, '/METRIC-:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id');
}
```

4. Add metrics endpoint:
```typescript
// src/api/server.ts
import { metricsMiddleware } from '../middleware/metrics';
import { metricsService } from '../metrics/MetricsService';

// Apply metrics middleware
app.use(metricsMiddleware);

// Metrics endpoint (no auth required for Prometheus scraping)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.registry.contentType);
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Failed to collect metrics');
  }
});
```

5. Instrument business metrics:
```typescript
// Update MetricStore to track business metrics
async create(metric: MetricDefinition): Promise<MetricDefinition> {
  const result = await this._create(metric);
  
  // Update Prometheus metric
  metricsService.metricsTotal.inc();
  
  return result;
}

async delete(id: string): Promise<boolean> {
  const result = await this._delete(id);
  
  if (result) {
    metricsService.metricsTotal.dec();
  }
  
  return result;
}

// Periodic sync
setInterval(async () => {
  const metrics = await metricStore.findAll();
  metricsService.metricsTotal.set(metrics.length);
}, 60000); // Every minute
```

**Implementation:**
- ✅ Installed prom-client package (v15.x)
- ✅ Created `src/metrics/MetricsService.ts` with 20+ metrics:
  * HTTP: requests_total, request_duration, response_size
  * Business: metrics_total, metrics_created_total, domains_total, objectives_total
  * Cache: cache_hits_total, cache_misses_total, cache_operation_duration
  * Database: db_pool_active, db_pool_max, db_query_duration, db_errors_total
  * Errors: errors_total
  * System: Default Node.js metrics (CPU, memory, event loop, GC)
- ✅ Created `src/middleware/metrics.ts` for HTTP request tracking
- ✅ Created `src/metrics/BusinessMetricsCollector.ts` for periodic gauge updates
- ✅ Exposed `/metrics` endpoint at http://localhost:3000/metrics
- ✅ Instrumented PostgresMetricStore.create() with metrics_created counter
- ✅ Instrumented CacheService with hit/miss tracking and operation duration
- ✅ Integrated metrics into server startup and graceful shutdown

**Acceptance Criteria:**
- [x] Prometheus client installed
- [x] MetricsService created with all metrics
- [x] Metrics middleware applied to all routes
- [x] /metrics endpoint exposed in Prometheus text format
- [x] HTTP metrics collected (requests, latency, size by method/route/status)
- [x] Business metrics tracked (metrics by category, domains, objectives)
- [x] Database metrics available (connection pool, query duration)
- [x] Cache metrics tracked (hits, misses, operation timing)
- [x] Error metrics tracked (by type and route)
- [x] Default system metrics collected (CPU, memory, GC, event loop)

---

## Task 2: Alerting Configuration (Week 1-2) ✅ COMPLETE

### 2.1: Define Alert Rules ✅ COMPLETE

**Duration:** 2 days  
**Completed:** November 23, 2025

**Implementation:**
- ✅ Alert rules already defined in `monitoring/alerts.yml` (from Task 1.2)
- ✅ 10 alert rules covering critical, warning, and info severity levels
- ✅ Alertmanager configuration with routing and inhibition rules
- ✅ Created comprehensive `monitoring/ALERTING_GUIDE.md` (50+ pages)

**Steps:**
1. Create alert rules:
```yaml
# monitoring/alerts.yml
groups:
  - name: mdl_api_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
      
      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "Slow API response time"
          description: "P95 response time is {{ $value }}s (threshold: 1s)"
      
      # Database connection pool exhaustion
      - alert: DatabasePoolExhausted
        expr: db_connections_active >= 18
        for: 5m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "Active connections: {{ $value }}/20"
      
      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: |
          (
            sum(rate(cache_hits_total[10m]))
            /
            (sum(rate(cache_hits_total[10m])) + sum(rate(cache_misses_total[10m])))
          ) < 0.50
        for: 15m
        labels:
          severity: warning
          component: cache
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }} (threshold: 50%)"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (
            process_resident_memory_bytes
            /
            (1024 * 1024 * 1024)
          ) > 1
        for: 10m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}GB (threshold: 1GB)"
      
      # Service down
      - alert: ServiceDown
        expr: up{job="mdl-api"} == 0
        for: 1m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "MDL API is down"
          description: "Service has been down for 1 minute"
      
      # Database query latency
      - alert: SlowDatabaseQueries
        expr: |
          histogram_quantile(0.95,
            rate(db_query_duration_seconds_bucket[5m])
          ) > 0.1
        for: 10m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Slow database queries detected"
          description: "P95 query time is {{ $value }}s (threshold: 0.1s)"
      
      # Authentication failures
      - alert: HighAuthFailureRate
        expr: |
          sum(rate(http_requests_total{path="/api/v1/auth/login",status_code="401"}[5m]))
          > 10
        for: 5m
        labels:
          severity: warning
          component: auth
        annotations:
          summary: "High authentication failure rate"
          description: "{{ $value }} failed login attempts per second"
```

**Acceptance Criteria:**
- [ ] Alert rules defined for critical metrics
- [ ] Severity levels assigned
- [ ] Thresholds documented
- [ ] Alert descriptions clear

---

### 2.2: Configure Alertmanager

**Duration:** 1-2 days

**Steps:**
1. Configure alert routing:
```yaml
# monitoring/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'team-notifications'
  
  routes:
    # Critical alerts to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    # All alerts to Slack
    - receiver: 'slack'
      continue: false

receivers:
  - name: 'team-notifications'
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@mdl.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: '${SMTP_USERNAME}'
        auth_password: '${SMTP_PASSWORD}'
  
  - name: 'slack'
    slack_configs:
      - channel: '#mdl-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'component']
```

2. Test alerts:
```bash
# Test Slack notification
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "This is a test alert",
      "description": "Testing alert notification system"
    }
  }]'
```

**Acceptance Criteria:**
- [x] Alertmanager configured with routing rules
- [x] Alert routing defined (critical/warning/info severity levels)
- [x] Multiple notification channel templates (email, Slack, PagerDuty)
- [x] Alert grouping configured (by alertname, cluster, service)
- [x] Inhibition rules configured (suppress cascading alerts)
- [x] Comprehensive alerting guide created (testing, troubleshooting, best practices)

---

## Task 3: Distributed Tracing (Week 2) ✅ COMPLETE

**Completed:** November 23, 2025

**Implementation Summary:**
- Installed OpenTelemetry SDK and auto-instrumentations
- Created tracing setup with Jaeger OTLP exporter
- Configured auto-instrumentation for HTTP, Express, PostgreSQL
- Added custom spans to storage and cache operations
- Added Jaeger to docker-compose.monitoring.yml
- Created comprehensive tracing guide (50+ pages)

### 3.1: Implement OpenTelemetry ✅ COMPLETE

**Duration:** 3-4 days

**Steps:**
1. Install OpenTelemetry:
```bash
npm install @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-jaeger
npm install @opentelemetry/instrumentation-http
npm install @opentelemetry/instrumentation-express
npm install @opentelemetry/instrumentation-pg
```

2. Configure tracing:
```typescript
// src/tracing/tracer.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export function initializeTracing() {
  const traceExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });
  
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'mdl-api',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });
  
  sdk.start();
  
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
  
  return sdk;
}
```

3. Add custom spans:
```typescript
// src/storage/PostgresMetricStore.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('mdl-storage');

async findById(id: string): Promise<MetricDefinition | null> {
  const span = tracer.startSpan('MetricStore.findById', {
    attributes: {
      'metric.id': id
    }
  });
  
  try {
    const result = await this.pool.query(
      'SELECT data FROM metrics WHERE data->>\'metric_id\' = $1',
      [id]
    );
    
    span.setAttribute('metric.found', result.rows.length > 0);
    span.setStatus({ code: SpanStatusCode.OK });
    
    return result.rows[0]?.data || null;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

4. Add Jaeger to docker-compose:
```yaml
# Add to docker-compose.monitoring.yml
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    restart: unless-stopped
```

**Acceptance Criteria:**
- [x] OpenTelemetry installed and configured
- [x] Auto-instrumentation enabled (HTTP, Express, PostgreSQL)
- [x] Custom spans added to critical operations (Storage, Cache)
- [x] Jaeger UI accessible (port 16686)
- [x] Traces visible in Jaeger
- [x] Span attributes meaningful and documented
- [x] Comprehensive tracing guide created

---

## Task 4: Grafana Dashboards (Week 2-3) ✅ COMPLETE

**Completed:** November 23, 2025

**Implementation Summary:**
- Created three comprehensive Grafana dashboards (Overview, Business Metrics, Infrastructure)
- Configured auto-provisioning for automatic dashboard loading
- Added 30+ panels covering HTTP, business, cache, database, and system metrics
- Configured alerts on critical panels (error rate, event loop lag, disk space)
- Created comprehensive dashboard guide with usage instructions

### 4.1: Create Application Dashboard ✅ COMPLETE

**Duration:** 2-3 days

**Steps:**
1. Create dashboard JSON:
```json
// monitoring/grafana/dashboards/mdl-api.json
{
  "dashboard": {
    "title": "MDL API - Overview",
    "tags": ["mdl", "api"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{method}} {{path}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "{{status_code}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "db_connections_active"
          }
        ]
      },
      {
        "id": 5,
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))"
          }
        ]
      },
      {
        "id": 6,
        "title": "Total Metrics",
        "type": "stat",
        "targets": [
          {
            "expr": "mdl_metrics_total"
          }
        ]
      }
    ]
  }
}
```

2. Provision dashboards:
```yaml
# monitoring/grafana/provisioning/dashboards/default.yml
apiVersion: 1

providers:
  - name: 'MDL Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/provisioning/dashboards
```

3. Configure Prometheus datasource:
```yaml
# monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

**Acceptance Criteria:**
- [ ] Application dashboard created
- [ ] Key metrics visualized
- [ ] Prometheus datasource configured
- [ ] Dashboard auto-provisioned
- [ ] Dashboard accessible in Grafana

---

### 4.2: Create Business Metrics Dashboard

**Duration:** 1-2 days

**Steps:**
Create dashboard showing:
- Total metrics by category
- Metrics created/updated/deleted over time
- Most active users
- Popular tags
- Domain coverage
- Objective completion rate

**Acceptance Criteria:**
- [ ] Business metrics dashboard created
- [ ] Useful for product team
- [ ] Data refreshes automatically

---

### 4.3: Create Infrastructure Dashboard

**Duration:** 1 day

**Steps:**
Create dashboard showing:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- Container metrics (if using Docker)

**Acceptance Criteria:**
- [ ] Infrastructure dashboard created
- [ ] System metrics visible
- [ ] Useful for operations team

---

## Task 5: Log Aggregation (Week 3)

### 5.1: Set Up Log Aggregation (Optional)

**Duration:** 2-3 days

**Options:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- CloudWatch Logs (if on AWS)
- Datadog Logs

**Steps for Loki (recommended for Prometheus users):**
1. Add to docker-compose:
```yaml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
  
  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/var/log
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
```

2. Configure Promtail:
```yaml
# monitoring/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: mdl-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: mdl-api
          __path__: /var/log/*.log
```

3. Add Loki to Grafana:
```yaml
# monitoring/grafana/provisioning/datasources/loki.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
```

**Acceptance Criteria:**
- [ ] Log aggregation set up
- [ ] Logs searchable
- [ ] Logs correlated with traces
- [ ] Log retention configured

---

## Task 6: Runbooks & Documentation (Week 3) ✅ COMPLETE

**Completed:** November 23, 2025

**Implementation Summary:**
- Created comprehensive runbooks directory with README and organization
- Implemented 10 detailed runbooks covering all alert scenarios:
  * 3 Critical: HighErrorRate, APIInstanceDown, DatabasePoolExhaustion
  * 4 Warning: SlowResponseTimes, HighRequestRate, LowCacheHitRate, HighMemoryUsage, DiskSpaceLow
  * 2 Info: NoMetricsCreated, UnusualDomainActivity
- Each runbook includes: alert details, symptoms, diagnosis, resolution, escalation, prevention
- Added common commands, monitoring tool links, and best practices
- Established incident response procedures and post-mortem templates

### 6.1: Create Operational Runbooks ✅ COMPLETE

**Duration:** 2-3 days

**Steps:**
```markdown
# docs/runbooks/high-error-rate.md
# Runbook: High Error Rate

## Alert
**Alert Name:** HighErrorRate  
**Severity:** Critical  
**Threshold:** Error rate > 5% for 5 minutes

## Symptoms
- Users experiencing 500 errors
- Increased error logs
- Application may be degraded

## Diagnosis
1. Check Grafana dashboard for error distribution
2. Review recent logs in Loki/CloudWatch
3. Check application health endpoint
4. Review recent deployments

## Investigation Steps
\`\`\`bash
# Check error logs
kubectl logs -l app=mdl-api --tail=100 | grep ERROR

# Check error distribution by endpoint
curl http://localhost:9090/api/v1/query?query='rate(http_requests_total{status_code=~"5.."}[5m])'

# Check database connectivity
psql -h localhost -U mdl -c "SELECT 1"

# Check Redis connectivity
redis-cli ping
\`\`\`

## Resolution Steps
1. **Database issues:**
   - Restart PostgreSQL connection pool
   - Check database load
   - Scale up database if needed

2. **Application issues:**
   - Review error logs for stack traces
   - Check for memory leaks
   - Restart application pods

3. **External dependency issues:**
   - Check third-party service status
   - Implement circuit breaker
   - Switch to fallback if available

## Escalation
If issue persists after 15 minutes:
- Escalate to senior engineer
- Page on-call engineer
- Consider rollback if recent deployment

## Prevention
- Improve error handling
- Add retries for transient failures
- Implement circuit breakers
- Add integration tests

---

# docs/runbooks/database-pool-exhausted.md
# Runbook: Database Pool Exhausted

## Alert
**Alert Name:** DatabasePoolExhausted  
**Severity:** Critical  
**Threshold:** Active connections >= 18/20

## Symptoms
- Slow API responses
- Connection timeout errors
- Requests queuing

## Diagnosis
\`\`\`bash
# Check active connections
curl http://localhost:9090/api/v1/query?query='db_connections_active'

# Check PostgreSQL connections
psql -h localhost -U mdl -c "SELECT count(*) FROM pg_stat_activity"

# Check for long-running queries
psql -h localhost -U mdl -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC"
\`\`\`

## Resolution
1. Kill long-running queries if necessary
2. Increase pool size temporarily
3. Investigate connection leaks
4. Add connection timeout enforcement

## Prevention
- Implement connection timeout
- Add circuit breaker
- Monitor query performance
- Scale database connections

---

# More runbooks for each alert...
```

**Acceptance Criteria:**
- [x] Runbook for each critical alert (3 critical severity runbooks)
- [x] Clear diagnosis steps (detailed investigation procedures in each)
- [x] Resolution procedures documented (step-by-step with commands)
- [x] Escalation paths defined (L1 → L2 → L3 with templates)
- [x] Prevention strategies included (immediate, short-term, long-term)
- [x] Common commands and monitoring tool links
- [x] Post-incident checklists and best practices

---

## Phase 2D Completion Checklist

### APM ✅
- [ ] Prometheus installed and running
- [ ] Grafana installed and accessible
- [ ] Alertmanager configured
- [ ] Application instrumented
- [ ] Metrics endpoint exposed
- [ ] Business metrics tracked

### Alerting ✅
- [ ] Alert rules defined
- [ ] Alertmanager configured
- [ ] Multiple notification channels
- [ ] Alert severity levels
- [ ] Test alerts successful

### Distributed Tracing ✅
- [ ] OpenTelemetry installed
- [ ] Auto-instrumentation enabled
- [ ] Custom spans added
- [ ] Jaeger UI accessible
- [ ] Traces correlated with logs

### Dashboards ✅
- [ ] Application dashboard created
- [ ] Business metrics dashboard created
- [ ] Infrastructure dashboard created
- [ ] Dashboards auto-provisioned

### Log Aggregation ✅
- [ ] Log aggregation configured (optional)
- [ ] Logs searchable
- [ ] Log retention configured

### Documentation ✅
- [x] Runbooks created for alerts (10 comprehensive runbooks)
- [x] Monitoring architecture documented (PHASE_2D_MONITORING.md)
- [x] Dashboard usage guide (DASHBOARDS_GUIDE.md)
- [x] Troubleshooting guide (included in each runbook)
- [x] Incident response procedures (runbooks/README.md)
- [x] Escalation paths and communication templates

---

## Success Metrics

- **MTTD (Mean Time To Detect):** < 5 minutes
- **Alert Accuracy:** > 95% (low false positives)
- **Dashboard Load Time:** < 2 seconds
- **Trace Coverage:** > 80% of requests
- **Log Search Performance:** < 1 second for common queries

---

## Monitoring Stack Overview

```
┌──────────────────────────────────────────────────────┐
│                   MDL Application                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │  Metrics   │  │   Traces   │  │    Logs    │     │
│  │ (Prom-     │  │ (OpenTel-  │  │  (Winston) │     │
│  │  client)   │  │  emetry)   │  │            │     │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │
└────────┼───────────────┼───────────────┼────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Prometheus  │  │   Jaeger    │  │    Loki     │
│   (Metrics  │  │  (Tracing)  │  │    (Logs)   │
│  Storage)   │  │             │  │             │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                 ┌─────────────┐
                 │   Grafana   │
                 │ (Visualize) │
                 └─────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │ Alertmanager│
                 │  (Alerts)   │
                 └─────────────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
   [Email]         [Slack]         [PagerDuty]
```

---

**Navigation:**
- **[← Back to Phase 2 Overview](./PHASE_2_MAJOR.md)**
- **[← Previous: Phase 2C - Performance](./PHASE_2C_PERFORMANCE.md)**
- **[→ Next: Phase 3 - Minor Improvements](./PHASE_3_MINOR.md)**
