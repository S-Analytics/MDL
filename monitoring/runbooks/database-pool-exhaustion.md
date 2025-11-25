# Runbook: Database Pool Exhaustion

## Alert Details

- **Alert Name:** `DatabasePoolExhaustion`
- **Severity:** 🔴 **CRITICAL**
- **Threshold:** Active connections > 80% of max (typically 16/20)
- **Prometheus Expression:**
  ```promql
  database_pool_active_connections / database_pool_max_connections > 0.8
  ```

## Symptoms

Performance degradation and connection errors:
- Slow API responses
- Connection timeout errors
- Requests queuing or hanging
- `Connection pool exhausted` errors in logs
- Some requests succeed, others timeout
- Gradual slowdown over time

System indicators:
- High active connection count in metrics
- Long-running database queries
- Increased request duration
- Connection wait time increasing

## Impact Assessment

| Pool Usage | Impact | Response |
|------------|--------|----------|
| 80-90% | Warning - Performance degrading | Monitor, investigate |
| 90-95% | Moderate - Many requests delayed | Follow runbook immediately |
| >95% | Critical - Requests failing | Immediate action, escalate |

## Quick Check (2 minutes)

```bash
# 1. Check current pool usage
curl -s http://localhost:3000/metrics | grep "database_pool"

# 2. Check active database connections
psql -h localhost -U mdl -d mdl -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# 3. Check idle connections
psql -h localhost -U mdl -d mdl -c "SELECT count(*) as idle_connections FROM pg_stat_activity WHERE state = 'idle';"

# 4. Check for long-running queries
psql -h localhost -U mdl -d mdl -c "SELECT pid, now() - query_start as duration, state, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds' ORDER BY duration DESC LIMIT 10;"
```

**Is this critical?**
- ✅ Active connections > 16/20 → **Proceed with immediate resolution**
- ⚠️ Active connections 12-16/20 → **Investigate and monitor**
- ❌ Active connections < 12/20 → **Monitor, may be transient spike**

## Detailed Diagnosis

### Step 1: Identify Connection Usage Pattern

**Check connection breakdown:**
```bash
# All connections by state
psql -h localhost -U mdl -d mdl -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Connections by application
psql -h localhost -U mdl -d mdl -c "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name;"

# Wait events (what connections are waiting for)
psql -h localhost -U mdl -d mdl -c "SELECT wait_event_type, wait_event, count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL GROUP BY wait_event_type, wait_event ORDER BY count DESC;"
```

**Interpretation:**
- **Many 'active' connections** → High query load
- **Many 'idle' connections** → Connection leak
- **Many 'idle in transaction'** → Uncommitted transactions (serious issue)
- **ClientRead wait events** → Application not reading results
- **Lock wait events** → Queries blocked by locks

### Step 2: Find Long-Running Queries

**List all long-running queries:**
```bash
# Queries running > 30 seconds
psql -h localhost -U mdl -d mdl -c "
SELECT 
  pid, 
  usename,
  application_name,
  client_addr,
  state,
  now() - query_start as duration,
  now() - state_change as state_duration,
  substring(query, 1, 100) as query_preview
FROM pg_stat_activity 
WHERE state != 'idle' 
  AND now() - query_start > interval '30 seconds'
ORDER BY query_start;
"

# Get full query for specific PID
psql -h localhost -U mdl -d mdl -c "SELECT query FROM pg_stat_activity WHERE pid = [PID];"
```

**Common problematic patterns:**
- Full table scans (no LIMIT, no WHERE clause)
- Missing indexes (sequential scans on large tables)
- Cartesian products (missing JOIN conditions)
- N+1 query problems (many small queries instead of one JOIN)
- Unoptimized ORMs (unnecessary columns, inefficient queries)

### Step 3: Check for Locks

**Find blocking queries:**
```bash
psql -h localhost -U mdl -d mdl -c "
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

### Step 4: Check Application Connection Handling

**Review application metrics:**
```bash
# Check request duration (slow requests hold connections longer)
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq

# Check request rate (high load)
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | jq

# Check database query duration
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(db_query_duration_seconds_bucket[5m]))" | jq
```

**Check application logs for connection errors:**
```bash
tail -n 500 logs/app.log | grep -i "connection\|pool\|timeout"
```

## Resolution Procedures

### Resolution 1: Kill Long-Running Queries (Immediate Relief)

**If long-running queries are holding connections:**

```bash
# 1. Identify long-running query PIDs
psql -h localhost -U mdl -d mdl -c "SELECT pid, now() - query_start as duration FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '1 minute' ORDER BY duration DESC;"

