# Grafana Dashboards Guide

## Overview

This guide covers the Grafana dashboards created for MDL API monitoring. These dashboards provide comprehensive visibility into application performance, business metrics, and infrastructure health.

**Available Dashboards:**
1. **MDL API - Overview**: HTTP requests, latency, errors, cache, database
2. **MDL - Business Metrics**: Metrics, domains, objectives creation and growth
3. **MDL - Infrastructure**: CPU, memory, event loop, garbage collection, system metrics

---

## Dashboard: MDL API - Overview

**Purpose:** Monitor API performance, request patterns, and operational health

**URL:** http://localhost:3001/d/mdl-api-overview

### Panels

#### 1. Request Rate (req/s)
- **Metric:** `rate(mdl_http_requests_total[5m])`
- **Type:** Graph
- **Shows:** Requests per second by method and route
- **Use:** Identify traffic patterns and peak usage times

#### 2. Request Duration P95 (seconds)
- **Metrics:** 
  - P95: `histogram_quantile(0.95, rate(mdl_http_request_duration_seconds_bucket[5m]))`
  - P50: `histogram_quantile(0.50, rate(mdl_http_request_duration_seconds_bucket[5m]))`
- **Type:** Graph
- **Shows:** Response time percentiles
- **Alert:** Triggers if P95 > 1s for 5 minutes

#### 3. Error Rate (%)
- **Metrics:**
  - 5xx: `(rate(mdl_http_requests_total{status=~"5.."}[5m]) / rate(mdl_http_requests_total[5m])) * 100`
  - 4xx: `(rate(mdl_http_requests_total{status=~"4.."}[5m]) / rate(mdl_http_requests_total[5m])) * 100`
- **Type:** Graph
- **Alert:** Triggers if error rate > 5%

#### 4. Request Success Rate
- **Metric:** `(rate(mdl_http_requests_total{status=~"2.."}[5m]) / rate(mdl_http_requests_total[5m])) * 100`
- **Type:** Stat
- **Thresholds:**
  - Red: < 95%
  - Yellow: 95-99%
  - Green: > 99%

#### 5. Cache Hit Rate
- **Metric:** `(sum(rate(mdl_cache_hits_total[5m])) / (sum(rate(mdl_cache_hits_total[5m])) + sum(rate(mdl_cache_misses_total[5m])))) * 100`
- **Type:** Stat
- **Thresholds:**
  - Red: < 50%
  - Yellow: 50-80%
  - Green: > 80%

#### 6. Database Pool Connections
- **Metrics:**
  - Active: `mdl_db_pool_active_connections`
  - Max: `mdl_db_pool_max_connections`
- **Type:** Graph
- **Shows:** Current vs maximum database connections

#### 7. Database Query Duration P95
- **Metric:** `histogram_quantile(0.95, rate(mdl_db_query_duration_seconds_bucket[5m]))`
- **Type:** Graph
- **Shows:** Database query latency by operation

#### 8. Memory Usage
- **Metrics:**
  - Resident: `process_resident_memory_bytes{job="mdl-api"}`
  - Heap Used: `nodejs_heap_size_used_bytes{job="mdl-api"}`
  - Heap Total: `nodejs_heap_size_total_bytes{job="mdl-api"}`
- **Type:** Graph
- **Shows:** Node.js memory consumption

#### 9. Event Loop Lag
- **Metric:** `rate(nodejs_eventloop_lag_seconds{job="mdl-api"}[5m])`
- **Type:** Graph
- **Shows:** Event loop blocking
- **Alert:** Triggers if lag > 100ms

#### 10. Top Routes by Request Count
- **Metric:** `topk(10, sum by (method, route) (rate(mdl_http_requests_total[5m])))`
- **Type:** Table
- **Shows:** Most frequently accessed endpoints

### Annotations

**Alerts:** Shows when Prometheus alerts are firing
- Red markers indicate active alerts
- Hover to see alert details

### Use Cases

**Performance Monitoring:**
```
1. Check Request Duration P95
2. If high (>1s), check:
   - Database Query Duration
   - Cache Hit Rate
   - Event Loop Lag
3. Correlate with Request Rate for load analysis
```

**Error Investigation:**
```
1. Check Error Rate panel
2. Filter by time range when errors occurred
3. View Top Routes to identify problematic endpoints
4. Check Jaeger traces for detailed error context
```

