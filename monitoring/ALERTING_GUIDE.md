# MDL Alerting Guide

## Overview

This guide covers the complete alerting setup for the MDL API, including alert rules, notification channels, testing procedures, and troubleshooting.

**Components**:
- **Prometheus**: Evaluates alert rules based on metrics
- **Alertmanager**: Routes and manages alert notifications
- **Notification Channels**: Slack, Email, PagerDuty, Webhooks

---

## Alert Rules

Alert rules are defined in `monitoring/alerts.yml` and automatically loaded by Prometheus.

### Critical Alerts (Immediate Response Required)

#### 1. HighErrorRate
**Condition**: Error rate >5% for 5 minutes
```yaml
expr: |
  (
    rate(http_requests_total{status=~"5.."}[5m]) 
    / 
    rate(http_requests_total[5m])
  ) > 0.05
for: 5m
```

**Impact**: Users experiencing service errors  
**Response Time**: <5 minutes  
**Severity**: Critical

**Action Items**:
1. Check application logs for error patterns
2. Verify database connectivity
3. Check external service dependencies
4. Review recent deployments
5. Escalate to on-call engineer if unresolved in 15 minutes

---

#### 2. APIInstanceDown
**Condition**: Instance unreachable for 1 minute
```yaml
expr: up{job="mdl-api"} == 0
for: 1m
```

**Impact**: Complete service outage  
**Response Time**: Immediate  
**Severity**: Critical

**Action Items**:
1. Check if process is running: `ps aux | grep ts-node`
2. Check application logs: `tail -f logs/app.log`
3. Verify port availability: `lsof -i :3000`
4. Restart service if needed: `npm run dev`
5. Check infrastructure (cloud provider status, VM health)

---

#### 3. DatabasePoolExhaustion
**Condition**: Connection pool >80% full for 5 minutes
```yaml
expr: database_pool_active_connections / database_pool_max_connections > 0.8
for: 5m
```

**Impact**: Slow responses, potential timeouts  
**Response Time**: <10 minutes  
**Severity**: Critical

**Action Items**:
1. Check for slow queries: Review database_query_duration metrics
2. Identify long-running transactions
3. Check for connection leaks in application code
4. Consider increasing pool size temporarily
5. Review and optimize slow queries

---

### Warning Alerts (Response Within 30 Minutes)

#### 4. SlowResponseTimes
**Condition**: P95 latency >1 second for 5 minutes
```yaml
expr: |
  histogram_quantile(0.95, 
    rate(http_request_duration_seconds_bucket[5m])
  ) > 1.0
for: 5m
```

**Impact**: Degraded user experience  
**Response Time**: <30 minutes  
**Severity**: Warning

**Action Items**:
1. Check cache hit rate
2. Review slow endpoints in metrics
3. Check database query performance
4. Verify no resource constraints (CPU, memory)
5. Review recent code changes

---

#### 5. HighRequestRate
**Condition**: Request rate >100 req/s for 5 minutes
```yaml
expr: rate(http_requests_total[5m]) > 100
for: 5m
```

**Impact**: Potential performance degradation  
**Response Time**: <30 minutes  
**Severity**: Warning

**Action Items**:
1. Verify if traffic is legitimate (not DDoS)
2. Check system resources (CPU, memory)
3. Review scaling policies
4. Monitor for performance degradation
5. Consider enabling rate limiting

---

#### 6. LowCacheHitRate
**Condition**: Cache hit rate <50% for 10 minutes
```yaml
expr: |
  (
    rate(cache_hits_total[5m]) 
    / 
    (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
  ) < 0.50
for: 10m
```

**Impact**: Increased database load, slower responses  
**Response Time**: <1 hour  
**Severity**: Warning

**Action Items**:
1. Verify Redis is running and healthy
2. Check cache configuration (TTL values)
3. Review cache warming schedule
4. Check for cache invalidation issues
5. Consider increasing cache TTL

---

#### 7. HighMemoryUsage
**Condition**: Memory usage >80% for 5 minutes
```yaml
expr: |
  (
    process_resident_memory_bytes 
    / 
    node_memory_MemTotal_bytes{job="node-exporter"}
  ) > 0.80
for: 5m
```

**Impact**: Risk of OOM crashes  
**Response Time**: <1 hour  
**Severity**: Warning

**Action Items**:
1. Check for memory leaks
2. Review recent code changes
3. Analyze heap dumps if available
4. Consider restarting service
5. Scale up instance if needed

---

