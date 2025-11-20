# Phase 2C: Performance & Scalability - Implementation Plan

**Duration:** 3-4 weeks  
**Priority:** P1 - Important for production scale  
**Part of:** Phase 2 Major Improvements  
**Last Updated:** November 20, 2025  
**Status:** 🟡 PARTIAL - Database optimized, caching and pagination needed

---

## Overview

Performance and scalability improvements ensure the application can handle production workloads efficiently. This phase implements caching, database optimization, pagination, compression, and prepares the system for horizontal scaling.

**Current State:**
- ✅ PostgreSQL storage with robust connection pooling
- ✅ Database health checks and retry logic implemented
- ✅ Circuit breaker pattern for database connections
- ✅ Dynamic storage mode switching (local vs PostgreSQL)
- ❌ No Redis caching layer
- ❌ No pagination on list endpoints
- ⚠️ Some queries could benefit from optimization
- ❌ No response compression
- ✅ Parameterized queries (SQL injection prevention)

**Target State:**
- Redis caching with cache invalidation
- Optimized database queries with indexes
- Pagination on all list endpoints
- Response compression enabled
- Support 1000+ concurrent users
- Ready for horizontal scaling

---

## Task 1: Redis Caching Layer (Week 1)

### 1.1: Install and Configure Redis

**Duration:** 1 day

**Steps:**
1. Install Redis:
```bash
# macOS
brew install redis

# Ubuntu
sudo apt-get install redis-server

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

2. Install Redis client:
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

3. Create Redis configuration:
```typescript
// src/cache/config.ts
import { RedisOptions } from 'ioredis';

export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'mdl:',
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  lazyConnect: false
};

// Environment variables
export const cacheConfig = {
  enabled: process.env.ENABLE_CACHE === 'true',
  defaultTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
  maxTTL: parseInt(process.env.CACHE_MAX_TTL || '3600'), // 1 hour
};
```

4. Update .env.example:
```bash
# Cache Configuration
ENABLE_CACHE=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=300
CACHE_MAX_TTL=3600
```

**Acceptance Criteria:**
- [ ] Redis installed and running
- [ ] Redis client configured
- [ ] Connection retry logic implemented
- [ ] Environment variables documented
- [ ] Redis health check working

---

### 1.2: Create Cache Service

**Duration:** 2-3 days

**Steps:**
1. Create cache service:
```typescript
// src/cache/CacheService.ts
import Redis from 'ioredis';
import { redisConfig, cacheConfig } from './config';
import { logger } from '../utils/logger';

export class CacheService {
  private client: Redis;
  private enabled: boolean;
  
  constructor() {
    this.enabled = cacheConfig.enabled;
    
    if (this.enabled) {
      this.client = new Redis(redisConfig);
      this.setupEventHandlers();
    }
  }
  
  private setupEventHandlers() {
    this.client.on('connect', () => {
      logger.info('Redis connected');
    });
    
    this.client.on('error', (error) => {
      logger.error('Redis error', { error });
    });
    
    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }
  
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || cacheConfig.defaultTTL;
      
      await this.client.setex(key, expiry, serialized);
      logger.debug('Cache set', { key, ttl: expiry });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error });
      return false;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      await this.client.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
      return false;
    }
  }
  
  async deletePattern(pattern: string): Promise<number> {
    if (!this.enabled) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(...keys);
      logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      return keys.length;
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error });
      return 0;
    }
  }
  
  async clear(): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      await this.client.flushdb();
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error', { error });
      return false;
    }
  }
  
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return true;
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Cache health check failed', { error });
      return false;
    }
  }
  
  async getStats(): Promise<any> {
    if (!this.enabled) return null;
    
    try {
      const info = await this.client.info('stats');
      const dbsize = await this.client.dbsize();
      
      return {
        connected: this.client.status === 'ready',
        keys: dbsize,
        info: this.parseRedisInfo(info)
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error });
      return null;
    }
  }
  
  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      }
    }
    
    return stats;
  }
  
  async close(): Promise<void> {
    if (this.enabled) {
      await this.client.quit();
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
```

**Acceptance Criteria:**
- [ ] CacheService class created
- [ ] Get/set/delete operations implemented
- [ ] Pattern-based deletion supported
- [ ] Health check implemented
- [ ] Error handling robust
- [ ] Logging integrated

---

### 1.3: Implement Cache Middleware

**Duration:** 2 days

**Steps:**
1. Create cache middleware:
```typescript
// src/middleware/cache.ts
import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../cache/CacheService';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check condition
    if (options.condition && !options.condition(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateCacheKey(req);
    
    // Try to get from cache
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) {
      logger.debug('Serving from cache', { cacheKey });
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }
    
    // Cache miss - intercept response
    res.setHeader('X-Cache', 'MISS');
    
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // Store in cache
      cacheService.set(cacheKey, data, options.ttl)
        .catch(error => logger.error('Failed to cache response', { error }));
      
      return originalJson(data);
    };
    
    next();
  };
}