**Capacity Planning:**
```
1. Monitor Request Rate trends
2. Check Database Pool Connections usage
3. Review Memory Usage growth
4. Plan scaling based on patterns
```

---

## Dashboard: MDL - Business Metrics

**Purpose:** Track business KPIs and metric creation activity

**URL:** http://localhost:3001/d/mdl-business-metrics

### Panels

#### 1. Total Metrics
- **Metric:** `mdl_metrics_total`
- **Type:** Stat (large number)
- **Shows:** Current total metric count
- **Thresholds:**
  - Blue: 0-100
  - Green: 100-1000
  - Yellow: > 1000

#### 2. Metrics by Category
- **Metric:** `mdl_metrics_total`
- **Type:** Pie Chart
- **Shows:** Distribution of metrics across categories
- **Legend:** Shows count and percentage per category

#### 3. Metrics Created Over Time
- **Metric:** `rate(mdl_metrics_created_total[1h])`
- **Type:** Graph
- **Shows:** Metric creation rate per category
- **Time Range:** Last 6 hours

#### 4. Metrics Creation Rate (24h trend)
- **Metric:** `sum(increase(mdl_metrics_created_total[1h]))`
- **Type:** Graph
- **Shows:** Hourly metric creation trend

#### 5. Total Domains
- **Metric:** `mdl_domains_total`
- **Type:** Stat
- **Shows:** Current domain count

#### 6. Total Objectives
- **Metric:** `mdl_objectives_total`
- **Type:** Stat
- **Shows:** Current objective count

#### 7. Domains & Objectives Growth
- **Metrics:**
  - `mdl_domains_total`
  - `mdl_objectives_total`
- **Type:** Graph
- **Shows:** Growth over time

#### 8. Metrics by Category (Detailed)
- **Metric:** `mdl_metrics_total`
- **Type:** Table
- **Columns:** Category, Count
- **Shows:** Detailed breakdown

#### 9. Domains Created Over Time
- **Metric:** `rate(mdl_domains_created_total[1h])`
- **Type:** Graph
- **Shows:** Domain creation rate

#### 10. Objectives Created Over Time
- **Metric:** `rate(mdl_objectives_created_total[1h])`
- **Type:** Graph
- **Shows:** Objective creation rate

### Variables

**Category Filter:**
- Select specific categories to filter views
- Multi-select supported
- "All" option available

### Use Cases

**Business Reporting:**
```
1. Total Metrics for executive summary
2. Metrics by Category for portfolio view
3. Creation trends for activity reporting
```

**Activity Monitoring:**
```
1. Check Metrics Created Over Time
2. Identify unusual spikes or drops
3. Correlate with user activity or events
```

**Planning:**
```
1. Review 24h trends
2. Project future growth
3. Plan capacity accordingly
```

---

## Dashboard: MDL - Infrastructure & System Metrics

**Purpose:** Monitor system health, resource usage, and Node.js runtime

**URL:** http://localhost:3001/d/mdl-infrastructure

### Panels

#### 1. CPU Usage
- **Metrics:**
  - User: `rate(process_cpu_user_seconds_total{job="mdl-api"}[5m])`
  - System: `rate(process_cpu_system_seconds_total{job="mdl-api"}[5m])`
- **Type:** Graph
- **Shows:** Node.js process CPU consumption

#### 2. Memory Usage
- **Metrics:**
  - Resident: `process_resident_memory_bytes{job="mdl-api"}`
  - Heap Used: `nodejs_heap_size_used_bytes{job="mdl-api"}`
  - Heap Total: `nodejs_heap_size_total_bytes{job="mdl-api"}`
  - External: `nodejs_external_memory_bytes{job="mdl-api"}`
- **Type:** Graph
- **Shows:** Memory breakdown

#### 3. Event Loop Lag
- **Metrics:**
  - Current: `nodejs_eventloop_lag_seconds{job="mdl-api"}`
  - Mean: `nodejs_eventloop_lag_mean_seconds{job="mdl-api"}`
  - P99: `nodejs_eventloop_lag_p99_seconds{job="mdl-api"}`
- **Type:** Graph
- **Alert:** P99 > 100ms