#### 8. DiskSpaceLow
**Condition**: Disk space <10% remaining for 5 minutes
```yaml
expr: |
  (
    node_filesystem_avail_bytes{mountpoint="/",job="node-exporter"} 
    / 
    node_filesystem_size_bytes{mountpoint="/",job="node-exporter"}
  ) < 0.10
for: 5m
```

**Impact**: Risk of application crash, log loss  
**Response Time**: <2 hours  
**Severity**: Warning

**Action Items**:
1. Clean up old logs: `find logs/ -mtime +7 -delete`
2. Remove old Docker images: `docker system prune`
3. Check for large files: `du -sh /* | sort -h`
4. Increase disk size if needed
5. Review log rotation policies

---

### Info Alerts (FYI, No Immediate Action Required)

#### 9. NoMetricsCreated
**Condition**: No metrics created in last hour
```yaml
expr: rate(metrics_created_total[1h]) == 0
for: 1h
```

**Impact**: Possible reduced system usage  
**Response Time**: Best effort  
**Severity**: Info

**Action Items**:
1. Verify if this is expected (off-hours, maintenance)
2. Check if users are accessing the system
3. Review authentication logs
4. Monitor for continued pattern

---

#### 10. UnusualDomainActivity
**Condition**: Domain creation rate spike (>10 more than 24h ago)
```yaml
expr: |
  (
    rate(domains_created_total[1h]) 
    - 
    rate(domains_created_total[1h] offset 24h)
  ) > 10
for: 1h
```

**Impact**: Possible unusual activity  
**Response Time**: Best effort  
**Severity**: Info

**Action Items**:
1. Verify if legitimate bulk import occurred
2. Check for automated scripts
3. Review user activity logs
4. Monitor for continued pattern

---

## Notification Channels

### Slack Configuration

1. Create Slack Incoming Webhook:
   - Go to https://api.slack.com/apps
   - Create new app → "Incoming Webhooks"
   - Add to workspace and copy webhook URL

2. Update `monitoring/alertmanager.yml`:
```yaml
receivers:
  - name: 'critical-receiver'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#mdl-alerts-critical'
        username: 'MDL Alertmanager'
        title: '{{ .Status | toUpper }}: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Labels.alertname }}
          *Severity:* {{ .Labels.severity }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ end }}
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
```

3. Restart Alertmanager:
```bash
docker compose -f docker-compose.monitoring.yml restart alertmanager
```

4. Test notification:
```bash
# Send test alert to Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "critical"
    },
    "annotations": {
      "summary": "Test alert from MDL",
      "description": "This is a test alert to verify Slack integration"
    }
  }]'
```

---

### Email Configuration (SMTP)

1. Update `monitoring/alertmanager.yml` global section:
```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@mdl.example.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'  # Use app-specific password
  smtp_require_tls: true
```

2. Configure email receiver:
```yaml
receivers:
  - name: 'critical-receiver'
    email_configs:
      - to: 'oncall@mdl.example.com'
        headers:
          Subject: '[CRITICAL] MDL Alert: {{ .GroupLabels.alertname }}'
        html: |
          <h2>{{ .Status | toUpper }}: {{ .GroupLabels.alertname }}</h2>
          {{ range .Alerts }}
          <p><strong>Severity:</strong> {{ .Labels.severity }}</p>
          <p><strong>Summary:</strong> {{ .Annotations.summary }}</p>
          <p><strong>Description:</strong> {{ .Annotations.description }}</p>
          <hr>
          {{ end }}
        send_resolved: true
```

3. Gmail App Password Setup:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password for "Mail"
   - Use generated password in `smtp_auth_password`

---

### PagerDuty Configuration

1. Get Integration Key:
   - Go to PagerDuty → Services → Your Service
   - Add Integration → "Prometheus"
   - Copy Integration Key

2. Update `monitoring/alertmanager.yml`:
```yaml
receivers:
  - name: 'critical-receiver'
    pagerduty_configs:
      - service_key: 'YOUR_INTEGRATION_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
          severity: '{{ .GroupLabels.severity }}'
        send_resolved: true
```

3. Test PagerDuty integration using test alert (see Slack section)

---

### Webhook Configuration (Custom Integration)

```yaml
receivers:
  - name: 'webhook-receiver'
    webhook_configs:
      - url: 'http://your-webhook-endpoint.com/alerts'
        send_resolved: true
        http_config:
          basic_auth:
            username: 'webhook-user'
            password: 'webhook-password'
```

