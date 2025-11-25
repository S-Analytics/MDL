# MDL Prometheus Metrics Reference

## Overview

The MDL API exposes comprehensive metrics at the `/metrics` endpoint in Prometheus format. These metrics cover HTTP requests, business operations, cache performance, database operations, and system health.

**Metrics Endpoint**: `http://localhost:3000/metrics`

## Metric Categories

### 1. HTTP Metrics

Track all HTTP requests, latency, and response sizes.

#### `http_requests_total` (Counter)
Total number of HTTP requests by method, route, and status.

**Labels**:
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `route`: Request route pattern (e.g., `/api/metrics`, `/api/metrics/:id`)
- `status`: HTTP status code (200, 404, 500, etc.)

**Example**:
```
http_requests_total{method="GET",route="/api/metrics",status="200"} 1523
http_requests_total{method="POST",route="/api/metrics",status="201"} 42
http_requests_total{method="GET",route="/api/metrics/:id",status="404"} 5
```

#### `http_request_duration_seconds` (Histogram)
Duration of HTTP requests in seconds.

**Labels**: `method`, `route`, `status`

**Buckets**: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 seconds

**Use Cases**:
- P50/P95/P99 latency calculations
- Identify slow endpoints
- Track performance degradation

**PromQL Examples**:
```promql
# P95 latency across all endpoints
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 latency for specific endpoint
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{route="/api/metrics"}[5m]))

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### `http_response_size_bytes` (Histogram)
Size of HTTP responses in bytes.

**Labels**: `method`, `route`, `status`

**Buckets**: 100, 500, 1K, 5K, 10K, 50K, 100K, 500K, 1MB

**Use Cases**:
- Monitor bandwidth usage
- Identify large responses
- Track compression effectiveness

---

### 2. Business Metrics

Track domain-specific metrics related to metrics, domains, and objectives.

#### `metrics_total` (Gauge)
Current total number of metrics by category.

**Labels**:
- `category`: Metric category (e.g., "financial", "operational", "customer")

**Example**:
```
metrics_total{category="financial"} 45
metrics_total{category="operational"} 123
metrics_total{category="customer"} 67
```

**PromQL Examples**:
```promql
# Total metrics across all categories
sum(metrics_total)

# Top 5 categories by metric count
topk(5, metrics_total)

# Growth rate of metrics in a category
rate(metrics_created_total{category="financial"}[1h])
```

#### `metrics_created_total` (Counter)
Total number of metrics created since startup.

**Labels**: `category`

**Use Cases**:
- Track metric creation rate
- Identify active development areas
- Monitor system usage patterns

#### `domains_total` (Gauge)
Current total number of domains.

**Use Cases**:
- Track domain portfolio size
- Monitor domain structure growth

#### `domains_created_total` (Counter)
Total number of domains created since startup.

#### `objectives_total` (Gauge)
Current total number of objectives.

#### `objectives_created_total` (Counter)
Total number of objectives created since startup.

---

### 3. Cache Metrics

Monitor Redis cache performance (if enabled).

#### `cache_hits_total` (Counter)
Total number of cache hits.

**Labels**:
- `operation`: Cache operation type (get, set, etc.)

**Example**:
```
cache_hits_total{operation="get"} 8523
```

#### `cache_misses_total` (Counter)
Total number of cache misses.

**Labels**: `operation`

**Cache Hit Rate Calculation**:
```promql
# Current hit rate percentage
(
  rate(cache_hits_total[5m]) 
  / 
  (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
) * 100
```

#### `cache_operation_duration_seconds` (Histogram)
Duration of cache operations in seconds.

**Labels**: `operation`

**Buckets**: 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5 seconds

**Use Cases**:
- Monitor cache latency
- Detect cache performance issues
- Compare cache vs database performance

#### `cache_size_bytes` (Gauge)
Estimated cache size in bytes.

**Use Cases**:
- Monitor memory usage
- Plan cache capacity
- Track cache growth

---

### 4. Database Metrics

Monitor PostgreSQL database operations (if enabled).

#### `database_pool_active_connections` (Gauge)
Number of active database connections.

**Alert**: Fire alert when approaching pool limit (>80% of max)

#### `database_pool_max_connections` (Gauge)
Maximum number of database connections allowed.

#### `database_query_duration_seconds` (Histogram)
Duration of database queries in seconds.

**Labels**:
- `operation`: Query operation type

**Buckets**: 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5 seconds

**PromQL Examples**:
```promql
# P95 query latency
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))