#### 4. Garbage Collection
- **Metrics:**
  - Count: `rate(nodejs_gc_duration_seconds_count{job="mdl-api"}[5m])`
  - Duration: `rate(nodejs_gc_duration_seconds_sum{job="mdl-api"}[5m])`
- **Type:** Graph
- **Shows:** GC frequency and duration by type

#### 5. Active Handles & Requests
- **Metrics:**
  - Handles: `nodejs_active_handles_total{job="mdl-api"}`
  - Requests: `nodejs_active_requests_total{job="mdl-api"}`
- **Type:** Graph
- **Shows:** Node.js active resources

#### 6. Node.js Version Info
- **Metric:** `nodejs_version_info{job="mdl-api"}`
- **Type:** Graph
- **Shows:** Runtime version

#### 7. System CPU (Node Exporter)
- **Metric:** `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
- **Type:** Graph
- **Shows:** Overall system CPU usage

#### 8. System Memory (Node Exporter)
- **Metrics:**
  - Used: `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes`
  - Available: `node_memory_MemAvailable_bytes`
- **Type:** Graph
- **Shows:** System-wide memory

#### 9. Disk Usage (Node Exporter)
- **Metric:** `100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)`
- **Type:** Graph
- **Alert:** > 90% usage

#### 10. Network Traffic (Node Exporter)
- **Metrics:**
  - Receive: `rate(node_network_receive_bytes_total[5m])`
  - Transmit: `rate(node_network_transmit_bytes_total[5m])`
- **Type:** Graph
- **Shows:** Network I/O

### Variables

**Instance:** Select specific MDL API instance to monitor

### Use Cases

**Performance Troubleshooting:**
```
1. Check Event Loop Lag
2. If high, check CPU and GC
3. Review Active Handles for resource leaks
```

**Memory Leak Detection:**
```
1. Monitor Memory Usage over time
2. Look for steady increase
3. Check GC frequency and effectiveness
4. Review Heap Used vs Heap Total ratio
```

**Capacity Planning:**
```
1. Review System CPU trends
2. Check System Memory usage
3. Monitor Disk Usage growth
4. Plan infrastructure scaling
```

---

## Dashboard Management

### Importing Dashboards

**Method 1: Auto-Provisioning (Recommended)**

Dashboards are automatically loaded on Grafana startup via provisioning:

```yaml
# monitoring/grafana/provisioning/dashboards/default.yml
apiVersion: 1
providers:
  - name: 'MDL Dashboards'
    folder: ''
    type: file
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

**Method 2: Manual Import**

