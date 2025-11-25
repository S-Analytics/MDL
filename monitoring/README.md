# MDL Monitoring Stack

This directory contains the monitoring infrastructure for the MDL API using Prometheus, Grafana, and Alertmanager.

## Architecture

```
┌─────────────────┐
│   MDL API       │
│  (prom-client)  │───┐
│  Port 3000      │   │ Scrapes /metrics
└─────────────────┘   │ every 15s
                      ▼
┌─────────────────────────────────────┐
│          Prometheus                 │
│  - Metrics storage (TSDB)          │
│  - PromQL query engine             │
│  - Alert evaluation                │
│  - Port 9090                       │
└────────┬─────────────────┬──────────┘
         │                 │
         │ Queries         │ Alerts
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    Grafana      │  │  Alertmanager   │
│  - Dashboards   │  │  - Routing      │
│  - Visualization│  │  - Notification │
│  - Port 3001    │  │  - Port 9093    │
└─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Node Exporter  │
│  - System stats │
│  - Port 9100    │
└─────────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# From the MDL root directory
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Verify Services

```bash
# Check all services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check Prometheus health
curl http://localhost:9090/-/healthy

# Check Grafana health
curl http://localhost:3001/api/health

# Check Alertmanager health
curl http://localhost:9093/-/healthy
```

### 3. Access UIs

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093
- **Jaeger**: http://localhost:16686
- **Node Exporter**: http://localhost:9100/metrics

### 4. Start MDL API with Metrics

```bash
# Install prom-client (after Task 1.3 is complete)
npm install prom-client

