# Phase 4: Security Hardening & Resilience - Implementation Plan

**Duration:** 3-4 weeks  
**Priority:** P2 - Recommended for production  
**Prerequisites:** Phase 1 must be completed  
**Last Updated:** November 19, 2025

---

## Overview

Phase 4 focuses on security hardening and resilience improvements that were deferred from Phase 1. While the core authentication and security measures are in place, these enhancements provide additional layers of protection and system resilience for production environments.

**Goals:**
- Add rate limiting to prevent abuse
- Implement security headers (XSS, CSP)
- Add circuit breaker for database resilience
- Implement API key revocation
- Add HTML sanitization for user content
- Improve monitoring and alerting

---

## Task 1: Rate Limiting & Abuse Prevention (Week 1)

### Priority: P1 - High
### Estimated Effort: 3-4 days

---

### 1.1: Install and Configure Rate Limiter

**Duration:** 1 day

**Description:**  
Implement rate limiting to protect against brute force attacks and API abuse.

**Steps:**

1. Install dependencies:
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

2. Create rate limit configurations:
```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: req.rateLimit?.resetTime
      }
    });
  }
});

// Authentication rate limiter (more strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      username: req.body?.username
    });
    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        retryAfter: req.rateLimit?.resetTime
      }
    });
  }
});

// API key creation rate limiter
export const apiKeyCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 API keys per hour
  message: 'Too many API keys created, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
```

3. Apply rate limiters to routes:
```typescript
// In src/api/server.ts
import { generalLimiter, authLimiter, apiKeyCreationLimiter } from '../middleware/rateLimit';

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Apply strict rate limiter to authentication endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// Apply rate limiter to API key creation
app.use('/api/auth/api-keys', apiKeyCreationLimiter);
```

**Acceptance Criteria:**
- [ ] Rate limiter library installed
- [ ] General API rate limiter configured (100 req/15min)
- [ ] Authentication rate limiter configured (5 attempts/15min)
- [ ] API key creation rate limiter configured (10/hour)
- [ ] Rate limit headers included in responses
- [ ] Rate limit exceeded events logged
- [ ] Custom error responses for rate limit violations

**Testing:**
- [ ] Exceed general rate limit and verify 429 response
- [ ] Exceed auth rate limit and verify lockout
- [ ] Verify rate limit headers present
- [ ] Test rate limit reset after time window
- [ ] Verify successful requests don't count for auth limiter
- [ ] Test multiple IPs don't affect each other

**Environment Variables:**
```bash
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_GENERAL_WINDOW=900000
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW=900000
```

---

## Task 2: Security Headers & XSS Protection (Week 1)

### Priority: P1 - High
### Estimated Effort: 2-3 days

---

### 2.1: Install and Configure Helmet

**Duration:** 1-2 days

**Description:**  
Add comprehensive security headers using Helmet middleware.

**Steps:**

1. Install dependencies:
```bash
npm install helmet
npm install dompurify jsdom
npm install --save-dev @types/dompurify @types/jsdom
```

2. Configure Helmet middleware:
```typescript
// src/middleware/security.ts
import helmet from 'helmet';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for dashboard
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Hide X-Powered-By
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  }
});

// HTML sanitization function
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false
  });
}

// Sanitization middleware for request bodies
export function sanitizeRequestBody(req: any, res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Sanitize strings that might contain HTML
      if (key.includes('description') || key.includes('notes') || key.includes('comment')) {
        obj[key] = sanitizeHtml(obj[key]);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
```

3. Apply middleware:
```typescript
// In src/api/server.ts
import { securityHeaders, sanitizeRequestBody } from '../middleware/security';

// Apply security headers
app.use(securityHeaders);

// Apply input sanitization
app.use(express.json());
app.use(sanitizeRequestBody);
```

**Acceptance Criteria:**
- [ ] Helmet middleware installed and configured
- [ ] Content Security Policy headers set
- [ ] HSTS enabled with 1-year max-age
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-XSS-Protection enabled
- [ ] Referrer-Policy configured
- [ ] X-Powered-By header removed
- [ ] HTML sanitization for user-generated content
- [ ] Sanitization applied to description/notes fields