**Webhook Payload Example**:
```json
{
  "receiver": "webhook-receiver",
  "status": "firing",
  "alerts": [{
    "status": "firing",
    "labels": {
      "alertname": "HighErrorRate",
      "severity": "critical"
    },
    "annotations": {
      "summary": "High error rate detected (6.2%)",
      "description": "API is experiencing 6.2% error rate on instance mdl-api-1"
    },
    "startsAt": "2025-11-23T16:00:00Z",
    "endsAt": "0001-01-01T00:00:00Z"
  }]
}
```

---

## Alert Routing

Alertmanager routes alerts based on labels and matchers.

### Current Routing Configuration

```yaml
route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 0s
      repeat_interval: 5m
    
    # Warning alerts - grouped notification
    - match:
        severity: warning
      receiver: 'warning-receiver'
      group_wait: 30s
      repeat_interval: 1h
    
    # Info alerts - less frequent notifications
    - match:
        severity: info
      receiver: 'info-receiver'
      group_wait: 5m
      repeat_interval: 24h
```

**Parameters**:
- `group_by`: Group alerts by these labels
- `group_wait`: Wait time before sending first notification
- `group_interval`: Wait time before sending notification about new alerts in group
- `repeat_interval`: Wait time before re-sending notification

---

## Inhibition Rules

Inhibition rules suppress certain alerts when other alerts are firing.

### Current Inhibition Rules

```yaml
inhibit_rules:
  # Inhibit warning alerts if critical alert is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
  
  # Inhibit all alerts if API instance is down
  - source_match:
      alertname: 'APIInstanceDown'
    target_match_re:
      component: '.*'
    equal: ['instance']
```

**Example**: If `APIInstanceDown` is firing, it will suppress `HighErrorRate`, `SlowResponseTimes`, etc., since they're all symptoms of the same root cause.

---

## Testing Alerts

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker compose -f docker-compose.monitoring.yml up -d

# Verify all services are healthy
docker compose -f docker-compose.monitoring.yml ps

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### 2. Verify Alert Rules Loaded

```bash
# Check alert rules via API
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {alert: .name, state: .state}'

# Or open Prometheus UI
open http://localhost:9090/alerts
```

### 3. Manually Trigger Test Alert

**Method 1: Send Alert to Alertmanager**
```bash
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestHighErrorRate",
      "severity": "critical",
      "instance": "mdl-api-test"
    },
    "annotations": {
      "summary": "TEST: High error rate detected",
      "description": "This is a test alert - please verify notification delivery"
    },
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "endsAt": "'$(date -u -v+5M +%Y-%m-%dT%H:%M:%SZ)'"
  }]'
```

**Method 2: Generate Real Metrics to Trigger Alert**
```bash
# Generate high error rate by making requests to non-existent endpoint
for i in {1..100}; do
  curl -s http://localhost:3000/nonexistent > /dev/null &
done
wait

# Wait 5 minutes for alert to fire
# Check alert status
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname == "HighErrorRate")'
```

**Method 3: Lower Alert Threshold Temporarily**

Edit `monitoring/alerts.yml`:
```yaml
# Change from > 0.05 (5%) to > 0.01 (1%)
expr: |
  (
    rate(http_requests_total{status=~"5.."}[5m]) 
    / 
    rate(http_requests_total[5m])
  ) > 0.01  # Lower threshold for testing
for: 1m  # Shorter duration for testing
```

Reload Prometheus rules:
```bash
curl -X POST http://localhost:9090/-/reload
```

### 4. Verify Notification Delivery

**Check Alertmanager UI**:
- Open http://localhost:9093
- Go to "Alerts" tab
- Verify alert appears with correct labels
- Check "Silences" tab to ensure alert isn't silenced

**Check Alertmanager Logs**:
```bash
docker compose -f docker-compose.monitoring.yml logs alertmanager | grep -i "notification"
```

**Check Notification Channel**:
- Slack: Check configured channel for message
- Email: Check inbox for email
- PagerDuty: Check incidents page

---

## Silencing Alerts

### Silence via Web UI

1. Open Alertmanager UI: http://localhost:9093
2. Click "New Silence"
3. Fill in matchers (e.g., `alertname="HighErrorRate"`)
4. Set duration
5. Add comment explaining why
6. Click "Create"

### Silence via CLI

```bash
# Silence specific alert for 1 hour
amtool silence add \
  --alertmanager.url=http://localhost:9093 \
  --author="ops-team" \
  --comment="Planned maintenance" \
  --duration=1h \
  alertname="HighErrorRate"

# Silence all alerts for instance
amtool silence add \
  --alertmanager.url=http://localhost:9093 \
  --author="ops-team" \
  --comment="Server maintenance" \
  --duration=2h \
  instance="mdl-api-1"

# List active silences
amtool silence query --alertmanager.url=http://localhost:9093

# Expire silence
amtool silence expire --alertmanager.url=http://localhost:9093 <silence-id>
```

