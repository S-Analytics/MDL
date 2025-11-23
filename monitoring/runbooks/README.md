# Operational Runbooks

This directory contains operational runbooks for responding to alerts and incidents in the MDL API.

## Purpose

Runbooks provide step-by-step procedures for:
- Diagnosing issues
- Resolving incidents
- Escalating when needed
- Preventing future occurrences

## Available Runbooks

### Critical Severity
- [HighErrorRate](./high-error-rate.md) - API experiencing elevated error rates (>5%)
- [APIInstanceDown](./api-instance-down.md) - API service is not responding
- [DatabasePoolExhaustion](./database-pool-exhaustion.md) - Database connection pool nearly full

### Warning Severity
- [SlowResponseTimes](./slow-response-times.md) - API response times degraded (P95 >1s)
- [HighRequestRate](./high-request-rate.md) - Unusual traffic spike (>100 req/s)
- [LowCacheHitRate](./low-cache-hit-rate.md) - Cache effectiveness degraded (<50%)
- [HighMemoryUsage](./high-memory-usage.md) - Memory consumption elevated (>80%)
- [DiskSpaceLow](./disk-space-low.md) - Disk space running low (<10%)

### Info Severity
- [NoMetricsCreated](./no-metrics-created.md) - No business activity detected
- [UnusualDomainActivity](./unusual-domain-activity.md) - Abnormal domain creation pattern

## Runbook Structure

Each runbook follows a consistent structure:

1. **Alert Details** - Name, severity, threshold
2. **Symptoms** - What users experience
3. **Quick Check** - Immediate verification steps
4. **Diagnosis** - Detailed investigation procedures
5. **Resolution** - Step-by-step fix procedures
6. **Escalation** - When and how to escalate
7. **Prevention** - Long-term improvements
8. **Related Alerts** - Connected issues to check

## Using Runbooks

### During an Incident

1. **Acknowledge the alert** in Alertmanager
2. **Open the relevant runbook** from the links above
3. **Follow Quick Check** to verify the issue
4. **Execute Diagnosis** steps to understand the root cause
5. **Apply Resolution** procedures to fix the issue
6. **Escalate** if resolution fails or issue persists
7. **Document** what happened and what worked

### After an Incident

1. **Post-mortem** - Document what happened, why, and how it was fixed
2. **Update runbook** - Add new insights or resolution steps
3. **Implement prevention** - Apply long-term fixes from runbook
4. **Share learnings** - Brief team on incident and resolution

## Alert Severity Levels

| Severity | Response Time | Notification | Impact |
|----------|--------------|--------------|--------|
| **Critical** | Immediate | PagerDuty, Slack, Email | Service degraded or down |
| **Warning** | 15 minutes | Slack, Email | Performance degraded |
| **Info** | Next business day | Email | No user impact |

## Escalation Paths

### Level 1: On-Call Engineer
- **Response Time:** Immediate for critical, 15 min for warning
- **Authority:** Restart services, scale resources, apply fixes
- **Escalate to L2 if:** Issue unresolved after 30 minutes

### Level 2: Senior Engineer / Team Lead
- **Response Time:** 15 minutes
- **Authority:** Code changes, infrastructure changes, rollbacks
- **Escalate to L3 if:** Issue requires architectural changes or business decision

### Level 3: Engineering Manager / CTO
- **Response Time:** 30 minutes
- **Authority:** Resource allocation, vendor engagement, customer communication
- **Decision:** Extended downtime vs. quick fix tradeoffs

## Communication Guidelines

### Internal Communication (Slack #incidents)
```
🚨 INCIDENT: [Alert Name]
Severity: [Critical/Warning/Info]
Started: [Timestamp]
Impact: [Brief description]
Assigned: [@engineer]
Status: [Investigating/Fixing/Resolved]

Updates:
[HH:MM] - [Status update]
[HH:MM] - [Action taken]
[HH:MM] - Resolved
```