**Testing:**
- [ ] Verify security headers present in responses
- [ ] Test XSS payload is sanitized
- [ ] Verify legitimate HTML not broken
- [ ] Test CSP violations are blocked
- [ ] Verify HSTS headers present

**Security Headers Expected:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Task 3: Circuit Breaker Pattern (Week 2)

### Priority: P2 - Medium
### Estimated Effort: 3-4 days

---

### 3.1: Implement Circuit Breaker for Database

**Duration:** 3-4 days

**Description:**  
Add circuit breaker pattern to prevent cascade failures when database is under stress.

**Steps:**

1. Install circuit breaker library:
```bash
npm install opossum
npm install --save-dev @types/opossum
```

2. Create circuit breaker wrapper:
```typescript
// src/storage/circuitBreaker.ts
import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
  name: string;
}

export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CircuitBreakerOptions
): CircuitBreaker<Parameters<T>, ReturnType<T>> {
  const breaker = new CircuitBreaker(fn, {
    timeout: options.timeout,
    errorThresholdPercentage: options.errorThresholdPercentage,
    resetTimeout: options.resetTimeout,
    volumeThreshold: options.volumeThreshold
  });
  
  // Circuit opened - too many failures
  breaker.on('open', () => {
    logger.error(`Circuit breaker OPENED for ${options.name}`, {
      failures: breaker.stats.failures,
      threshold: options.errorThresholdPercentage
    });
  });
  
  // Circuit half-open - testing if service recovered
  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker HALF-OPEN for ${options.name} - testing recovery`);
  });
  
  // Circuit closed - service recovered
  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${options.name} - service recovered`);
  });
  
  // Request rejected due to open circuit
  breaker.on('reject', () => {
    logger.warn(`Request rejected by circuit breaker for ${options.name}`);
  });
  
  // Request timed out
  breaker.on('timeout', () => {
    logger.warn(`Request timeout in circuit breaker for ${options.name}`, {
      timeout: options.timeout
    });
  });
  
  return breaker;
}

// Database circuit breaker factory
export function createDatabaseCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
) {
  return createCircuitBreaker(fn, {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000, // Try to close circuit after 30 seconds
    volumeThreshold: 10, // Need at least 10 requests before evaluating threshold
    name: `Database:${name}`
  });
}
```

3. Apply circuit breaker to database operations:
```typescript
// In src/storage/PostgresMetricStore.ts
import { createDatabaseCircuitBreaker } from './circuitBreaker';
import { AppError, ErrorCodes } from '../utils/errors';

export class PostgresMetricStore {
  private pool: DatabasePool;
  private queryBreaker: CircuitBreaker<[string, any[]], any>;
  
  constructor() {
    this.pool = new DatabasePool();
    
    // Wrap database query with circuit breaker
    this.queryBreaker = createDatabaseCircuitBreaker(
      (query: string, params: any[]) => this.pool.query(query, params),
      'PostgresMetricStore.query'
    );
  }
  
  async findById(id: string): Promise<MetricDefinition | null> {
    try {
      const result = await this.queryBreaker.fire(
        'SELECT * FROM metrics WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      // Check if circuit is open
      if (error.message === 'Breaker is open') {
        logger.error('Database circuit breaker is open', { operation: 'findById', metricId: id });
        throw new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Database temporarily unavailable. Please try again later.',
          503
        );
      }
      throw error;
    }
  }
  
  async create(metric: MetricDefinition): Promise<MetricDefinition> {
    try {
      const result = await this.queryBreaker.fire(
        'INSERT INTO metrics (data) VALUES ($1) RETURNING *',
        [metric]
      );
      return result.rows[0];
    } catch (error) {
      if (error.message === 'Breaker is open') {
        throw new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Database temporarily unavailable. Cannot create metric at this time.',
          503
        );
      }
      throw error;
    }
  }
  
  // Apply to all database operations...
}
```