# 2. Review the query to ensure it's safe to kill
psql -h localhost -U mdl -d mdl -c "SELECT query FROM pg_stat_activity WHERE pid = [PID];"

# 3. Terminate the query (graceful)
psql -h localhost -U mdl -d mdl -c "SELECT pg_cancel_backend([PID]);"

# 4. If cancel doesn't work, force terminate
psql -h localhost -U mdl -d mdl -c "SELECT pg_terminate_backend([PID]);"

# 5. Verify connection freed
curl -s http://localhost:3000/metrics | grep "database_pool_active"
```

### Resolution 2: Clear Idle Connections

**If many idle connections accumulating:**

```bash
# 1. Find long-idle connections
psql -h localhost -U mdl -d mdl -c "SELECT pid, state, state_change FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# 2. Terminate idle connections (older than 10 minutes)
psql -h localhost -U mdl -d mdl -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# 3. Check if pool usage decreased
curl -s http://localhost:3000/metrics | grep "database_pool_active"
```

### Resolution 3: Clear Idle In Transaction (Critical)

**If connections stuck 'idle in transaction':**

```bash
# 1. Find idle in transaction connections
psql -h localhost -U mdl -d mdl -c "SELECT pid, now() - state_change as duration, query FROM pg_stat_activity WHERE state = 'idle in transaction' ORDER BY state_change;"

# 2. These are transactions that didn't commit/rollback - terminate immediately
psql -h localhost -U mdl -d mdl -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';"

# 3. This indicates a serious bug in application code
tail -n 100 logs/app.log | grep -B5 -A5 "BEGIN\|COMMIT\|ROLLBACK"
```

**Root cause:** Application opened transaction but didn't commit/rollback. Fix code.

### Resolution 4: Increase Pool Size (Temporary)

**If legitimate high load:**

```bash
# 1. Verify load is legitimate, not a bug
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" | jq

# 2. Edit configuration to increase pool size
# Edit src/config/database.ts or .env
# Change max: 20 to max: 40 (example)

# 3. Restart application
lsof -ti :3000 | xargs kill
npm run dev

# 4. Verify increased pool size
curl -s http://localhost:3000/metrics | grep "database_pool_max"

# 5. Monitor to ensure problem resolved
watch -n 5 'curl -s http://localhost:3000/metrics | grep "database_pool"'
```

**Warning:** Increasing pool size is a temporary fix. Investigate root cause.

### Resolution 5: Optimize Slow Query

**If specific query is slow:**

```bash
# 1. Identify the slow query from pg_stat_activity

# 2. Analyze query execution plan
psql -h localhost -U mdl -d mdl -c "EXPLAIN ANALYZE [your query];"

# 3. Look for issues:
#    - Seq Scan on large tables (add index)
#    - High cost operations
#    - Nested Loop on large datasets (use hash join)

# 4. Add missing indexes
psql -h localhost -U mdl -d mdl -c "CREATE INDEX CONCURRENTLY idx_[name] ON [table]([column]);"

# 5. Or optimize query in application code
# Edit the query to use proper indexes, add WHERE clauses, use LIMIT

# 6. Test optimization
psql -h localhost -U mdl -d mdl -c "EXPLAIN ANALYZE [optimized query];"

# 7. Deploy fix
npm run build
lsof -ti :3000 | xargs kill
npm run dev
```

### Resolution 6: Implement Connection Timeout

**Add timeout to prevent connection hogging:**

```typescript
// In src/config/database.ts
const pool = new Pool({
  // existing config...
  connectionTimeoutMillis: 5000,  // 5 seconds to acquire connection
  idleTimeoutMillis: 30000,        // 30 seconds idle before release
  query_timeout: 30000,            // 30 seconds max query time
});

// Add timeout to specific queries
await pool.query({
  text: 'SELECT * FROM metrics',
  timeout: 10000  // 10 second timeout for this query
});
```

**Restart application:**
```bash
npm run build
lsof -ti :3000 | xargs kill
npm run dev
```

## Verification

After applying resolution:

```bash
# 1. Check pool usage returned to normal
curl -s http://localhost:3000/metrics | grep "database_pool"

# Expected: active_connections < 10, utilization < 50%

# 2. Check no long-running queries
psql -h localhost -U mdl -d mdl -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';"

# Expected: 0

