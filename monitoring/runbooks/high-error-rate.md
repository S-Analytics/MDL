# Runbook: High Error Rate

## Alert Details

- **Alert Name:** `HighErrorRate`
- **Severity:** 🔴 **CRITICAL**
- **Threshold:** Error rate > 5% for 5 minutes
- **Prometheus Expression:**
  ```promql
  (
    rate(http_requests_total{status=~"5.."}[5m]) 
    / 
    rate(http_requests_total[5m])
  ) > 0.05
  ```

## Symptoms

Users experiencing:
- 500 Internal Server Error responses
- 502 Bad Gateway errors
- 503 Service Unavailable errors
- Failed requests or operations
- Degraded application functionality
- Timeouts

System indicators:
- Elevated error rate in Grafana dashboard
- Increased error logs
- Alert firing in Alertmanager
- Customer complaints or support tickets

## Impact Assessment

| Error Rate | Impact | Response |
|------------|--------|----------|
| 5-10% | Minor - Some users affected | Follow runbook, monitor |
| 10-25% | Moderate - Many users affected | Follow runbook, escalate to L2 after 15 min |
| >25% | Severe - Most users affected | Immediate escalation, consider rollback |

## Quick Check (2 minutes)

Execute these commands immediately to verify the issue:

```bash
# 1. Check current error rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])" | jq '.data.result[0].value[1]'

# 2. Check API health endpoint
curl -i http://localhost:3000/health

# 3. Check which endpoints are erroring
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[] | "\(.metric.method) \(.metric.path) - \(.value[1])"'

# 4. Check recent error logs
tail -n 50 logs/app.log | grep -i "error\|exception"
```

**Is this a real issue?**
- ✅ Error rate > 5% AND users reporting issues → **Proceed with diagnosis**
- ⚠️ Error rate > 5% BUT no user reports → **Monitor closely, investigate**
- ❌ Error rate < 5% → **False alarm, check alert configuration**

## Detailed Diagnosis

### Step 1: Identify Error Distribution

**Check error breakdown by endpoint:**
```bash
# Get error counts by path
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[] | "\(.metric.path) - \(.value[1]) errors/sec"'
```

**Check error breakdown by status code:**
```bash
# 500 errors (application errors)
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=\"500\"}[5m])" | jq

# 502 errors (upstream failures)
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=\"502\"}[5m])" | jq

# 503 errors (service unavailable)
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=\"503\"}[5m])" | jq
```

**Interpretation:**
- **Single endpoint errors** → Specific code issue
- **All endpoints errors** → System-wide issue (database, cache, etc.)
- **500 errors** → Application bugs or exceptions
- **502/503 errors** → Infrastructure or dependency issues

### Step 2: Check Application Logs

**View recent error logs:**
```bash
# Last 100 error entries
tail -n 500 logs/app.log | grep -i "error" | tail -n 100

# Look for stack traces
tail -n 500 logs/app.log | grep -A 10 "Error:"

# Check for specific error patterns
tail -n 500 logs/app.log | grep -E "database|connection|timeout|memory"
```

**Common error patterns:**
- `ECONNREFUSED` → Database or Redis connection failed
- `ETIMEDOUT` → Network timeout
- `Out of memory` → Memory leak or insufficient resources
- `FATAL ERROR` → Node.js crash
- `Validation error` → Bad input data
- `Authentication failed` → Auth system issue

### Step 3: Check Dependencies

**Database connectivity:**
```bash
# Test database connection
psql -h localhost -U mdl -d mdl -c "SELECT 1;" 2>&1

# Check database connection count
psql -h localhost -U mdl -d mdl -c "SELECT count(*) FROM pg_stat_activity;" 2>&1

# Check for locks
psql -h localhost -U mdl -d mdl -c "SELECT blocked_locks.pid AS blocked_pid, blocking_locks.pid AS blocking_pid, blocked_activity.usename AS blocked_user, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;" 2>&1
```

**Redis connectivity (if cache enabled):**
```bash
# Test Redis connection
redis-cli ping 2>&1

# Check Redis memory
redis-cli INFO memory | grep used_memory_human

# Check for errors in Redis
redis-cli INFO stats | grep rejected_connections
```

**Check metrics endpoints:**
```bash
# Verify Prometheus can scrape metrics
curl -s http://localhost:3000/metrics | head -n 20

# Check database pool metrics
curl -s http://localhost:3000/metrics | grep "db_pool"
```