4. Add circuit breaker health endpoint:
```typescript
// In src/api/server.ts
app.get('/health/circuit-breakers', authenticate, requireAdmin, (req, res) => {
  const breakers = {
    metrics: {
      status: metricStore.queryBreaker.opened ? 'open' : 
              metricStore.queryBreaker.halfOpen ? 'half-open' : 'closed',
      stats: metricStore.queryBreaker.stats
    },
    domains: {
      status: domainStore.queryBreaker.opened ? 'open' : 
              domainStore.queryBreaker.halfOpen ? 'half-open' : 'closed',
      stats: domainStore.queryBreaker.stats
    }
  };
  
  res.json({ breakers });
});
```

**Acceptance Criteria:**
- [ ] Circuit breaker library installed
- [ ] Circuit breaker wrapper created
- [ ] Applied to all PostgreSQL stores
- [ ] Circuit state changes logged
- [ ] Fallback behavior defined for open circuit
- [ ] Health endpoint shows circuit breaker status
- [ ] Circuit breaker metrics exposed

**Testing:**
- [ ] Simulate database failures to open circuit
- [ ] Verify requests rejected when circuit open
- [ ] Test circuit closes after recovery period
- [ ] Verify half-open state allows test requests
- [ ] Test volume threshold (need 10 requests)
- [ ] Load test to verify protection under stress

**Configuration:**
```bash
CIRCUIT_BREAKER_TIMEOUT=10000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
CIRCUIT_BREAKER_VOLUME_THRESHOLD=10
```

---

## Task 4: API Key Management Enhancements (Week 2)

### Priority: P2 - Medium
### Estimated Effort: 2-3 days

---

### 4.1: Implement API Key Revocation

**Duration:** 2-3 days

**Description:**  
Add ability to revoke individual API keys and implement key rotation.

**Steps:**

1. Add revocation endpoint:
```typescript
// In src/api/routes/auth.ts

// Revoke specific API key
router.delete('/api-keys/:keyId', authenticate, async (req: AuthRequest, res) => {
  try {
    const keyId = req.params.keyId;
    const userId = req.user!.userId;
    
    // Verify key belongs to user
    const key = await apiKeyStore.findById(keyId);
    if (!key) {
      return res.status(404).json({
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }
    
    if (key.user_id !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot revoke API key belonging to another user'
        }
      });
    }
    
    // Revoke the key
    await apiKeyStore.revoke(keyId);
    
    logger.info('API key revoked', {
      userId,
      keyId,
      keyName: key.name
    });
    
    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Failed to revoke API key', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke API key'
      }
    });
  }
});

// Revoke all API keys for current user
router.delete('/api-keys', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const count = await apiKeyStore.revokeAllForUser(userId);
    
    logger.warn('All API keys revoked for user', { userId, count });
    
    res.json({
      success: true,
      message: `${count} API keys revoked successfully`
    });
  } catch (error) {
    logger.error('Failed to revoke all API keys', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to revoke API keys'
      }
    });
  }
});

// Update API key (rename or extend expiration)
router.patch('/api-keys/:keyId', authenticate, async (req: AuthRequest, res) => {
  try {
    const keyId = req.params.keyId;
    const userId = req.user!.userId;
    const { name, extend_days } = req.body;
    
    // Verify ownership
    const key = await apiKeyStore.findById(keyId);
    if (!key || key.user_id !== userId) {
      return res.status(404).json({
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }
    
    // Update key
    const updates: any = {};
    if (name) updates.name = name;
    if (extend_days) {
      const newExpiry = new Date(key.expires_at);
      newExpiry.setDate(newExpiry.getDate() + extend_days);
      updates.expires_at = newExpiry;
    }
    
    const updated = await apiKeyStore.update(keyId, updates);
    
    logger.info('API key updated', { userId, keyId, updates });
    
    res.json({
      success: true,
      key: {
        id: updated.id,
        name: updated.name,
        expires_at: updated.expires_at,
        last_used_at: updated.last_used_at
      }
    });
  } catch (error) {
    logger.error('Failed to update API key', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update API key'
      }
    });
  }
});
```