# Slow queries (>1 second)
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1
```

#### `database_errors_total` (Counter)
Total number of database errors.

**Labels**: `operation`

**Use Cases**:
- Track database health
- Identify connection issues
- Monitor query failures

---

### 5. Error Metrics

Track application errors.

#### `errors_total` (Counter)
Total number of errors by type and route.

**Labels**:
- `type`: Error type (validation, database, authentication, etc.)
- `route`: Route where error occurred

**Example**:
```
errors_total{type="validation",route="/api/metrics"} 12
errors_total{type="database",route="/api/metrics/:id"} 3
errors_total{type="authentication",route="/api/auth/login"} 45
```

**PromQL Examples**:
```promql
# Error rate across all endpoints
sum(rate(errors_total[5m]))

# Top 5 routes with most errors
topk(5, sum by (route) (rate(errors_total[5m])))

# Errors by type
sum by (type) (rate(errors_total[5m]))
```

---

### 6. System Metrics

Default Node.js metrics with `mdl_` prefix.

#### Process Metrics
- `mdl_process_cpu_user_seconds_total`: User CPU time
- `mdl_process_cpu_system_seconds_total`: System CPU time
- `mdl_process_cpu_seconds_total`: Total CPU time
- `mdl_process_start_time_seconds`: Process start time
- `mdl_process_resident_memory_bytes`: Resident memory size

#### Event Loop Metrics
- `mdl_nodejs_eventloop_lag_seconds`: Current event loop lag
- `mdl_nodejs_eventloop_lag_min_seconds`: Minimum event loop lag
- `mdl_nodejs_eventloop_lag_max_seconds`: Maximum event loop lag
- `mdl_nodejs_eventloop_lag_mean_seconds`: Mean event loop lag
- `mdl_nodejs_eventloop_lag_stddev_seconds`: Event loop lag std deviation
- `mdl_nodejs_eventloop_lag_p50_seconds`: P50 event loop lag
- `mdl_nodejs_eventloop_lag_p90_seconds`: P90 event loop lag
- `mdl_nodejs_eventloop_lag_p99_seconds`: P99 event loop lag

**Alert**: Fire alert if event loop lag p99 > 100ms

#### Garbage Collection Metrics
- `mdl_nodejs_gc_duration_seconds`: GC duration by GC kind

#### Heap Metrics
- `mdl_nodejs_heap_size_total_bytes`: Total heap size
- `mdl_nodejs_heap_size_used_bytes`: Used heap size
- `mdl_nodejs_external_memory_bytes`: External memory usage

#### Version Info
- `mdl_nodejs_version_info`: Node.js version information

---

## Alert Rules

See `monitoring/alerts.yml` for pre-configured alert rules:

### Critical Alerts
- **HighErrorRate**: Error rate >5% for 5 minutes
- **APIInstanceDown**: Instance down for 1 minute
- **DatabasePoolExhaustion**: Connection pool >80% for 5 minutes

### Warning Alerts
- **SlowResponseTimes**: P95 latency >1s for 5 minutes
- **HighRequestRate**: Request rate >100 req/s for 5 minutes
- **LowCacheHitRate**: Cache hit rate <50% for 10 minutes
- **HighMemoryUsage**: Memory usage >80% for 5 minutes
- **DiskSpaceLow**: Disk space <10% remaining for 5 minutes

### Info Alerts
- **NoMetricsCreated**: No metrics created in last hour
- **UnusualDomainActivity**: Domain creation rate spike

---

## Useful PromQL Queries

### Request Rate
```promql
# Requests per second
sum(rate(http_requests_total[5m]))