### Step 4: Check System Resources

**Memory usage:**
```bash
# Check application memory
ps aux | grep "node.*index.ts" | awk '{print $4, $6, $11}'

# Check system memory
free -h

# Check Node.js heap usage from metrics
curl -s http://localhost:3000/metrics | grep "nodejs_heap"
```

**CPU usage:**
```bash
# Check application CPU
ps aux | grep "node.*index.ts" | awk '{print $3, $11}'

# System load
uptime

# Top processes
top -n 1 -b | head -n 20
```

**Disk space:**
```bash
# Check disk usage
df -h

# Check if logs are filling disk
du -sh logs/
```

### Step 5: Check Recent Changes

**Recent deployments:**
```bash
# Check git log for recent changes
git log --oneline -10

# Check if there were recent deployments
# (Check your CI/CD system or deployment logs)
```

**Recent configuration changes:**
- Review .env file changes
- Check database migrations
- Review infrastructure changes

## Resolution Procedures

### Resolution 1: Database Connection Issues

**If database is unreachable or slow:**

```bash
# 1. Check database status
systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# 2. Restart database if needed
systemctl restart postgresql  # Linux
brew services restart postgresql  # macOS

# 3. Restart application to reset connection pool
lsof -ti :3000 | xargs kill
npm run dev  # or your start command

# 4. Verify recovery
curl http://localhost:3000/health
```

**If connection pool exhausted:**
```bash
# Check active connections
curl -s http://localhost:3000/metrics | grep "db_pool_active"

# Kill idle connections in database
psql -h localhost -U mdl -d mdl -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"

# Restart application
lsof -ti :3000 | xargs kill
npm run dev
```

### Resolution 2: Redis/Cache Issues

**If Redis is down or experiencing issues:**

```bash
# 1. Check Redis status
redis-cli ping

# 2. Restart Redis if needed
redis-cli shutdown
redis-server &  # or brew services restart redis

# 3. Clear cache if corrupted
redis-cli FLUSHALL

# 4. Disable cache temporarily if needed
# Edit .env: FEATURE_REDIS_CACHE=false
# Or in Settings Panel: Uncheck "Enable Redis Cache"

# 5. Restart application
lsof -ti :3000 | xargs kill
npm run dev
```

### Resolution 3: Memory Leak or High Memory Usage

**If application is running out of memory:**

```bash
# 1. Check memory usage
ps aux | grep node | awk '{print $4, $6, $11}'

# 2. Take heap snapshot for analysis (if time permits)
kill -USR2 $(lsof -ti :3000)  # Triggers heap dump if configured

# 3. Restart application (immediate relief)
lsof -ti :3000 | xargs kill
npm run dev

# 4. Monitor memory after restart
watch -n 5 'ps aux | grep node | awk "{print \$4, \$6, \$11}"'
```

### Resolution 4: Application Code Bug

**If errors are from specific endpoint:**

```bash
# 1. Identify problematic endpoint
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=\"500\"}[5m])" | jq -r '.data.result[] | "\(.metric.path)"'

# 2. Check recent changes to that endpoint
git log --oneline -- src/api/v1/[endpoint]

# 3. Rollback if recent deployment
git revert [commit-hash]
npm run build
npm run dev

# 4. Or apply hotfix
# Edit code
npm run build
npm run dev

# 5. Verify fix
curl http://localhost:3000/api/v1/[endpoint]
```

### Resolution 5: Traffic Spike / DDoS

**If errors due to overload:**

```bash
# 1. Check request rate
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[1m])" | jq

# 2. Identify sources (check logs for IPs)
tail -n 1000 logs/app.log | grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -n 10

# 3. Rate limit or block if malicious
# (Implement rate limiting in application or reverse proxy)

# 4. Scale horizontally if legitimate traffic
# (Add more instances, increase resources)
```

### Resolution 6: External Service Failure

**If dependent service is down:**

```bash
# 1. Identify which external service
tail -n 200 logs/app.log | grep -i "external\|api\|third"

# 2. Check service status pages
# (Check status pages of third-party services)

# 3. Implement fallback or circuit breaker
# (Code change required, temporary workaround: disable feature)

# 4. Configure timeout to fail fast
# Edit .env or configuration
```

## Verification

After applying resolution, verify the issue is fixed:

```bash
# 1. Check error rate dropped
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])" | jq '.data.result[0].value[1]'

# 2. Check health endpoint
curl -i http://localhost:3000/health

# 3. Test affected endpoints
curl -i http://localhost:3000/api/v1/metrics
curl -i http://localhost:3000/api/v1/domains

# 4. Monitor Grafana dashboard
open http://localhost:3001/d/mdl-api-overview

# 5. Confirm alert cleared
open http://localhost:9093/#/alerts
```

**Expected results:**
- ✅ Error rate < 5%
- ✅ Health endpoint returns 200
- ✅ Affected endpoints responding normally
- ✅ Alert resolved in Alertmanager
- ✅ No new error logs

## Escalation

Escalate if:
- Issue persists after 15 minutes of troubleshooting
- Error rate > 25% (critical impact)
- Root cause unclear
- Resolution requires code changes or infrastructure changes
- Customer-facing impact is severe

### Escalation Path

1. **Level 1 → Level 2 (Senior Engineer):**
   - Post in #incidents: "Escalating HighErrorRate alert to L2. Error rate: XX%. Tried: [list steps]. Need help with: [specific issue]"
   - Tag senior engineer on-call
   - Share incident timeline and findings

2. **Level 2 → Level 3 (Engineering Manager):**
   - If issue requires business decision (e.g., extended downtime for fix)
   - If issue requires significant resource allocation
   - If customer communication needed

### Escalation Template

```
🚨 ESCALATION: HighErrorRate

Current Status:
- Error rate: [XX%]
- Duration: [XX minutes]
- User impact: [description]

Actions Taken:
1. [Step 1] - [Result]
2. [Step 2] - [Result]
3. [Step 3] - [Result]

Current Theory:
[What you think is causing the issue]

Need Help With:
[Specific question or blocker]

Next Steps:
[What needs to happen]
```

## Prevention

### Short-term Prevention (within 1 week)

1. **Improve Error Handling:**
   - Add try-catch blocks around risky operations
   - Implement proper error responses
   - Add validation for all inputs

2. **Add Retry Logic:**
   - Retry transient failures (network, timeout)
   - Implement exponential backoff
   - Set maximum retry limits

3. **Implement Circuit Breakers:**
   - Fail fast when dependencies are down
   - Prevent cascade failures
   - Auto-recover when service returns

4. **Add Health Checks:**
   - Deep health checks for dependencies
   - Liveness and readiness probes
   - Automated recovery

5. **Improve Logging:**
   - Log all errors with full context
   - Include correlation IDs
   - Add structured error data

### Long-term Prevention (within 1 month)

1. **Load Testing:**
   - Regular load tests to find breaking points
   - Chaos engineering to test failure scenarios
   - Performance regression testing

2. **Code Quality:**
   - Increase test coverage (target: >80%)
   - Add integration tests for critical paths
   - Implement e2e tests

3. **Monitoring Improvements:**
   - Add synthetic monitoring
   - Set up error budget tracking
   - Implement SLO/SLI monitoring

4. **Infrastructure:**
   - Auto-scaling policies
   - Multi-region deployment
   - Database connection pooling optimization
   - Redis sentinel for high availability

5. **Documentation:**
   - API error response documentation
   - Error handling best practices guide
   - Post-mortem reviews and learnings

## Related Alerts

These alerts often fire together or indicate related issues:

- **SlowResponseTimes** - Often precedes high error rate
- **DatabasePoolExhaustion** - Common cause of 5xx errors
- **HighMemoryUsage** - Can lead to crashes and errors
- **APIInstanceDown** - Extreme case of high error rate

When investigating HighErrorRate, also check these related alerts.

## Post-Incident Checklist

After resolving the incident:

- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Update this runbook with new learnings
- [ ] Create follow-up tasks for prevention items
- [ ] Schedule post-mortem meeting
- [ ] Update customer status page
- [ ] Share learnings with team

## Additional Resources

- [Grafana Dashboard: API Overview](http://localhost:3001/d/mdl-api-overview)
- [Prometheus Alerts](http://localhost:9090/alerts)
- [Application Logs](../logs/app.log)
- [Monitoring README](../README.md)
- [Error Handling Best Practices](../../docs/ERROR_HANDLING.md)

---

**Last Updated:** November 23, 2025  
**Runbook Owner:** Platform Engineering Team  
**Review Schedule:** After each incident or quarterly