2. Add API key usage tracking:
```typescript
// Update authentication middleware to track last used
export async function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(); // Fall through to JWT auth
  }
  
  try {
    const keyData = await apiKeyStore.findByKey(apiKey);
    
    if (!keyData || !keyData.is_active) {
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or inactive API key'
        }
      });
    }
    
    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: {
          code: 'API_KEY_EXPIRED',
          message: 'API key has expired'
        }
      });
    }
    
    // Update last used timestamp (async, don't wait)
    apiKeyStore.updateLastUsed(keyData.id).catch(err => {
      logger.error('Failed to update API key last_used', { error: err });
    });
    
    // Set user context
    req.user = {
      userId: keyData.user_id,
      role: keyData.role,
      authMethod: 'api_key'
    };
    
    next();
  } catch (error) {
    logger.error('API key authentication failed', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}
```

**Acceptance Criteria:**
- [ ] DELETE /api/auth/api-keys/:keyId endpoint
- [ ] DELETE /api/auth/api-keys endpoint (revoke all)
- [ ] PATCH /api/auth/api-keys/:keyId endpoint (update)
- [ ] API key last_used timestamp tracked
- [ ] Expired API keys rejected
- [ ] Revocation logged for audit
- [ ] Users can only revoke their own keys

**Testing:**
- [ ] Test revoking individual key
- [ ] Test revoking all keys
- [ ] Test updating key name
- [ ] Test extending expiration
- [ ] Verify last_used updated on use
- [ ] Test expired key rejection
- [ ] Test ownership validation

---

## Task 5: Monitoring & Alerting Setup (Week 3)

### Priority: P2 - Medium
### Estimated Effort: 3-4 days

---

### 5.1: Add Prometheus Metrics

**Duration:** 2-3 days

**Description:**  
Export application metrics in Prometheus format for monitoring.

**Steps:**

1. Install dependencies:
```bash
npm install prom-client
npm install --save-dev @types/prom-client
```

2. Create metrics registry:
```typescript
// src/monitoring/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const metricsRegistry = new Registry();

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
});

// Authentication metrics
export const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'], // method: login/api_key, status: success/failure
  registers: [metricsRegistry]
});

export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active user sessions',
  registers: [metricsRegistry]
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  registers: [metricsRegistry]
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [metricsRegistry]
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  registers: [metricsRegistry]
});

// Circuit breaker metrics
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['breaker_name'],
  registers: [metricsRegistry]
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker failures',
  labelNames: ['breaker_name'],
  registers: [metricsRegistry]
});

// Business metrics
export const metricsCreated = new Counter({
  name: 'metrics_created_total',
  help: 'Total number of metrics created',
  labelNames: ['tier', 'category'],
  registers: [metricsRegistry]
});

export const apiKeysCreated = new Counter({
  name: 'api_keys_created_total',
  help: 'Total number of API keys created',
  registers: [metricsRegistry]
});
```

3. Add metrics endpoint:
```typescript
// In src/api/server.ts
import { metricsRegistry } from '../monitoring/metrics';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});
```

4. Add metrics middleware:
```typescript
// src/middleware/metricsMiddleware.ts
import { httpRequestDuration, httpRequestTotal } from '../monitoring/metrics';

export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });
  
  next();
}
```

**Acceptance Criteria:**
- [ ] Prometheus metrics exported at /metrics
- [ ] HTTP request metrics tracked
- [ ] Authentication metrics tracked
- [ ] Database connection metrics tracked
- [ ] Circuit breaker state metrics
- [ ] Business metrics (metrics created, API keys)
- [ ] Metrics endpoint accessible

**Testing:**
- [ ] Verify /metrics endpoint returns Prometheus format
- [ ] Check metrics update correctly
- [ ] Test with Prometheus scraper

---

## Task 6: Advanced Logging Features (Week 3-4)