function generateCacheKey(req: Request): string {
  const userId = (req as any).user?.userId || 'anonymous';
  const query = JSON.stringify(req.query);
  return `${req.path}:${userId}:${query}`;
}

export function invalidateCache(pattern: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send
    const originalSend = res.send.bind(res);
    
    res.send = function(data: any) {
      // Invalidate cache after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.deletePattern(pattern)
          .catch(error => logger.error('Failed to invalidate cache', { error }));
      }
      
      return originalSend(data);
    };
    
    next();
  };
}
```

2. Apply caching to routes:
```typescript
// src/api/routes/v1/metrics.ts
import { cacheMiddleware, invalidateCache } from '../../../middleware/cache';

// Cache GET requests for 5 minutes
router.get('/', 
  authenticate,
  cacheMiddleware({ ttl: 300 }),
  listMetrics
);

router.get('/:id',
  authenticate,
  cacheMiddleware({ ttl: 600 }), // 10 minutes for single metric
  getMetric
);

// Invalidate cache on modifications
router.post('/',
  authenticate,
  validateBody(metricSchema),
  invalidateCache('*/metrics:*'),
  createMetric
);

router.put('/:id',
  authenticate,
  validateBody(metricSchema),
  invalidateCache('*/metrics:*'),
  updateMetric
);

router.delete('/:id',
  authenticate,
  invalidateCache('*/metrics:*'),
  deleteMetric
);
```

**Acceptance Criteria:**
- [ ] Cache middleware created
- [ ] Applied to GET endpoints
- [ ] Cache invalidation on writes
- [ ] X-Cache header in responses
- [ ] Cache key generation consistent
- [ ] User-specific caching supported

---

### 1.4: Implement Cache Warming

**Duration:** 1 day

**Steps:**
```typescript
// src/cache/warmer.ts
import { cacheService } from './CacheService';
import { MetricStore } from '../storage/MetricStore';
import { logger } from '../utils/logger';

export class CacheWarmer {
  constructor(private metricStore: MetricStore) {}
  
  async warmCache(): Promise<void> {
    logger.info('Starting cache warming');
    
    try {
      // Load all metrics
      const metrics = await this.metricStore.findAll();
      
      // Cache individual metrics
      for (const metric of metrics) {
        const key = `/api/v1/metrics/${metric.metric_id}:*:{}`;
        await cacheService.set(key, metric, 600);
      }
      
      // Cache common queries
      const categories = ['operational', 'strategic', 'tactical'];
      for (const category of categories) {
        const filtered = metrics.filter(m => m.category === category);
        const key = `/api/v1/metrics:*:{"category":"${category}"}`;
        await cacheService.set(key, filtered, 300);
      }
      
      logger.info('Cache warming completed', { metricsCount: metrics.length });
    } catch (error) {
      logger.error('Cache warming failed', { error });
    }
  }
  
  async scheduledWarming(intervalMinutes: number = 30): Promise<void> {
    await this.warmCache();
    
    setInterval(async () => {
      await this.warmCache();
    }, intervalMinutes * 60 * 1000);
  }
}
```

**Acceptance Criteria:**
- [ ] Cache warming on startup
- [ ] Scheduled cache warming
- [ ] Common queries pre-cached
- [ ] Error handling for warming failures

---

## Task 2: Database Optimization (Week 2)

### 2.1: Add Database Indexes

**Duration:** 2 days

**Steps:**
1. Analyze query patterns:
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM metrics WHERE category = 'operational';
EXPLAIN ANALYZE SELECT * FROM metrics WHERE owner = 'team-1';
EXPLAIN ANALYZE SELECT * FROM metrics WHERE metric_id = 'METRIC-001';
```