# Start API
npm run dev
```

### 5. View Metrics

- **MDL API Metrics**: http://localhost:3000/metrics
- **System Metrics**: http://localhost:9100/metrics

## Configuration Files

### prometheus.yml
- **Location**: `monitoring/prometheus.yml`
- **Purpose**: Prometheus scrape configuration
- **Key Settings**:
  - `scrape_interval: 15s` - How often to scrape metrics
  - `evaluation_interval: 15s` - How often to evaluate alerts
  - **Scrape Jobs**:
    - `mdl-api` - Application metrics from `/metrics`
    - `node-exporter` - System metrics
    - `prometheus` - Self-monitoring

### alerts.yml
- **Location**: `monitoring/alerts.yml`
- **Purpose**: Alert rule definitions
- **Alert Groups**:
  - `mdl_api_alerts` - API-level alerts (errors, latency, availability)
  - `mdl_business_alerts` - Business logic alerts (metrics created, domain activity)

**Key Alerts**:
- `HighErrorRate` - >5% error rate for 5 minutes
- `SlowResponseTimes` - P95 latency >1s for 5 minutes
- `APIInstanceDown` - Instance unreachable for 1 minute
- `LowCacheHitRate` - Cache hit rate <50% for 10 minutes
- `DatabasePoolExhaustion` - >80% pool usage for 5 minutes

### alertmanager.yml
- **Location**: `monitoring/alertmanager.yml`
- **Purpose**: Alert routing and notification configuration
- **Receivers**:
  - `critical-receiver` - Immediate notifications (0s delay)
  - `warning-receiver` - Grouped notifications (30s delay)
  - `info-receiver` - Low-priority notifications (5m delay)

**To Configure Notifications**:
1. Uncomment desired receiver (email, Slack, PagerDuty)
2. Add credentials/webhook URLs
3. Restart Alertmanager: `docker-compose -f docker-compose.monitoring.yml restart alertmanager`

## Grafana Setup

### Default Credentials
- **Username**: `admin`
- **Password**: `admin` (change on first login)

### Pre-configured Components
- **Datasource**: Prometheus (auto-provisioned)
- **Dashboard Location**: `monitoring/grafana/dashboards/`

### Creating Dashboards (Task 4)
1. Log into Grafana at http://localhost:3001
2. Navigate to Dashboards → New → Import
3. Add dashboards to `monitoring/grafana/dashboards/`
4. They will auto-load on Grafana restart

**Planned Dashboards**:
- Application Dashboard (HTTP metrics, errors, latency)
- Business Metrics Dashboard (metrics/domains/objectives by category)
- Infrastructure Dashboard (CPU, memory, disk, network)

## Metrics Exposed by MDL API

After Task 1.3 implementation, the following metrics will be available:

### HTTP Metrics
- `http_requests_total` - Counter of all HTTP requests by method, route, status
- `http_request_duration_seconds` - Histogram of request durations
- `http_response_size_bytes` - Summary of response sizes

### Business Metrics
- `metrics_total` - Gauge of total metrics by category
- `metrics_created_total` - Counter of metrics created
- `domains_total` - Gauge of total domains
- `domains_created_total` - Counter of domains created
- `objectives_total` - Gauge of total objectives

### Cache Metrics (if Redis enabled)
- `cache_hits_total` - Counter of cache hits
- `cache_misses_total` - Counter of cache misses
- `cache_size_bytes` - Gauge of cache memory usage

### Database Metrics
- `database_pool_active_connections` - Active DB connections
- `database_pool_max_connections` - Max DB connections
- `database_query_duration_seconds` - Histogram of query durations

## Useful Prometheus Queries

```promql
# Request rate by endpoint
rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# Cache hit rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Top 5 slowest endpoints
topk(5, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

## Maintenance

### View Logs
```bash
# All services
docker-compose -f docker-compose.monitoring.yml logs -f

# Specific service
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f alertmanager
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.monitoring.yml restart

# Specific service
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Stop Services
```bash
docker-compose -f docker-compose.monitoring.yml down
```

### Clean Up Data (WARNING: Deletes all metrics)
```bash
docker-compose -f docker-compose.monitoring.yml down -v
```

## Data Retention

- **Prometheus**: 15 days (configurable in `docker-compose.monitoring.yml`)
- **Grafana**: Persistent (stored in `grafana_data` volume)
- **Alertmanager**: 120 hours for resolved alerts

## Security Considerations

### Production Recommendations
1. **Change Default Passwords**:
   ```bash
   # Grafana admin password
   docker-compose -f docker-compose.monitoring.yml exec grafana grafana-cli admin reset-admin-password <new-password>
   ```

2. **Secure /metrics Endpoint**:
   - Add basic auth to `/metrics` endpoint in MDL API
   - Update `prometheus.yml` with credentials

3. **Use TLS**:
   - Configure TLS for Prometheus, Grafana, Alertmanager
   - Use reverse proxy (nginx) with SSL certificates

4. **Network Isolation**:
   - Use Docker networks to isolate monitoring stack
   - Only expose necessary ports

5. **Alert Notification Security**:
   - Use encrypted connections for email (TLS)
   - Secure Slack/PagerDuty webhook URLs
   - Store credentials in environment variables or secrets

## Troubleshooting

### Prometheus Can't Scrape MDL API
```bash
# Check if MDL API is reachable from container
docker-compose -f docker-compose.monitoring.yml exec prometheus wget -O- http://host.docker.internal:3000/metrics

# Check Prometheus targets page
# Open http://localhost:9090/targets
```

### Grafana Can't Connect to Prometheus
```bash
# Check if Prometheus is reachable from Grafana
docker-compose -f docker-compose.monitoring.yml exec grafana wget -O- http://prometheus:9090/api/v1/status/config
```

### Alerts Not Firing
```bash
# Check alert rules are loaded
curl http://localhost:9090/api/v1/rules

# Check alert status
# Open http://localhost:9090/alerts
```

### Notifications Not Received
```bash
# Check Alertmanager logs
docker-compose -f docker-compose.monitoring.yml logs alertmanager

# Test Alertmanager config
docker-compose -f docker-compose.monitoring.yml exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

## Alerting

**See [ALERTING_GUIDE.md](./ALERTING_GUIDE.md) for complete alerting documentation.**

Quick alert testing:
```bash
# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {"alertname": "TestAlert", "severity": "warning"},
    "annotations": {
      "summary": "Test alert",
      "description": "Testing notification delivery"
    }
  }]'

# Check alert status
curl http://localhost:9090/api/v1/alerts
```

## Operational Runbooks

**See [runbooks/README.md](./runbooks/README.md) for complete runbook documentation.**

Comprehensive runbooks for responding to all alerts:

### Critical Severity
- [HighErrorRate](./runbooks/high-error-rate.md) - API experiencing elevated error rates (>5%)
- [APIInstanceDown](./runbooks/api-instance-down.md) - API service is not responding
- [DatabasePoolExhaustion](./runbooks/database-pool-exhaustion.md) - Database connection pool nearly full

### Warning Severity
- [SlowResponseTimes](./runbooks/slow-response-times.md) - API response times degraded (P95 >1s)
- [HighRequestRate](./runbooks/high-request-rate.md) - Unusual traffic spike (>100 req/s)
- [LowCacheHitRate](./runbooks/low-cache-hit-rate.md) - Cache effectiveness degraded (<50%)
- [HighMemoryUsage](./runbooks/high-memory-usage.md) - Memory consumption elevated (>80%)
- [DiskSpaceLow](./runbooks/disk-space-low.md) - Disk space running low (<10%)

### Info Severity
- [NoMetricsCreated](./runbooks/no-metrics-created.md) - No business activity detected
- [UnusualDomainActivity](./runbooks/unusual-domain-activity.md) - Abnormal domain creation pattern

Quick access:
```bash
# View runbooks
open monitoring/runbooks/README.md

# During incident, follow specific runbook
open monitoring/runbooks/high-error-rate.md
```

## Grafana Dashboards

**See [DASHBOARDS_GUIDE.md](./DASHBOARDS_GUIDE.md) for complete dashboard documentation.**

**Available Dashboards:**
- **MDL API - Overview** (`mdl-api-overview`): HTTP requests, latency, errors, cache, database
- **MDL - Business Metrics** (`mdl-business-metrics`): Metrics, domains, objectives
- **MDL - Infrastructure** (`mdl-infrastructure`): CPU, memory, event loop, system metrics

Quick access:
```bash
# Open Grafana
open http://localhost:3001

# Login: admin/admin

# Navigate to dashboards:
# - Home → Dashboards → MDL API - Overview
# - Home → Dashboards → MDL - Business Metrics  
# - Home → Dashboards → MDL - Infrastructure
```

## Distributed Tracing

**See [TRACING_GUIDE.md](./TRACING_GUIDE.md) for complete tracing documentation.**

Quick tracing setup:
```bash
# Start Jaeger
docker compose -f docker-compose.monitoring.yml up jaeger -d

# View Jaeger UI
open http://localhost:16686

# Make requests to generate traces
curl http://localhost:3000/api/v1/metrics

# View traces in Jaeger
# Service: mdl-api → Find Traces
```

## Phase 2D Status

### ✅ All Core Tasks Complete!

1. ✅ **Task 1**: APM Infrastructure (COMPLETE)
   - ✅ Prometheus + Grafana + Alertmanager + Node Exporter deployed
   - ✅ prom-client instrumentation
   - ✅ Metrics service with 20+ metrics
   - ✅ /metrics endpoint exposed

2. ✅ **Task 2**: Alerting Configuration (COMPLETE)
   - ✅ 10 alert rules defined (Critical, Warning, Info)
   - ✅ Alertmanager routing configured
   - ✅ Notification templates documented
   - ✅ Comprehensive alerting guide created

3. ✅ **Task 3**: Distributed Tracing (COMPLETE)
   - ✅ OpenTelemetry SDK with Jaeger
   - ✅ Auto-instrumentation (HTTP, Express, PostgreSQL)
   - ✅ Custom spans (Storage, Cache)
   - ✅ Comprehensive tracing guide

4. ✅ **Task 4**: Grafana Dashboards (COMPLETE)
   - ✅ MDL API Overview dashboard (10 panels)
   - ✅ Business Metrics dashboard (10 panels)
   - ✅ Infrastructure dashboard (10 panels)
   - ✅ Comprehensive dashboard guide

5. ✅ **Task 6**: Operational Runbooks (COMPLETE)
   - ✅ 10 comprehensive runbooks (3 critical, 5 warning, 2 info)
   - ✅ Diagnosis procedures with commands
   - ✅ Step-by-step resolution procedures
   - ✅ Escalation paths (L1 → L2 → L3)
   - ✅ Prevention strategies
   - ✅ Incident response framework

### 🔵 Optional Enhancement

6. **Task 5**: Log Aggregation (Optional)
   - Add Loki and Promtail to monitoring stack
   - Configure log scraping from application logs
   - Create log dashboard in Grafana
   - Correlate logs with traces via trace IDs
   - Optional: Can be added later if centralized logging needed

---

## 🎉 Phase 2D Complete!

**The MDL API now has production-grade observability:**
- ✅ Comprehensive metrics collection (20+ metrics)
- ✅ Real-time alerting with 10 alert rules
- ✅ Distributed tracing with OpenTelemetry & Jaeger
- ✅ Visual dashboards with 30+ panels
- ✅ Operational runbooks for all alerts
- ✅ Incident response framework

**Ready for production deployment! 🚀**
   - Document common scenarios
   - Create troubleshooting guides
   - Link runbooks from alerts

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
