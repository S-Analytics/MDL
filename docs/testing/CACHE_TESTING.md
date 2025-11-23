# Cache Implementation Testing Guide

## Overview

Phase 2C Tasks 1.1-1.3 have been completed, implementing a full Redis caching layer with middleware integration.

## What's Implemented

### 1. Redis Cache Infrastructure (Task 1.1)
- ✅ Redis 8.4.0 installed and running
- ✅ ioredis client configured with TypeScript support
- ✅ Environment-based configuration (`.env`)
- ✅ Connection retry logic with exponential backoff
- ✅ Cache service with full CRUD operations

### 2. Cache Service (Task 1.2)
- ✅ Singleton CacheService class
- ✅ Methods: `get()`, `set()`, `delete()`, `deletePattern()`, `clear()`, `healthCheck()`, `getStats()`
- ✅ Event handlers for Redis connection lifecycle
- ✅ Comprehensive error handling and logging

### 3. Cache Middleware (Task 1.3)
- ✅ Cache middleware for GET requests
- ✅ Cache invalidation middleware for write operations
- ✅ X-Cache headers (HIT/MISS)
- ✅ X-Cache-Key header for debugging
- ✅ User-specific cache keys
- ✅ Query parameter differentiation

## Testing the Implementation

### Prerequisites

Ensure Redis is running:
```bash
brew services list | grep redis
# Should show: redis  started

# Or check with ping:
redis-cli ping
# Should return: PONG
```

### 1. Unit Tests - Cache Service

Test the cache service in isolation:

```bash
npm run build
npx ts-node scripts/test-cache.ts
```

Expected output:
```
✅ All cache tests completed!
- Health check: HEALTHY
- Set and Get: Match ✅
- Cache miss: NULL ✅
- Delete: NULL after delete ✅
- Pattern operations: 3 keys deleted ✅
- Cache stats: Working ✅
```

### 2. Manual Cache Test

Verify Redis storage:

```bash
npx ts-node scripts/manual-cache-test.ts
redis-cli --scan --pattern "mdl:*"
redis-cli GET "mdl:manual:test"
```

### 3. Integration Tests - Cache Middleware

Test cache middleware with live API:

**Step 1: Start the server**
```bash
npm run dev
```

**Step 2: Run cache integration tests**
```bash
npx ts-node tests/cache-integration.test.ts
```

Expected output:
```
🧪 Test 1: Cache HIT/MISS behavior
   First request X-Cache: MISS
   Second request X-Cache: HIT
   ✅ Cache HIT/MISS working correctly

🧪 Test 2: X-Cache-Key header presence
   X-Cache-Key: /api/v1/metrics:anonymous:{}
   ✅ X-Cache-Key header present

🧪 Test 3: Query parameter differentiation
   First request (category=operational) X-Cache: MISS
   Second request (category=operational) X-Cache: HIT
   Third request (category=strategic) X-Cache: MISS
   ✅ Query parameter caching working correctly

🧪 Test 4: Single metric endpoint caching
   Testing with metric ID: metric_001
   First request X-Cache: MISS
   Second request X-Cache: HIT
   ✅ Single metric caching working correctly

📊 Test Summary: 4 passed, 0 failed
✅ All cache middleware tests passed!
```

### 4. Manual API Testing with curl

**Test cache HIT/MISS:**
```bash
# First request (MISS)
curl -i http://localhost:3000/api/v1/metrics | grep X-Cache
# Expected: X-Cache: MISS

# Second request (HIT)
curl -i http://localhost:3000/api/v1/metrics | grep X-Cache
# Expected: X-Cache: HIT
```

**Test cache invalidation:**
```bash
# GET a metric (creates cache)
curl http://localhost:3000/api/v1/metrics/metric_001

# GET again (should HIT)
curl -i http://localhost:3000/api/v1/metrics/metric_001 | grep X-Cache
# Expected: X-Cache: HIT

# Update the metric (invalidates cache)
curl -X PUT http://localhost:3000/api/v1/metrics/metric_001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Updated Metric"}'

# GET again (should MISS after invalidation)
curl -i http://localhost:3000/api/v1/metrics/metric_001 | grep X-Cache
# Expected: X-Cache: MISS
```

