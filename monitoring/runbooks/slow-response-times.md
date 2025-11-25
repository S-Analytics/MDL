# Runbook: Slow Response Times

## Alert Details

- **Alert Name:** `SlowResponseTimes`
- **Severity:** ⚠️ **WARNING**
- **Threshold:** P95 response time > 1 second for 5 minutes
- **Prometheus Expression:**
  ```promql
  histogram_quantile(0.95, 
    rate(http_request_duration_seconds_bucket[5m])
  ) > 1.0
  ```

## Symptoms

- Users experiencing slow page loads
- API responses taking longer than usual
- Timeouts on some requests
- Degraded user experience
- Increased request duration in Grafana

## Quick Check

```bash
# Check current P95 latency
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq '.data.result[0].value[1]'

# Check which endpoints are slow
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{path!=\"/metrics\"}[5m]))by(path)" | jq -r '.data.result[] | "\(.metric.path): \(.value[1])s"'

# Check request rate (high load?)
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | jq
```

## Diagnosis

### Common Causes

1. **Database Slow Queries**
   ```bash
   psql -h localhost -U mdl -d mdl -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 5;"
   ```

2. **Cache Miss Rate High**
   ```bash
   curl -s http://localhost:3000/metrics | grep "cache_"
   ```

3. **High Memory Usage**
   ```bash
   ps aux | grep node | awk '{print $4, $6}'
   ```

4. **CPU Saturation**
   ```bash
   top -n 1 | head -20
   ```

## Resolution

1. **Optimize Slow Endpoints:**
   - Add caching for frequently accessed data
   - Optimize database queries
   - Add pagination to large result sets

2. **Scale Resources:**
   - Increase cache TTL
   - Add more cache entries
   - Increase database connection pool

3. **Add Caching:**
   ```bash
   # Enable Redis if not already
   # Edit .env: FEATURE_REDIS_CACHE=true
   lsof -ti :3000 | xargs kill
   npm run dev
   ```

## Prevention

- Regular performance testing
- Query optimization reviews
- Cache hit rate monitoring
- Database index maintenance

**See Also:** [high-error-rate.md](./high-error-rate.md), [database-pool-exhaustion.md](./database-pool-exhaustion.md)

---
**Last Updated:** November 23, 2025