### Silence via API

```bash
# Create silence
curl -X POST http://localhost:9093/api/v1/silences \
  -H 'Content-Type: application/json' \
  -d '{
    "matchers": [{
      "name": "alertname",
      "value": "HighErrorRate",
      "isRegex": false
    }],
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "endsAt": "'$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ)'",
    "createdBy": "ops-team",
    "comment": "Investigating issue"
  }'
```

---

## Troubleshooting

### Alerts Not Firing

**1. Check Prometheus is scraping metrics:**
```bash
# Check targets status
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check if metrics exist
curl http://localhost:9090/api/v1/query?query=http_requests_total
```

**2. Check alert rule syntax:**
```bash
# Validate rules file
docker compose -f docker-compose.monitoring.yml exec prometheus promtool check rules /etc/prometheus/alerts.yml

# Check if rules loaded
curl http://localhost:9090/api/v1/rules
```

**3. Check alert evaluation:**
```bash
# Query alert condition manually
curl 'http://localhost:9090/api/v1/query?query=rate(http_requests_total%7Bstatus~%225..%22%7D%5B5m%5D)%20%2F%20rate(http_requests_total%5B5m%5D)'
```

**4. Check for insufficient data:**
- Alerts require data over the specified time range
- If `for: 5m`, need at least 5 minutes of metrics
- Check if application has been running long enough

---

### Notifications Not Received

**1. Check Alertmanager received the alert:**
```bash
# Check Alertmanager alerts
curl http://localhost:9093/api/v1/alerts
```

**2. Check Alertmanager routing:**
```bash
# Check Alertmanager config
curl http://localhost:9093/api/v1/status | jq '.data.config'

# Check logs
docker compose -f docker-compose.monitoring.yml logs alertmanager
```

**3. Verify notification channel configuration:**
```bash
# Test Slack webhook
curl -X POST 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from MDL Alertmanager"}'

# Test SMTP
telnet smtp.gmail.com 587
```

**4. Check for silences:**
```bash
# List active silences
curl http://localhost:9093/api/v1/silences | jq '.data[] | select(.status.state == "active")'
```

---

### High Alert Volume

**1. Check for alert storms:**
```bash
# Count firing alerts
curl http://localhost:9093/api/v1/alerts | jq '[.data[] | select(.status.state == "active")] | length'

# Group by alert name
curl http://localhost:9093/api/v1/alerts | jq '.data | group_by(.labels.alertname) | map({alert: .[0].labels.alertname, count: length})'
```

**2. Adjust alert thresholds:**
- Review alert conditions in `monitoring/alerts.yml`
- Increase thresholds or `for` duration
- Add inhibition rules

**3. Use better grouping:**
```yaml
route:
  group_by: ['alertname', 'cluster', 'service']  # Add more labels
  group_wait: 30s  # Increase wait time
  group_interval: 5m  # Increase interval
```

---

## Best Practices

### 1. Alert Design
- ✅ Alert on symptoms, not causes
- ✅ Make alerts actionable
- ✅ Include context in annotations
- ✅ Use appropriate severity levels
- ❌ Don't alert on everything
- ❌ Don't create alerts without runbooks

### 2. Notification Management
- ✅ Route critical alerts to on-call rotation
- ✅ Send warnings to team channel
- ✅ Send info alerts to monitoring channel
- ✅ Use silences during maintenance
- ❌ Don't send all alerts to everyone
- ❌ Don't ignore alerts (adjust thresholds instead)

### 3. Response Times
- **Critical**: <5 minutes (page on-call engineer)
- **Warning**: <30 minutes (notify team)
- **Info**: Best effort (log for review)

### 4. Documentation
- ✅ Document expected response for each alert
- ✅ Create runbooks for critical alerts
- ✅ Keep contact information up to date
- ✅ Review and update alerts quarterly

---

## Next Steps

After completing Task 2, proceed to:

1. **Task 3**: Distributed tracing with OpenTelemetry/Jaeger
2. **Task 4**: Create Grafana dashboards for visualization
3. **Task 5**: Optional log aggregation with Loki
4. **Task 6**: Create detailed operational runbooks

---

## References

- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Alert Rule Best Practices](https://prometheus.io/docs/practices/alerting/)
- [Notification Templates](https://prometheus.io/docs/alerting/latest/notifications/)