**Test query parameter caching:**
```bash
# Different query params create different cache keys
curl -i http://localhost:3000/api/v1/metrics?category=operational | grep X-Cache
curl -i http://localhost:3000/api/v1/metrics?category=strategic | grep X-Cache
```

### 5. Monitor Redis Cache

**View all cached keys:**
```bash
redis-cli --scan --pattern "mdl:*"
```

**Get cache statistics:**
```bash
redis-cli INFO stats
```

**View specific cache entry:**
```bash
redis-cli GET "mdl:/api/v1/metrics:anonymous:{}"
```

**Clear all cache:**
```bash
redis-cli FLUSHDB
```

## Cache Configuration

Located in `.env`:

```bash
# Cache Configuration
ENABLE_CACHE=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=300        # Default TTL: 5 minutes
CACHE_MAX_TTL=3600   # Max TTL: 1 hour
```

## Cache TTLs by Route

| Route | TTL | Reason |
|-------|-----|--------|
| GET /api/v1/metrics | 300s (5 min) | List changes frequently |
| GET /api/v1/metrics/:id | 600s (10 min) | Single metric is more stable |
| GET /api/v1/metrics/:id/policy | 600s (10 min) | Policy generation is expensive |

## Cache Key Format

Format: `mdl:{path}:{userId}:{sortedQuery}`

Examples:
- `mdl:/api/v1/metrics:anonymous:{}`
- `mdl:/api/v1/metrics:user123:{"category":"operational"}`
- `mdl:/api/v1/metrics/metric_001:anonymous:{}`

## Cache Invalidation Patterns

Write operations invalidate cache with pattern: `mdl:*metrics*`

This matches:
- `mdl:/api/v1/metrics:*:*` (all metrics lists)
- `mdl:/api/v1/metrics/*:*:*` (all single metrics)
- Any other metrics-related cache entries

## Troubleshooting

### Redis not connecting

**Check if Redis is running:**
```bash
brew services list | grep redis
```

**Start Redis:**
```bash
brew services start redis
```

**Check Redis logs:**
```bash
tail -f /usr/local/var/log/redis.log
```

### Cache always MISS

**Check ENABLE_CACHE in .env:**
```bash
grep ENABLE_CACHE .env
# Should be: ENABLE_CACHE=true
```

**Check Redis connection:**
```bash
npx ts-node scripts/test-cache.ts
```

### Server errors with cache

Cache middleware is designed to fail gracefully. If cache operations fail, the request continues normally without caching.

Check logs for cache errors:
```bash
npm run dev | grep -i cache
```

## Performance Expectations

With caching enabled:

- **Cache HIT**: < 10ms response time (Redis lookup only)
- **Cache MISS**: Normal database query time (200-500ms)
- **Cache Hit Rate**: Target 80%+ for GET /metrics
- **Memory Usage**: ~1-2MB for typical dataset

## Next Steps

Task 1.4: Implement Cache Warming
- Pre-populate cache with frequently accessed data
- Warm cache on application startup
- Schedule periodic cache warming

Task 2: Database Optimization
- Add database indexes
- Optimize slow queries
- Query result caching

## Files Created/Modified

### New Files
- `src/middleware/cache.ts` - Cache middleware implementation
- `tests/cache-integration.test.ts` - Integration tests

### Modified Files  
- `src/api/routes/v1/metrics.ts` - Added cache middleware to routes
- `PHASE_2C_PERFORMANCE.md` - Updated task status

## Resources

- Redis Documentation: https://redis.io/docs/
- ioredis API: https://github.com/redis/ioredis
- Phase 2C Plan: `PHASE_2C_PERFORMANCE.md`