# Requests per second by route
sum by (route) (rate(http_requests_total[5m]))

# Requests per second by status code
sum by (status) (rate(http_requests_total[5m]))
```

### Latency
```promql
# P50 latency
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Average latency
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### Error Rate
```promql
# Overall error rate percentage
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100

# 4xx vs 5xx errors
sum by (status) (rate(http_requests_total{status=~"[45].."}[5m]))
```

### Cache Performance
```promql
# Hit rate percentage
(
  rate(cache_hits_total[5m])
  /
  (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
) * 100

# Cache operations per second
sum(rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# P95 cache operation latency
histogram_quantile(0.95, rate(cache_operation_duration_seconds_bucket[5m]))
```

### Business Metrics
```promql
# Total metrics in system
sum(metrics_total)

# Metrics creation rate per hour
sum(rate(metrics_created_total[1h])) * 3600

# Top 5 metric categories
topk(5, metrics_total)

# Category distribution percentage
(metrics_total / ignoring(category) group_left sum(metrics_total)) * 100
```

### Database Performance
```promql
# Connection pool usage percentage
(database_pool_active_connections / database_pool_max_connections) * 100

# P95 query latency
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))

# Database error rate
rate(database_errors_total[5m])
```

### System Health
```promql
# CPU usage percentage (approximate)
rate(mdl_process_cpu_seconds_total[5m]) * 100

# Memory usage
mdl_process_resident_memory_bytes / 1024 / 1024  # In MB

# Event loop lag P99 (ms)
mdl_nodejs_eventloop_lag_p99_seconds * 1000
```

---

## Testing Metrics

### 1. View All Metrics
```bash
curl http://localhost:3000/metrics
```

### 2. Check Specific Metric
```bash
curl -s http://localhost:3000/metrics | grep http_requests_total
```

### 3. Generate Some Traffic
```bash
# Create requests
for i in {1..100}; do
  curl -s http://localhost:3000/api/metrics > /dev/null
done

# Check metrics
curl -s http://localhost:3000/metrics | grep http_requests_total
```

### 4. Test in Prometheus
1. Start Prometheus: `docker compose -f docker-compose.monitoring.yml up -d`
2. Open: http://localhost:9090
3. Run query: `rate(http_requests_total[5m])`

---

## Integration with Monitoring Stack

### Prometheus Scrape Config
Already configured in `monitoring/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'mdl-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3000']
```

### Grafana Dashboards
Create dashboards using these metrics (Task 4).

### Alertmanager
Alerts defined in `monitoring/alerts.yml` will automatically fire based on these metrics.

---

## Best Practices

### 1. Metric Naming
- Use lowercase with underscores
- Follow Prometheus naming conventions:
  - Counters: `*_total` suffix
  - Gauges: No suffix
  - Histograms: `*_seconds` or `*_bytes` suffix

### 2. Label Cardinality
- Keep label values bounded (don't use IDs as labels)
- Use route patterns instead of actual paths: `/api/metrics/:id` not `/api/metrics/123`
- Limit number of unique label combinations

### 3. Histogram Buckets
- Choose buckets based on expected distribution
- Cover multiple orders of magnitude
- Include +Inf bucket (automatic)

### 4. Collection Frequency
- HTTP metrics: Real-time (per request)
- Business metrics: 60 seconds (configurable in BusinessMetricsCollector)
- System metrics: 15 seconds (Prometheus default)

---

## Troubleshooting

### Metrics Not Appearing
1. Check server is running: `curl http://localhost:3000/health`
2. Check metrics endpoint: `curl http://localhost:3000/metrics`
3. Check Prometheus targets: http://localhost:9090/targets
4. Check Prometheus logs: `docker compose -f docker-compose.monitoring.yml logs prometheus`

### High Cardinality Issues
- Review label usage in MetricsService
- Ensure route patterns are normalized
- Check for unbounded label values

### Missing Business Metrics
- Verify BusinessMetricsCollector is running
- Check server logs for collection errors
- Verify store supports required methods

---

## References

- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Metric Types](https://prometheus.io/docs/concepts/metric_types/)
