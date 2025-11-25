# Runbook: API Instance Down

## Alert Details

- **Alert Name:** `APIInstanceDown`
- **Severity:** 🔴 **CRITICAL**
- **Threshold:** Instance unreachable for 1 minute
- **Prometheus Expression:**
  ```promql
  up{job="mdl-api"} == 0
  ```

## Symptoms

Complete service outage:
- API not responding to requests
- Health check endpoint unreachable
- All requests timing out or failing
- Prometheus cannot scrape metrics
- Users cannot access application
- 502/503 errors from load balancer

System indicators:
- `up` metric = 0 in Prometheus
- Service not in process list
- Port 3000 not listening
- No recent logs

## Impact Assessment

**Critical** - Complete service unavailability

- All users affected
- All API functionality unavailable
- Business operations halted
- Immediate response required

## Quick Check (1 minute)

Execute these commands immediately:

```bash
# 1. Check if process is running
lsof -ti :3000

# 2. Try to reach health endpoint
curl -i --max-time 5 http://localhost:3000/health

# 3. Check if port is listening
netstat -an | grep 3000  # Linux
lsof -nP -iTCP:3000 | grep LISTEN  # macOS

# 4. Check recent logs for crashes
tail -n 100 logs/app.log | grep -i "error\|fatal\|crash"
```

**Is this a real outage?**
- ✅ Process not running AND port not listening → **Proceed with immediate restart**
- ✅ Process running but not responding → **Proceed with diagnosis**
- ⚠️ Network issue → **Check network connectivity**
- ❌ Prometheus scrape issue only → **Check Prometheus configuration**

## Detailed Diagnosis

### Step 1: Determine Why Service is Down

**Check if process exists:**
```bash
# Check all node processes
ps aux | grep node

# Check specifically for MDL process
ps aux | grep "node.*index.ts"

# Check process exit status if available
echo $?
```

**Check system logs for crashes:**
```bash
# Application logs (last 200 lines)
tail -n 200 logs/app.log

# System logs (if service managed by systemd)
journalctl -u mdl-api -n 100  # Linux

# Look for specific crash indicators
tail -n 500 logs/app.log | grep -i "fatal\|crash\|killed\|segfault\|out of memory"
```

**Common crash reasons:**
- `FATAL ERROR` - Node.js fatal exception
- `Out of memory` - Memory exhausted
- `Killed` - OOM killer terminated process
- `EADDRINUSE` - Port already in use
- `Cannot find module` - Dependency issue
- `SyntaxError` - Code compilation error

### Step 2: Check System Resources

**Memory availability:**
```bash
# System memory
free -h  # Linux
vm_stat  # macOS

# Check if OOM killer activated (Linux)
dmesg | grep -i "out of memory"
dmesg | grep -i "killed process"

# Check swap usage
free -h | grep Swap
```

**Disk space:**
```bash
# Check all mounts
df -h

# Check inode usage
df -i

# Check log directory size
du -sh logs/
```

**CPU and load:**
```bash
# System load average
uptime

# CPU usage
top -n 1 | head -20

# Check for runaway processes
ps aux --sort=-%cpu | head -10
```

### Step 3: Check Dependencies

**Database connectivity:**
```bash
# Test PostgreSQL connection
psql -h localhost -U mdl -d mdl -c "SELECT 1;" 2>&1

# Check if PostgreSQL is running
systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Check PostgreSQL logs for issues
tail -n 100 /var/log/postgresql/postgresql-*.log  # Linux
tail -n 100 /usr/local/var/log/postgres.log  # macOS (Homebrew)
```

**Redis connectivity (if enabled):**
```bash
# Test Redis connection
redis-cli ping

# Check if Redis is running
systemctl status redis  # Linux
brew services list | grep redis  # macOS

# Check Redis logs
tail -n 100 /var/log/redis/redis-server.log  # Linux
tail -n 100 /usr/local/var/log/redis.log  # macOS
```

### Step 4: Check Configuration

**Environment variables:**
```bash
# Check .env file exists and is readable
ls -la .env
cat .env | grep -v "PASSWORD\|SECRET"

# Verify required variables are set
grep "DATABASE_URL" .env
grep "PORT" .env
```

**Port conflicts:**
```bash
# Check if port 3000 is already in use
lsof -i :3000
netstat -an | grep 3000

# If port in use, identify the process
lsof -ti :3000
ps aux | grep $(lsof -ti :3000)
```

**File permissions:**
```bash
# Check application directory permissions
ls -la /Users/chris/GitHub/MDL/

# Check log directory is writable
touch logs/test.log && rm logs/test.log
```

## Resolution Procedures

### Resolution 1: Simple Restart (Most Common)

**If service crashed or was stopped:**