### Customer Communication (Status Page)
```
🔴 Service Degraded
We are experiencing [brief issue description].
Our team is investigating and working on a fix.
Last updated: [Timestamp]

✅ Resolved
The issue has been resolved. Service is operating normally.
Resolved at: [Timestamp]
```

## Monitoring Tools

### Grafana Dashboards
- **MDL API Overview**: http://localhost:3001/d/mdl-api-overview
- **Business Metrics**: http://localhost:3001/d/mdl-business-metrics
- **Infrastructure**: http://localhost:3001/d/mdl-infrastructure

### Prometheus
- **Query UI**: http://localhost:9090
- **Alerts**: http://localhost:9090/alerts
- **Targets**: http://localhost:9090/targets

### Jaeger (Distributed Tracing)
- **UI**: http://localhost:16686
- **Search traces** by service, operation, tags

### Alertmanager
- **UI**: http://localhost:9093
- **Silence alerts**, view active alerts, check notification history

## Common Commands

### Check Service Health
```bash
# API health check
curl http://localhost:3000/health

# Prometheus targets
curl http://localhost:9090/api/v1/targets

# Get current metrics
curl http://localhost:3000/metrics
```

### Docker Services
```bash
# Check running services
docker compose -f docker-compose.monitoring.yml ps

# View logs
docker compose -f docker-compose.monitoring.yml logs -f [service]

# Restart service
docker compose -f docker-compose.monitoring.yml restart [service]
```

### Database
```bash
# Connection count
psql -h localhost -U mdl -d mdl -c "SELECT count(*) FROM pg_stat_activity;"

# Long-running queries
psql -h localhost -U mdl -d mdl -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"

# Kill query
psql -h localhost -U mdl -d mdl -c "SELECT pg_terminate_backend(PID);"
```

### Redis
```bash
# Check connectivity
redis-cli ping

# Get cache stats
redis-cli INFO stats

# Check memory usage
redis-cli INFO memory

# Clear cache (emergency)
redis-cli FLUSHALL
```

### Application
```bash
# Check running processes
lsof -ti :3000

# Kill process
lsof -ti :3000 | xargs kill

# View logs
tail -f logs/app.log

# Check memory usage
ps aux | grep "node.*index.ts"
```

## Incident Response Checklist

### ✅ During Incident
- [ ] Acknowledge alert in Alertmanager
- [ ] Post incident notice in #incidents Slack channel
- [ ] Open relevant runbook
- [ ] Follow Quick Check steps
- [ ] Execute Diagnosis procedures
- [ ] Apply Resolution steps
- [ ] Update #incidents with progress
- [ ] Verify issue resolved
- [ ] Confirm alerts cleared

### ✅ Post-Incident
- [ ] Document timeline in post-mortem
- [ ] Identify root cause
- [ ] List contributing factors
- [ ] Document what worked / didn't work
- [ ] Update runbook with learnings
- [ ] Create prevention tasks
- [ ] Schedule post-mortem review
- [ ] Update customer status page

## Best Practices

1. **Stay Calm** - Panic doesn't help, methodical debugging does
2. **Follow the Runbook** - Don't skip steps, they're there for a reason
3. **Document Everything** - Your future self will thank you
4. **Communicate Often** - Update stakeholders every 15 minutes
5. **Ask for Help** - Escalate early if uncertain
6. **Learn and Improve** - Every incident is a learning opportunity

## Related Documentation

- [Monitoring README](../README.md) - Monitoring stack overview
- [Alerting Guide](../ALERTING_GUIDE.md) - Alert configuration and testing
- [Metrics Reference](../METRICS_REFERENCE.md) - Available metrics
- [Tracing Guide](../TRACING_GUIDE.md) - Distributed tracing usage
- [Dashboards Guide](../DASHBOARDS_GUIDE.md) - Grafana dashboard usage

## Updates and Improvements

This is a living document. After each incident:
1. Review the runbook used
2. Note what was missing or unclear
3. Update the runbook with improvements
4. Share updates with the team

**Last Updated:** November 23, 2025  
**Maintained By:** Platform Engineering Team