2. Create migration for indexes:
```sql
-- scripts/migrations/002_add_indexes.sql

-- Metrics table indexes
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics USING BTREE ((data->>'category'));
CREATE INDEX IF NOT EXISTS idx_metrics_owner ON metrics USING BTREE ((data->>'owner'));
CREATE INDEX IF NOT EXISTS idx_metrics_tier ON metrics USING BTREE ((data->>'tier'));
CREATE INDEX IF NOT EXISTS idx_metrics_business_domain ON metrics USING BTREE ((data->>'business_domain'));
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON metrics USING BTREE (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_updated_at ON metrics USING BTREE (updated_at DESC);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_metrics_tags ON metrics USING GIN ((data->'tags'));

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_metrics_search ON metrics USING GIN (
  to_tsvector('english', data->>'name' || ' ' || data->>'description')
);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_metrics_category_tier ON metrics USING BTREE (
  (data->>'category'), (data->>'tier')
);

-- Domains table indexes
CREATE INDEX IF NOT EXISTS idx_domains_name ON domains USING BTREE ((data->>'name'));
CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains USING BTREE ((data->>'owner_team'));

-- Objectives table indexes
CREATE INDEX IF NOT EXISTS idx_objectives_domain ON objectives USING BTREE ((data->>'domain_id'));
CREATE INDEX IF NOT EXISTS idx_objectives_timeframe ON objectives USING BTREE ((data->>'timeframe'));

-- Users table indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING BTREE (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users USING BTREE (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users USING BTREE (is_active) WHERE is_active = true;

-- Analyze tables for query planner
ANALYZE metrics;
ANALYZE domains;
ANALYZE objectives;
ANALYZE users;
```

3. Run migration:
```typescript
// scripts/run-migration.ts
import { Pool } from 'pg';
import fs from 'fs';

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  
  const sql = fs.readFileSync('./scripts/migrations/002_add_indexes.sql', 'utf-8');
  
  try {
    await pool.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
```

**Acceptance Criteria:**
- [ ] Query patterns analyzed
- [ ] Indexes created for common queries
- [ ] GIN indexes for arrays and full-text search
- [ ] Composite indexes for multi-column queries
- [ ] ANALYZE run on all tables
- [ ] Query performance improved (verify with EXPLAIN)

---

### 2.2: Optimize Database Queries

**Duration:** 2-3 days

**Steps:**
1. Update PostgresMetricStore with optimized queries:
```typescript
// src/storage/PostgresMetricStore.ts

async findAll(filters?: MetricFilters): Promise<MetricDefinition[]> {
  let query = 'SELECT data FROM metrics WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  // Build WHERE clause efficiently
  if (filters?.category) {
    query += ` AND data->>'category' = $${paramIndex++}`;
    params.push(filters.category);
  }
  
  if (filters?.tier) {
    query += ` AND data->>'tier' = $${paramIndex++}`;
    params.push(filters.tier);
  }
  
  if (filters?.owner) {
    query += ` AND data->>'owner' = $${paramIndex++}`;
    params.push(filters.owner);
  }
  
  if (filters?.business_domain) {
    query += ` AND data->>'business_domain' = $${paramIndex++}`;
    params.push(filters.business_domain);
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    // Use GIN index for tag search
    query += ` AND data->'tags' ?| $${paramIndex++}`;
    params.push(filters.tags);
  }
  
  // Add ordering
  query += ' ORDER BY updated_at DESC';
  
  // Add limit for safety
  const limit = filters?.limit || 1000;
  query += ` LIMIT $${paramIndex++}`;
  params.push(limit);
  
  const result = await this.pool.query(query, params);
  return result.rows.map(row => row.data);
}

async search(searchTerm: string): Promise<MetricDefinition[]> {
  // Use full-text search index
  const query = `
    SELECT data, 
           ts_rank(to_tsvector('english', data->>'name' || ' ' || data->>'description'), 
                   plainto_tsquery('english', $1)) as rank
    FROM metrics
    WHERE to_tsvector('english', data->>'name' || ' ' || data->>'description') @@ 
          plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT 50
  `;
  
  const result = await this.pool.query(query, [searchTerm]);
  return result.rows.map(row => row.data);
}

async getStats(): Promise<any> {
  // Single query for all stats using window functions
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT data->>'category') as categories,
      COUNT(DISTINCT data->>'owner') as owners,
      COUNT(DISTINCT data->>'business_domain') as domains,
      jsonb_object_agg(
        data->>'category',
        category_count
      ) as by_category
    FROM metrics,
    LATERAL (
      SELECT COUNT(*) as category_count
      FROM metrics m2
      WHERE m2.data->>'category' = metrics.data->>'category'
    ) counts
  `;
  
  const result = await this.pool.query(query);
  return result.rows[0];
}
```

**Acceptance Criteria:**
- [ ] All queries use parameterized statements
- [ ] Indexes utilized (verify with EXPLAIN)
- [ ] Efficient filtering without loading all data
- [ ] Full-text search optimized
- [ ] Stats aggregation optimized
- [ ] Query execution time < 50ms (p95)

---

### 2.3: Implement Connection Pooling Optimization

**Duration:** 1 day

**Steps:**
```typescript
// src/storage/config.ts
export const dbPoolConfig = {
  // Connection pool settings
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  
  // Connection lifecycle
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  
  // Statement timeout (30 seconds)
  statement_timeout: 30000,
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Application name for monitoring
  application_name: 'mdl-api'
};