```bash
# 1. Ensure no zombie processes
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 2

# 2. Start the application
cd /Users/chris/GitHub/MDL
npm run dev

# 3. Wait for startup (10-15 seconds)
sleep 15

# 4. Verify service is up
curl -i http://localhost:3000/health

# 5. Check logs for errors
tail -n 50 logs/app.log
```

**Expected output:**
```
HTTP/1.1 200 OK
{"status":"ok","timestamp":"2025-11-23T..."}
```

### Resolution 2: Clear Port Conflict

**If port is already in use:**

```bash
# 1. Find process using port 3000
PID=$(lsof -ti :3000)
echo "Process using port 3000: $PID"

# 2. Check what this process is
ps aux | grep $PID

# 3. Kill the process (if it's a stale MDL instance)
kill -9 $PID

# 4. Wait for port to be released
sleep 2

# 5. Verify port is free
lsof -i :3000

# 6. Start application
npm run dev

# 7. Verify
curl http://localhost:3000/health
```

### Resolution 3: Database Connection Issues

**If database is down or unreachable:**

```bash
# 1. Check database status
systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# 2. Start database if stopped
systemctl start postgresql  # Linux
brew services start postgresql  # macOS

# 3. Wait for database to be ready
sleep 5

# 4. Test connection
psql -h localhost -U mdl -d mdl -c "SELECT 1;"

# 5. If connection works, restart application
cd /Users/chris/GitHub/MDL
lsof -ti :3000 | xargs kill 2>/dev/null || true
npm run dev

# 6. Verify
curl http://localhost:3000/health
```

**If database connection configuration is wrong:**

```bash
# 1. Check .env DATABASE_URL
grep DATABASE_URL .env

# 2. Test the connection string
psql "$(grep DATABASE_URL .env | cut -d= -f2)" -c "SELECT 1;"

# 3. Fix if incorrect
nano .env  # Edit DATABASE_URL

# 4. Restart application
lsof -ti :3000 | xargs kill
npm run dev
```

### Resolution 4: Out of Memory Recovery

**If OOM killer terminated the process:**

```bash
# 1. Check memory status
free -h
dmesg | tail -n 50 | grep -i "out of memory"

# 2. Clear cache if needed (Linux)
sync && echo 3 > /proc/sys/vm/drop_caches

# 3. Check for memory leaks in application
# Review logs for gradual memory increase pattern

# 4. Restart with increased memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm run dev

# 5. Monitor memory usage
watch -n 5 'ps aux | grep node | awk "{print \$4, \$6}"'

# 6. If memory continues to grow, investigate leak
# (Add to prevention tasks)
```

### Resolution 5: Compilation or Dependency Errors

**If TypeScript compilation failed:**

```bash
# 1. Check build errors
npm run build 2>&1 | tee build-errors.log

# 2. If build fails, check for recent code changes
git status
git diff

# 3. Revert problematic changes if needed
git checkout -- [file]

# 4. Reinstall dependencies if corrupted
rm -rf node_modules package-lock.json
npm install

# 5. Rebuild
npm run build

# 6. Start application
npm run dev
```

**If module not found:**

```bash
# 1. Check error message for missing module
tail -n 100 logs/app.log | grep "Cannot find module"

# 2. Reinstall dependencies
npm install

# 3. Check for dependency conflicts
npm ls | grep -i "unmet\|missing"

# 4. Fix conflicts
npm install [missing-package]

# 5. Restart
npm run dev
```

### Resolution 6: Configuration Errors

**If configuration is invalid:**

```bash
# 1. Validate .env file
cat .env | grep -v "^#" | grep -v "^$"

# 2. Check for required variables
cat .env | grep -E "DATABASE_URL|PORT|NODE_ENV"

# 3. Fix missing or invalid variables
nano .env

# 4. Restart application
npm run dev

# 5. Check startup logs
tail -f logs/app.log
```

## Verification

After restart, verify service is healthy:

```bash
# 1. Check process is running
lsof -ti :3000
echo "Process ID: $(lsof -ti :3000)"

# 2. Check health endpoint (wait 15 seconds for startup)
sleep 15
curl -i http://localhost:3000/health

# 3. Check metrics endpoint
curl -s http://localhost:3000/metrics | head -n 10

# 4. Test critical API endpoints
curl -i http://localhost:3000/api/v1/metrics
curl -i http://localhost:3000/api/v1/domains

# 5. Check Prometheus can scrape
curl -s "http://localhost:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job=="mdl-api") | .health'

# 6. Monitor logs for errors
tail -f logs/app.log &
TAIL_PID=$!
sleep 30
kill $TAIL_PID

# 7. Check alert cleared
open http://localhost:9093/#/alerts
```

**Expected results:**
- ✅ Process running (PID returned)
- ✅ Health endpoint returns 200
- ✅ Metrics endpoint returns data
- ✅ API endpoints responding
- ✅ Prometheus target status: UP
- ✅ No errors in logs
- ✅ Alert resolved in Alertmanager