# 3. Check API response times improved
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))" | jq

# Expected: P95 < 0.2 seconds

# 4. Check alert cleared
open http://localhost:9093/#/alerts

# 5. Monitor for 10 minutes to ensure stability
watch -n 10 'curl -s http://localhost:3000/metrics | grep "database_pool"'
```

## Escalation

Escalate if:
- Pool exhaustion persists after killing long-running queries
- Root cause is unclear (no obvious slow queries or high load)
- Problem requires code changes
- Database infrastructure changes needed

### Escalation Template
```
🚨 ESCALATION: Database Pool Exhaustion

Current State:
- Active connections: [X]/[Y]
- Pool utilization: [XX%]
- Duration: [XX minutes]

Actions Taken:
1. Killed [N] long-running queries - [result]
2. Cleared [N] idle connections - [result]
3. Increased pool size to [N] - [result]

Current Issue:
[Describe the problem]

Suspected Root Cause:
[Your theory]

Need Help With:
[Specific question or blocker]
```

## Prevention

### Immediate Actions (within 24 hours)

1. **Add Connection Pool Monitoring:**
   ```typescript
   // Log pool stats periodically
   setInterval(() => {
     logger.info('Database pool stats', {
       total: pool.totalCount,
       active: pool.waitingCount,
       idle: pool.idleCount
     });
   }, 60000); // Every minute
   ```

2. **Set Conservative Timeouts:**
   - Connection timeout: 5 seconds
   - Idle timeout: 30 seconds
   - Query timeout: 30 seconds

3. **Add Query Logging:**
   ```typescript
   // Log slow queries
   pool.on('query', (query) => {
     const start = Date.now();
     query.on('end', () => {
       const duration = Date.now() - start;
       if (duration > 1000) {
         logger.warn('Slow query', { duration, text: query.text });
       }
     });
   });
   ```

### Short-term Prevention (within 1 week)

1. **Optimize Database Queries:**
   - Add indexes for common queries
   - Use EXPLAIN ANALYZE for slow queries
   - Avoid SELECT *
   - Use connection pooling properly

2. **Implement Query Optimization:**
   - Add pagination to large result sets
   - Use database views for complex queries
   - Cache frequently accessed data
   - Use database query caching

3. **Add Connection Leak Detection:**
   ```typescript
   // Detect connection leaks
   setInterval(() => {
     if (pool.totalCount > pool.options.max * 0.9) {
       logger.error('Possible connection leak detected', {
         total: pool.totalCount,
         max: pool.options.max
       });
     }
   }, 30000);
   ```

4. **Implement Circuit Breaker:**
   - Stop accepting requests if pool exhausted
   - Return 503 Service Unavailable
   - Prevent cascade failures

### Long-term Prevention (within 1 month)

1. **Database Performance Tuning:**
   - Regular VACUUM and ANALYZE
   - Monitor and optimize indexes
   - Partition large tables
   - Use read replicas for read-heavy workloads

2. **Connection Pool Sizing:**
   - Formula: connections = ((core_count * 2) + effective_spindle_count)
   - Monitor actual usage patterns
   - Right-size based on workload

3. **Query Performance Monitoring:**
   - Use pg_stat_statements extension
   - Regular query performance reviews
   - Automated slow query alerts

4. **Code Review Guidelines:**
   - Always use connection pooling
   - Always close connections in finally blocks
   - Use transactions properly (commit/rollback)
   - Avoid N+1 query problems

5. **Load Testing:**
   - Regular load tests to find breaking points
   - Test connection pool limits
   - Identify inefficient queries under load

## Related Alerts

- **SlowResponseTimes** - Often precedes pool exhaustion
- **HighErrorRate** - May result from connection timeouts
- **APIInstanceDown** - Can occur if all connections stuck

## Post-Incident Checklist

- [ ] Document query patterns during incident
- [ ] Identify root cause (slow query, leak, high load)
- [ ] Review and optimize identified slow queries
- [ ] Add indexes if missing
- [ ] Update connection pool configuration
- [ ] Add query timeout enforcement
- [ ] Update monitoring and alerting
- [ ] Create prevention tasks
- [ ] Share learnings with team

## Additional Resources

- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [pg-pool Documentation](https://node-postgres.com/features/pooling)
- [Query Optimization Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [Grafana Dashboard: Infrastructure](http://localhost:3001/d/mdl-infrastructure)

---

**Last Updated:** November 23, 2025  
**Runbook Owner:** Platform Engineering Team