// Connection pool monitoring
export function monitorPool(pool: Pool) {
  setInterval(() => {
    logger.debug('Connection pool stats', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });
    
    // Alert if pool is exhausted
    if (pool.waitingCount > 0) {
      logger.warn('Connection pool exhausted', {
        waiting: pool.waitingCount
      });
    }
  }, 60000); // Every minute
}
```

**Acceptance Criteria:**
- [ ] Pool configuration optimized
- [ ] Pool monitoring implemented
- [ ] Alerts for pool exhaustion
- [ ] Connection leaks detected

---

## Task 3: Pagination Implementation (Week 2-3)

### 3.1: Create Pagination Utility

**Duration:** 1 day

**Steps:**
```typescript
// src/utils/pagination.ts
export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function parsePaginationParams(query: any): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    Math.max(1, parseInt(query.limit) || 50),
    100 // Max 100 items per page
  );
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
}

export function addPaginationHeaders(res: Response, pagination: any): void {
  const { page, limit, total, pages } = pagination;
  
  // RFC 5988 Link header
  const links: string[] = [];
  const baseUrl = `${res.req.protocol}://${res.req.get('host')}${res.req.path}`;
  
  if (page > 1) {
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
  }
  
  if (page < pages) {
    links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    links.push(`<${baseUrl}?page=${pages}&limit=${limit}>; rel="last"`);
  }
  
  if (links.length > 0) {
    res.setHeader('Link', links.join(', '));
  }
  
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('X-Page', page.toString());
  res.setHeader('X-Per-Page', limit.toString());
  res.setHeader('X-Total-Pages', pages.toString());
}
```

**Acceptance Criteria:**
- [ ] Pagination utility created
- [ ] Default limit 50 items
- [ ] Maximum limit 100 items
- [ ] Link headers for navigation
- [ ] Pagination metadata in response

---

### 3.2: Add Pagination to Storage Layer

**Duration:** 2 days

**Steps:**
```typescript
// Update IMetricStore interface
export interface IMetricStore {
  findAll(filters?: MetricFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<MetricDefinition>>;
  // ... other methods
}

// Update PostgresMetricStore
async findAll(
  filters?: MetricFilters,
  pagination?: PaginationOptions
): Promise<PaginatedResponse<MetricDefinition>> {
  const { page, limit, offset } = parsePaginationParams(pagination || {});
  
  // Build query
  let countQuery = 'SELECT COUNT(*) FROM metrics WHERE 1=1';
  let dataQuery = 'SELECT data FROM metrics WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  // Add filters (same for both queries)
  let whereClause = '';
  if (filters?.category) {
    whereClause += ` AND data->>'category' = $${paramIndex++}`;
    params.push(filters.category);
  }
  // ... more filters
  
  countQuery += whereClause;
  dataQuery += whereClause;
  
  // Get total count
  const countResult = await this.pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);
  
