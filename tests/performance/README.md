# Performance Load Tests

This directory contains k6 load test scenarios for the MDL API. These tests are part of Phase 2C Task 5: Load Testing & Optimization.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

## Test Scenarios

### 1. Steady State Test (`steady-state.js`)

Tests normal production load over an extended period.

**Profile:**
- Ramp up: 5 minutes to 100 users
- Steady: 30 minutes at 100 users
- Ramp down: 5 minutes to 0 users

**Thresholds:**
- p95 response time < 200ms
- p99 response time < 500ms
- Error rate < 1%
- Cache hit rate > 80%

**Run:**
```bash
k6 run tests/performance/steady-state.js
```

### 2. Spike Test (`spike-test.js`)

Tests system behavior under sudden traffic spikes.

**Profile:**
- Normal load (10 users)
- Spike to 500 users (instant)
- Hold for 5 minutes
- Drop back to 10 users
- Spike to 1000 users (instant)
- Hold for 3 minutes
- Ramp down

**Thresholds:**
- p95 response time < 500ms
- p99 response time < 1000ms
- Error rate < 5% (more relaxed)

**Run:**
```bash
k6 run tests/performance/spike-test.js
```

### 3. Stress Test (`stress-test.js`)

Finds the system's breaking point by gradually increasing load.

**Profile:**
- Start at 100 users
- Gradually increase to 1500 users over 20 minutes
- Hold at 1500 for 5 minutes
- Ramp down

**Thresholds:**
- p95 response time < 1000ms
- p99 response time < 2000ms
- Error rate < 10%

**Run:**
```bash
k6 run tests/performance/stress-test.js
```

### 4. Soak Test (`soak-test.js`)

Tests system stability over extended periods (2 hours).

**Profile:**
- Ramp up: 10 minutes to 200 users
- Soak: 2 hours at 200 users
- Ramp down: 10 minutes

**Purpose:**
- Identify memory leaks
- Detect performance degradation
- Test cache effectiveness over time
- Verify connection pool stability

**Run:**
```bash
k6 run tests/performance/soak-test.js
```

## Configuration

### Environment Variables

Set these before running tests:

```bash
# Base URL (default: http://localhost:3000)
export BASE_URL=http://localhost:3000

# Authentication token (if auth enabled)
export AUTH_TOKEN=your_token_here
```

### Running with Custom Configuration

```bash
# Run with custom base URL
k6 run -e BASE_URL=https://api.production.com tests/performance/steady-state.js

# Run with authentication
k6 run -e AUTH_TOKEN=eyJhbGc... tests/performance/steady-state.js

# Run with both
k6 run -e BASE_URL=https://api.staging.com -e AUTH_TOKEN=eyJhbGc... tests/performance/steady-state.js
```

## Output and Reporting

### Console Output

k6 provides real-time metrics during test execution:

```
     ✓ status is 200
     ✓ has data
     
     cache_hits......................: 84.32% 
     cache_misses....................: 15.68%
     errors..........................: 0.42%
     http_req_duration...............: avg=156ms min=23ms med=142ms max=987ms p(90)=178ms p(95)=195ms
     http_reqs.......................: 45234 requests
     vus............................: 100 min=0 max=100
```

### HTML Report

Generate detailed HTML reports:

```bash
k6 run --out json=results.json tests/performance/steady-state.js
```

Then convert to HTML using k6 reporter tools or custom scripts.

### Cloud Results

Send results to k6 Cloud for advanced analytics:

```bash
k6 login cloud
k6 run --out cloud tests/performance/steady-state.js
```

## Interpreting Results

### Success Criteria

✅ **PASS** - All thresholds met
- Response times within limits
- Error rate below threshold
- Cache hit rate above target
- No memory leaks (soak test)

⚠️ **WARNING** - Some thresholds exceeded
- Investigate bottlenecks
- Review server logs
- Check resource utilization

❌ **FAIL** - Critical thresholds exceeded
- System cannot handle load
- Optimization required
- Scale resources or improve code

### Key Metrics

**Response Time (http_req_duration):**
- p50 (median): Should be consistently low
- p95: 95% of requests faster than this
- p99: 99% of requests faster than this
- max: Worst case scenario

**Error Rate:**
- Should be < 1% under normal load
- Can spike during stress tests
- Investigate 4xx and 5xx separately

**Cache Hit Rate:**
- Should be > 80% for steady state
- Lower for first requests after startup
- Should remain stable during soak test

**Virtual Users (VUs):**
- Shows current load
- Compare with target in stages

## Troubleshooting

### Server Not Responding

```bash
# Check server is running
curl http://localhost:3000/health

# Restart server
npm run dev
```

### k6 Connection Errors

```bash
# Verify connectivity
ping localhost

# Check firewall settings
# Ensure port 3000 is accessible
```

### Memory Issues During Tests

```bash
# Monitor server memory
watch -n 1 'ps aux | grep node'

# Check k6 memory usage
k6 run --no-connection-reuse tests/performance/steady-state.js
```

### High Error Rates

1. Check server logs for errors
2. Verify database connection
3. Check Redis connection (if caching enabled)
4. Review recent code changes
5. Monitor system resources (CPU, memory, disk)

## Best Practices

### Before Running Tests

1. ✅ Ensure server is running and healthy
2. ✅ Clear logs and metrics
3. ✅ Verify database has test data
4. ✅ Enable Redis cache if testing cache performance
5. ✅ Close unnecessary applications
6. ✅ Document baseline performance

### During Tests

1. 📊 Monitor server metrics in real-time
2. 📊 Watch for error spikes
3. 📊 Check memory usage trends
4. 📊 Observe cache hit rates
5. 📊 Review response time percentiles

### After Tests

1. 📝 Document results
2. 📝 Compare with previous runs
3. 📝 Identify bottlenecks
4. 📝 Create optimization tasks
5. 📝 Update baselines

## Performance Targets

Based on Phase 2C requirements:

| Metric | Target | Critical |
|--------|--------|----------|
| Concurrent Users | 1000+ | 500+ |
| p95 Response Time | < 200ms | < 500ms |
| p99 Response Time | < 500ms | < 1000ms |
| Error Rate | < 1% | < 5% |
| Cache Hit Rate | > 80% | > 60% |
| Throughput | 2000+ req/s | 1000+ req/s |

## Next Steps

After completing load tests:

1. **Analyze Results** - Review all metrics and identify bottlenecks
2. **Optimize Code** - Address performance issues found
3. **Scale Resources** - Add servers if needed
4. **Re-test** - Verify improvements
5. **Document** - Update performance baselines
6. **Monitor** - Set up continuous performance monitoring

## Related Documentation

- [PHASE_2C_PERFORMANCE.md](../../PHASE_2C_PERFORMANCE.md) - Overall Phase 2C plan
- [TASK_5_COMPLETE.md](../../TASK_5_COMPLETE.md) - Task 5 completion summary
- [Performance Monitoring Middleware](../../src/middleware/performance.ts)

## Support

For issues or questions:
- Check server logs: `tail -f logs/mdl.log`
- Review k6 documentation: https://k6.io/docs/
- Check API health: `curl http://localhost:3000/api/performance/stats`