## Escalation

Escalate immediately if:
- Service cannot be restarted after 3 attempts
- Restart succeeds but service crashes again within 5 minutes
- Root cause requires infrastructure changes
- Hardware failure suspected

### Escalation Path

**Immediate escalation to Level 2:**
```
🚨 CRITICAL: API Instance Down - Cannot Restart

Attempts: [X/3]
Last Error: [error message]
Actions Taken:
1. [action] - [result]
2. [action] - [result]

Service Status: DOWN for [X] minutes
User Impact: Complete outage

Need immediate assistance with: [specific issue]
```

**Escalation to Level 3 if:**
- Outage > 15 minutes
- Customer communication required
- Business decision needed (e.g., switch to backup system)

## Prevention

### Immediate Actions (within 24 hours)

1. **Enable Process Manager:**
   ```bash
   # Install PM2 for automatic restarts
   npm install -g pm2
   
   # Start with PM2
   pm2 start npm --name "mdl-api" -- run dev
   pm2 save
   pm2 startup
   ```

2. **Add Health Check Monitoring:**
   - Configure external uptime monitoring (Uptime Robot, Pingdom)
   - Set up secondary alerting channel
   - Add deep health checks

3. **Increase Logging:**
   - Enable debug logging temporarily
   - Add process monitoring logs
   - Log all uncaught exceptions

4. **Set Up Crash Reporting:**
   ```javascript
   // Add to src/index.ts
   process.on('uncaughtException', (error) => {
     logger.error('Uncaught Exception:', error);
     // Send to error tracking service
   });
   
   process.on('unhandledRejection', (reason, promise) => {
     logger.error('Unhandled Rejection:', reason);
   });
   ```

### Short-term Prevention (within 1 week)

1. **Implement Graceful Shutdown:**
   - Handle SIGTERM and SIGINT
   - Close database connections
   - Drain in-flight requests
   - Exit cleanly

2. **Add Resource Limits:**
   ```bash
   # Set memory limits
   NODE_OPTIONS="--max-old-space-size=2048"
   
   # Set CPU limits (if using Docker)
   --cpus="2.0" --memory="2g"
   ```

3. **Database Connection Pooling:**
   - Configure connection pool properly
   - Add connection timeout
   - Implement connection retry logic
   - Monitor connection health

4. **Improve Startup Validation:**
   - Validate all dependencies on startup
   - Test database connection
   - Test Redis connection
   - Fail fast if critical dependency unavailable

5. **Add Circuit Breakers:**
   - Fail fast when dependencies down
   - Prevent cascade failures
   - Auto-recover when dependency returns

### Long-term Prevention (within 1 month)

1. **High Availability Setup:**
   - Deploy multiple instances
   - Add load balancer
   - Implement health checks in LB
   - Auto-remove unhealthy instances

2. **Automated Recovery:**
   - Kubernetes with readiness/liveness probes
   - Auto-restart on failure
   - Rolling deployments
   - Zero-downtime deployments

3. **Chaos Engineering:**
   - Regular failure injection tests
   - Practice recovery procedures
   - Validate monitoring and alerting
   - Build confidence in recovery

4. **Comprehensive Monitoring:**
   - Process monitoring (PM2, systemd)
   - Resource monitoring (memory, CPU, disk)
   - Dependency monitoring (database, cache)
   - Distributed tracing for debugging

5. **Disaster Recovery Plan:**
   - Document recovery procedures
   - Maintain runbooks
   - Regular disaster recovery drills
   - Backup and restore procedures

## Related Alerts

These alerts may fire before or after APIInstanceDown:

- **HighErrorRate** - Usually precedes instance down
- **HighMemoryUsage** - May indicate impending crash
- **DatabasePoolExhaustion** - Can cause crashes
- **SlowResponseTimes** - Service degrading before crash

## Post-Incident Checklist

Critical: Complete within 24 hours

- [ ] Document exact crash time and duration
- [ ] Identify root cause of crash
- [ ] Review logs before crash
- [ ] Check resource usage trends before crash
- [ ] Document restart procedure that worked
- [ ] Update this runbook with learnings
- [ ] Create tasks for all prevention items
- [ ] Test crash recovery procedure
- [ ] Update monitoring and alerting
- [ ] Communicate to stakeholders

## Additional Resources

- [Grafana Dashboard: Infrastructure](http://localhost:3001/d/mdl-infrastructure)
- [Prometheus Targets](http://localhost:9090/targets)
- [Application Logs](../../logs/app.log)
- [Process Management with PM2](https://pm2.keymetrics.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Last Updated:** November 23, 2025  
**Runbook Owner:** Platform Engineering Team  
**Review Schedule:** After each incident