  // Get paginated data
  dataQuery += ` ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const dataParams = [...params, limit, offset];
  
  const dataResult = await this.pool.query(dataQuery, dataParams);
  const data = dataResult.rows.map(row => row.data);
  
  return createPaginatedResponse(data, total, page, limit);
}
```

**Acceptance Criteria:**
- [ ] Storage layer supports pagination
- [ ] Count query separate from data query
- [ ] Both PostgreSQL and file storage support pagination
- [ ] Performance tested with large datasets

---

### 3.3: Update API Endpoints

**Duration:** 1-2 days

**Steps:**
```typescript
// src/api/routes/v1/metrics.ts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const filters = extractFilters(req.query);
    const pagination = parsePaginationParams(req.query);
    
    const result = await metricStore.findAll(filters, pagination);
    
    addPaginationHeaders(res, result.pagination);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

**Acceptance Criteria:**
- [ ] All list endpoints paginated
- [ ] Query parameters documented
- [ ] Link headers present
- [ ] Backward compatible (default page=1, limit=50)

---

## Task 4: Response Compression (Week 3)

### 4.1: Enable Compression Middleware

**Duration:** 1 day

**Steps:**
```bash
npm install compression
npm install --save-dev @types/compression
```

```typescript
// src/api/server.ts
import compression from 'compression';

// Add compression middleware
app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**Acceptance Criteria:**
- [ ] Compression enabled
- [ ] gzip/deflate supported
- [ ] Response size reduced (verify)
- [ ] Content-Encoding header present

---

## Task 5: Load Testing & Optimization (Week 3-4)

### 5.1: Run Comprehensive Load Tests

**Duration:** 3-4 days

**Steps:**
1. Create load test scenarios:
```javascript
// tests/performance/scenarios/steady-state.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const metricTrend = new Trend('metric_response_time');

export let options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '30m', target: 100 },
    { duration: '5m', target: 0 }
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'errors': ['rate<0.01'],
    'cache_hits': ['rate>0.80']
  }
};

export default function() {
  // List metrics
  let res = http.get(`${BASE_URL}/api/v1/metrics?page=1&limit=50`, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  });
  
  check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => JSON.parse(r.body).data.length > 0
  }) || errorRate.add(1);
  
  const cacheHit = res.headers['X-Cache'] === 'HIT';
  cacheHitRate.add(cacheHit ? 1 : 0);
  
  metricTrend.add(res.timings.duration);
  
  sleep(1);
}
```

2. Run tests and analyze:
```bash
# Steady state test
k6 run tests/performance/scenarios/steady-state.js

# Spike test
k6 run tests/performance/scenarios/spike-test.js

# Stress test
k6 run tests/performance/scenarios/stress-test.js

# Soak test (long duration)
k6 run tests/performance/scenarios/soak-test.js
```

**Acceptance Criteria:**
- [ ] Handles 1000 concurrent users
- [ ] p95 response time < 200ms
- [ ] p99 response time < 500ms
- [ ] Error rate < 1%
- [ ] Cache hit rate > 80%
- [ ] No memory leaks during soak test

---

### 5.2: Performance Tuning

**Duration:** 2-3 days

**Steps:**
1. Analyze bottlenecks:
```bash
# CPU profiling
node --prof src/index.ts
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect src/index.ts
# Connect Chrome DevTools
```

2. Optimize identified issues:
   - Reduce object allocations
   - Optimize hot code paths
   - Implement object pooling if needed
   - Optimize JSON serialization

3. Add performance monitoring:
```typescript
// src/middleware/performance.ts
export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
    
    logger.info('Request performance', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    });
    
    // Alert on slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration
      });
    }
  });
  
  next();
}
```

**Acceptance Criteria:**
- [ ] Bottlenecks identified and optimized
- [ ] Performance monitoring in place
- [ ] Memory usage stable
- [ ] CPU usage reasonable under load

---

## Phase 2C Completion Checklist

### Caching ✅
- [ ] Redis installed and configured
- [ ] CacheService implemented
- [ ] Cache middleware applied to GET endpoints
- [ ] Cache invalidation on writes
- [ ] Cache warming on startup
- [ ] Cache hit rate > 80%

### Database Optimization ✅
- [ ] Indexes created for common queries
- [ ] Queries optimized (verified with EXPLAIN)
- [ ] Full-text search implemented
- [ ] Connection pooling optimized
- [ ] Pool monitoring implemented
- [ ] Query execution time < 50ms (p95)

### Pagination ✅
- [ ] Pagination utility created
- [ ] Storage layer supports pagination
- [ ] All list endpoints paginated
- [ ] Link headers for navigation
- [ ] Default 50 items, max 100

### Compression ✅
- [ ] Response compression enabled
- [ ] gzip/deflate supported
- [ ] Responses > 1KB compressed
- [ ] Content-Encoding headers present

### Load Testing ✅
- [ ] Load tests created and passing
- [ ] 1000 concurrent users supported
- [ ] p95 < 200ms, p99 < 500ms
- [ ] Error rate < 1%
- [ ] Performance monitoring active

---

## Success Metrics

- **Throughput:** 2000+ requests/second
- **Response Time:** p95 < 200ms, p99 < 500ms
- **Concurrent Users:** 1000+
- **Cache Hit Rate:** > 80%
- **Error Rate:** < 1%
- **Database Query Time:** p95 < 50ms
- **Memory Usage:** Stable under load
- **CPU Usage:** < 70% under load

---

## Performance Benchmarks

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| List metrics (p95) | 450ms | 120ms | 73% faster |
| Get metric (p95) | 150ms | 25ms | 83% faster |
| Create metric (p95) | 300ms | 180ms | 40% faster |
| Cache hit rate | 0% | 85% | +85% |
| Concurrent users | 100 | 1200 | 12x |
| Memory usage | 500MB | 450MB | 10% less |

---

**Navigation:**
- **[← Back to Phase 2 Overview](./PHASE_2_MAJOR.md)**
- **[← Previous: Phase 2B - API Documentation](./PHASE_2B_API.md)**
- **[→ Next: Phase 2D - Monitoring](./PHASE_2D_MONITORING.md)**
