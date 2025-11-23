# Runbook: Low Cache Hit Rate

## Alert Details

- **Alert Name:** `LowCacheHitRate`
- **Severity:** ⚠️ **WARNING**
- **Threshold:** Cache hit rate < 50% for 10 minutes
- **Prometheus Expression:**
  ```promql
  (
    rate(cache_hits_total[5m]) 
    / 
    (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
  ) < 0.50
  ```

## Symptoms

- Increased database load
- Slower response times
- Higher latency on cached endpoints
- More database queries than usual

## Quick Check

```bash
# Current cache hit rate
curl -s "http://localhost:9090/api/v1/query?query=rate(cache_hits_total[5m])/(rate(cache_hits_total[5m])+rate(cache_misses_total[5m]))" | jq '.data.result[0].value[1]'

# Cache size
curl -s http://localhost:3000/metrics | grep "cache_size"

# Redis status (if enabled)
redis-cli INFO stats | grep hits
redis-cli INFO memory | grep used_memory_human
```

## Diagnosis

### Common Causes

1. **Cache Recently Cleared/Restarted**
   - Normal after Redis restart
   - Wait 10-15 minutes for warmup

2. **TTL Too Short**
   - Check cache expiration settings
   - Review if TTL matches access patterns

3. **Cache Eviction**
   ```bash
   redis-cli INFO stats | grep evicted_keys
   ```
   - Memory full, evicting entries
   - Need to increase Redis memory

4. **Access Pattern Changed**
   - New queries not cached
   - Data invalidation too aggressive

## Resolution

### If Redis Restarted

```bash
# Just wait for cache to warm up
watch -n 30 'curl -s "http://localhost:9090/api/v1/query?query=rate(cache_hits_total[5m])/(rate(cache_hits_total[5m])+rate(cache_misses_total[5m]))" | jq ".data.result[0].value[1]"'

# Warm cache manually (optional)
curl http://localhost:3000/api/v1/metrics
curl http://localhost:3000/api/v1/domains
curl http://localhost:3000/api/v1/objectives
```

### If Memory Full

```bash
# Check Redis memory
redis-cli INFO memory

# Increase maxmemory
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Or edit redis.conf permanently
# maxmemory 512mb
# maxmemory-policy allkeys-lru
```

### If TTL Too Short

```typescript
// Edit cache configuration
// src/cache/CacheService.ts or .env
const DEFAULT_TTL = 3600; // Increase from 300 to 3600 (1 hour)

// Restart application
```

### If Access Patterns Changed

1. Review which keys are being missed:
   ```bash
   tail -n 500 logs/app.log | grep "cache miss"
   ```

2. Add caching for new hot endpoints:
   ```typescript
   // Add cache wrapper to new endpoints
   app.get('/api/v1/new-endpoint', cacheMiddleware(300), handler);
   ```

## Prevention

- Right-size Redis memory
- Monitor cache metrics regularly
- Tune TTL based on data volatility
- Implement cache warming on startup
- Use tiered caching (memory + Redis)
- Monitor eviction rate

**See Also:** [slow-response-times.md](./slow-response-times.md)

---
**Last Updated:** November 23, 2025