1. Open Grafana UI (http://localhost:3001)
2. Click "+" → "Import"
3. Upload JSON file or paste JSON content
4. Select "Prometheus" as datasource
5. Click "Import"

### Exporting Dashboards

**From UI:**
```
1. Open dashboard
2. Click "Share" (top right)
3. Select "Export"
4. Choose "Export for sharing externally"
5. Click "Save to file"
```

**From API:**
```bash
# Get dashboard JSON
curl -H "Authorization: Bearer <api-key>" \
  http://localhost:3001/api/dashboards/uid/mdl-api-overview
```

### Updating Dashboards

**Option 1: Edit in UI**
- Make changes in Grafana
- Export updated JSON
- Replace file in `monitoring/grafana/dashboards/`
- Set `"overwrite": true` in JSON

**Option 2: Edit JSON Directly**
- Modify dashboard JSON file
- Restart Grafana or wait for auto-reload
- Changes appear within 30 seconds

### Dashboard Versioning

Grafana automatically versions dashboards:
- View history: Dashboard Settings → Versions
- Restore previous version if needed
- Compare versions side-by-side

---

## Best Practices

### Dashboard Organization

**Folder Structure:**
```
monitoring/grafana/dashboards/
├── mdl-api-overview.json         # Main operational dashboard
├── mdl-business-metrics.json     # Business KPIs
└── mdl-infrastructure.json       # System metrics
```

**Naming Convention:**
- Prefix: `mdl-` for all MDL dashboards
- Use descriptive, kebab-case names
- Include purpose in title

### Panel Design

**Do:**
- ✅ Use descriptive titles
- ✅ Add units to axes (seconds, bytes, percent)
- ✅ Set appropriate thresholds
- ✅ Use consistent colors across dashboards
- ✅ Add helpful descriptions

**Don't:**
- ❌ Overload with too many panels (max 10-12)
- ❌ Use overly complex queries
- ❌ Set unrealistic thresholds
- ❌ Forget to test queries

### Performance Optimization

**Query Optimization:**
```promql
# Good: Aggregate first
sum(rate(metric[5m])) by (label)

# Bad: Rate after aggregation
rate(sum(metric)[5m])

# Good: Use recording rules for complex queries
# Bad: Repeat same complex query in multiple panels
```

**Refresh Rates:**
- Overview dashboards: 30s
- Business metrics: 1m
- Infrastructure: 30s
- Development: 5s (temporary)

**Time Ranges:**
- Default: Last 1 hour
- Business metrics: Last 6 hours
- Long-term trends: Last 24 hours

---

## Alerting from Dashboards

### Dashboard Alerts

Some panels include Grafana alerts:

**Alert Example: High Error Rate**
```json
{
  "alert": {
    "conditions": [
      {
        "evaluator": {
          "params": [5],
          "type": "gt"
        },
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "type": "avg"
        },
        "type": "query"
      }
    ],
    "frequency": "1m",
    "handler": 1,
    "name": "Error Rate alert"
  }
}
```

**Alert States:**
- 🟢 **OK**: Metric within threshold
- 🟡 **Pending**: Condition met, waiting for "for" duration
- 🔴 **Alerting**: Alert firing
- ⚪ **No Data**: Metric not available

### Alert Notification

Alerts from Grafana are separate from Prometheus/Alertmanager alerts.

**Configure Notification Channels:**
1. Configuration → Notification channels
2. Add channel (Email, Slack, PagerDuty)
3. Test notification
4. Assign to dashboard alerts

---

## Troubleshooting

### Dashboard Not Loading

**Check Prometheus Connection:**
```bash
# Test datasource
curl http://localhost:3001/api/datasources/proxy/1/api/v1/query?query=up

# Check Grafana logs
docker logs mdl-grafana
```

**Verify Metrics Exist:**
```bash
# Check metrics in Prometheus
curl http://localhost:9090/api/v1/query?query=mdl_http_requests_total
```

### No Data in Panels

**Troubleshooting Steps:**
1. Check metric name matches (case-sensitive)
2. Verify time range includes data
3. Check label selectors (job, instance)
4. Test query in Prometheus directly
5. Verify MDL API is running and serving /metrics

### Slow Dashboard Performance

**Optimization:**
1. Reduce time range
2. Increase refresh interval
3. Simplify complex queries
4. Use recording rules
5. Limit number of time series

### Panel Shows "N/A"

**Causes:**
- Metric doesn't exist yet
- Time range too recent (data not scraped)
- Query returns no results
- Incorrect label filtering

**Solutions:**
```promql
# Add default value
metric_name or 0

# Check if metric exists
count(metric_name)

# Use label_replace for missing labels
label_replace(metric, "missing_label", "default", "", "")
```

---

## Advanced Features

### Variables and Templating

**Using Variables:**
```promql
# Query with variable
rate(mdl_http_requests_total{route=~"$route"}[5m])
```

**Variable Types:**
- **Query:** Dynamic from Prometheus
- **Custom:** Static list
- **Interval:** Time range dependent
- **Datasource:** Select different sources

### Annotations

**Add Deployment Markers:**
```json
{
  "datasource": "Prometheus",
  "enable": true,
  "expr": "deployment_event",
  "iconColor": "blue",
  "name": "Deployments"
}
```

### Links Between Dashboards

**Add Dashboard Links:**
```json
{
  "links": [
    {
      "title": "View Traces",
      "url": "http://localhost:16686/search?service=mdl-api"
    },
    {
      "title": "Business Metrics",
      "url": "/d/mdl-business-metrics"
    }
  ]
}
```

---

## Next Steps

**Task 5: Log Aggregation** (Optional)
- Add Loki for log aggregation
- Configure Promtail to scrape MDL logs
- Add Loki datasource to Grafana
- Create log dashboard with trace correlation
- Query logs with LogQL

**Task 6: Operational Runbooks**
- Document common scenarios
- Link runbooks from alerts
- Create troubleshooting guides
- Train team on dashboard usage

---

## References

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Created:** November 23, 2025  
**Version:** 1.0.0  
**Status:** Complete