### Priority: P3 - Low
### Estimated Effort: 3-4 days

---

### 6.1: Add Log Aggregation Support

**Duration:** 2 days

**Description:**  
Configure logging for external aggregation services (ELK, CloudWatch, Datadog).

**Steps:**

1. Install transports:
```bash
npm install winston-cloudwatch
npm install winston-elasticsearch
```

2. Configure CloudWatch transport (optional):
```typescript
// src/utils/logger.ts
import WinsonCloudWatch from 'winston-cloudwatch';

if (process.env.AWS_CLOUDWATCH_ENABLED === 'true') {
  transports.push(
    new WinstonCloudWatch({
      logGroupName: process.env.AWS_CLOUDWATCH_GROUP || 'mdl-api',
      logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      jsonMessage: true
    })
  );
}
```

3. Configure Elasticsearch transport (optional):
```typescript
import { ElasticsearchTransport } from 'winston-elasticsearch';

if (process.env.ELASTICSEARCH_ENABLED === 'true') {
  transports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
      },
      index: 'mdl-logs'
    })
  );
}
```

**Acceptance Criteria:**
- [ ] CloudWatch logging support (optional)
- [ ] Elasticsearch logging support (optional)
- [ ] Environment-based configuration
- [ ] Structured JSON logs

---

## Implementation Order

**Week 1: Security Hardening**
1. Day 1-2: Rate limiting
2. Day 3-4: Security headers (Helmet)
3. Day 5: Testing and validation

**Week 2: Resilience**
1. Day 1-3: Circuit breaker pattern
2. Day 4-5: API key management enhancements

**Week 3: Monitoring**
1. Day 1-3: Prometheus metrics
2. Day 4-5: Log aggregation setup

**Week 4: Testing & Documentation**
1. Day 1-2: Load testing with hardening features
2. Day 3-4: Security testing
3. Day 5: Documentation updates

---

## Success Criteria

**Security:**
- [ ] Rate limiting prevents brute force attacks (< 5 auth attempts/15min)
- [ ] Security headers present in all responses
- [ ] XSS payloads sanitized
- [ ] No security headers missing in scans

**Resilience:**
- [ ] Circuit breaker prevents cascade failures
- [ ] System remains stable under database stress
- [ ] Degraded performance instead of complete failure

**Monitoring:**
- [ ] All critical metrics exposed
- [ ] Alerting configured for anomalies
- [ ] Dashboard shows system health

---

## Testing Strategy

### Security Testing
- [ ] OWASP ZAP scan for vulnerabilities
- [ ] Rate limit bypass attempts
- [ ] XSS payload injection tests
- [ ] Security header validation

### Resilience Testing
- [ ] Database failure simulation
- [ ] Load testing with circuit breaker
- [ ] Recovery time measurement

### Monitoring Testing
- [ ] Metrics validation
- [ ] Alert trigger testing
- [ ] Dashboard functionality

---

## Rollback Plan

All features in this phase are **additive** and can be disabled via environment variables:

```bash
# Disable rate limiting
RATE_LIMIT_ENABLED=false

# Disable security headers
SECURITY_HEADERS_ENABLED=false

# Disable circuit breaker
CIRCUIT_BREAKER_ENABLED=false

# Disable metrics
METRICS_ENABLED=false
```

---

## Dependencies

**Required:**
- Phase 1 completion (authentication, logging, validation)

**Optional:**
- CloudWatch for log aggregation
- Elasticsearch for log aggregation
- Prometheus for metrics scraping
- Grafana for dashboards

---

## Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_AUTH_MAX=5

# Security Headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_TIMEOUT=10000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50

# Monitoring
METRICS_ENABLED=true
METRICS_PORT=9090

# Log Aggregation
AWS_CLOUDWATCH_ENABLED=false
ELASTICSEARCH_ENABLED=false
```

---

**Previous Phase:** [PHASE_3_MINOR.md](./PHASE_3_MINOR.md)  
**Next Steps:** Production deployment preparation
