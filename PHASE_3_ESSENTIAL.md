# Phase 3: Essential Tasks for Production Readiness

**Duration:** 4-5 weeks  
**Priority:** P1-P2 - Essential for production  
**Prerequisites:** Phase 1 & Phase 2 completed ✅  
**Last Updated:** November 25, 2025

---

## Executive Summary

Phase 2 (Testing, API Versioning, Performance, Monitoring) is **COMPLETE** 🎉. However, there are still **essential** tasks required before production deployment:

1. **Test Coverage Completion** (P0) - Currently at 65%, need 85%/80%
2. **Backup & Disaster Recovery** (P1) - No backup strategy exists
3. **Rate Limiting** (P1) - API security requirement
4. **Operational Documentation** (P2) - Deployment and runbooks

**Non-Essential Tasks Deferred to Phase 4+:**
- Bulk operations API
- Advanced filtering
- Excel export
- Visualization dashboard
- Feature flags system
- Accessibility enhancements

---

## Task 1: Complete Test Coverage (Week 1-2)

**Status:** 🔴 **CRITICAL** - Currently at 65%, need 85%/80%  
**Priority:** P0 - Blocking production  
**Duration:** 7-10 days

### Current State
- **Coverage:** 65.36% statements, 55.37% branches, 65.53% lines, 65.38% functions
- **Target:** 85% statements/lines/functions, 80% branches
- **Gap:** ~20 percentage points
- **Blocker:** 31 failing tests in FileUserStore.test.ts

### 1.1: Fix FileUserStore Tests (Day 1)

**Issue:** All 31 tests fail due to logger mock not providing implementation.

**Solution:**
```typescript
// tests/auth/FileUserStore.test.ts
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));
```

**Expected Impact:** +2-3% overall coverage

**Acceptance Criteria:**
- [ ] All 31 FileUserStore tests passing
- [ ] FileUserStore.ts coverage > 80%

---

### 1.2: Create Missing Test Files (Days 2-8)

**Target Files with Low Coverage:**

1. **tests/api/routes/v1/stats.test.ts** (Day 2-3)
   - Current: stats.ts estimated ~22% coverage
   - Target: > 85%
   - Test stats endpoints, aggregation logic
   - Expected: +1-2% overall coverage

2. **tests/middleware/cache.test.ts** (Day 4)
   - Current: cache.ts at 64.28%
   - Target: > 85%
   - Test cache middleware, ETags, conditional requests
   - Expected: +0.5-1% overall coverage

3. **tests/middleware/compression.test.ts** (Day 5)
   - Current: compression.ts at 70.83%
   - Target: > 85%
   - Test compression middleware, thresholds
   - Expected: +0.3-0.5% overall coverage

4. **tests/middleware/performance.test.ts** (Day 6)
   - Current: performance.ts at 70.68%
   - Target: > 85%
   - Test performance monitoring, slow request detection
   - Expected: +0.3-0.5% overall coverage

5. **tests/cache/CacheService.test.ts** (Day 7-8)
   - Current: CacheService.ts at 12.41%
   - Target: > 70% (integration tests acceptable)
   - Option A: Complex Redis mocking
   - Option B: Integration tests with real Redis
   - Expected: +1-2% overall coverage

---

### 1.3: Fix Test Infrastructure Issues (Day 9)

**Issues:**
- AsyncLocalStorage warning (detected open handles)
- Test execution taking too long (27+ seconds)

**Solutions:**

1. Fix async leaks:
```typescript
// tests/setup.ts
afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});
```

2. Create shared mocks:
```typescript
// tests/helpers/mocks.ts
export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});
```

**Acceptance Criteria:**
- [ ] No async handle warnings
- [ ] Test execution < 25 seconds
- [ ] Shared mock utilities created

---

### Task 1 Acceptance Criteria

- [ ] **Coverage ≥ 85% statements, 80% branches, 85% lines, 85% functions**
- [ ] All tests passing (0 failed tests)
- [ ] No async handle warnings
- [ ] Coverage report documented

---

## Task 2: Backup & Disaster Recovery (Week 2-3)

**Status:** ❌ **NOT STARTED** - Critical operational requirement  
**Priority:** P1 - High (Required for production)  
**Duration:** 4-5 days

### 2.1: Database Backup Script (Day 1)

Create automated PostgreSQL backup script:

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mdl}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mdl}"
DB_USER="${DB_USER:-mdl}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mdl_backup_$TIMESTAMP.sql.gz"

echo "Starting database backup..."
mkdir -p "$BACKUP_DIR"

# Create backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Upload to S3 (optional)
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_FILE)"
  echo "Backup uploaded to S3"
fi

# Clean up old backups
find "$BACKUP_DIR" -name "mdl_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

**Acceptance Criteria:**
- [ ] Backup script created and tested
- [ ] Script handles errors gracefully
- [ ] Retention policy enforced

---

### 2.2: Database Restore Script (Day 1)

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mdl}"
DB_USER="${DB_USER:-mdl}"

echo "WARNING: This will drop and recreate the database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo "Starting database restore..."

# Drop and recreate database
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<SQL
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
SQL

# Restore backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME"

echo "Database restored successfully"
```

**Acceptance Criteria:**
- [ ] Restore script created and tested
- [ ] Confirmation prompt works
- [ ] Successful restore verified

---

### 2.3: File Storage Backup (Day 2)

```bash
#!/bin/bash
# scripts/backup-files.sh

set -e

DATA_DIR="${DATA_DIR:-.mdl}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mdl-files}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mdl_files_$TIMESTAMP.tar.gz"

echo "Starting file backup..."
mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_FILE" -C "$(dirname $DATA_DIR)" "$(basename $DATA_DIR)"

echo "File backup created: $BACKUP_FILE"

# Upload to S3 (optional)
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/file-backups/$(basename $BACKUP_FILE)"
  echo "File backup uploaded to S3"
fi

echo "File backup completed"
```

**Acceptance Criteria:**
- [ ] File backup script created
- [ ] File backups tested

---

### 2.4: Backup Scheduling (Day 3)

Set up automated backup schedule:

**Cron (Linux/Mac):**
```bash
# Add to crontab
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/mdl-backup.log 2>&1
0 3 * * * /path/to/scripts/backup-files.sh >> /var/log/mdl-backup.log 2>&1
```

**Kubernetes CronJob:**
```yaml
# k8s/cronjobs/backup-database.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mdl-database-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mdl:latest
            command: ["/scripts/backup-database.sh"]
            envFrom:
            - secretRef:
                name: mdl-secrets
          restartPolicy: OnFailure
```

**Acceptance Criteria:**
- [ ] Backup schedule configured
- [ ] Backups running automatically
- [ ] Log rotation configured

---

### 2.5: Backup Documentation (Day 4-5)

Create comprehensive backup documentation:

```markdown
# docs/operations/BACKUP_RECOVERY.md

## Backup Strategy

### Database Backups
- **Frequency:** Daily at 2 AM UTC
- **Retention:** 30 days local, 90 days S3
- **Location:** `/var/backups/mdl/` + S3 (if configured)
- **Script:** `scripts/backup-database.sh`
- **Size:** ~50MB compressed per backup

### File Backups
- **Frequency:** Daily at 3 AM UTC
- **Retention:** 30 days
- **Location:** `/var/backups/mdl-files/`
- **Script:** `scripts/backup-files.sh`

## Recovery Procedures

### Emergency Database Restore

1. **Stop the application:**
   ```bash
   sudo systemctl stop mdl
   ```

2. **List available backups:**
   ```bash
   ls -lh /var/backups/mdl/
   # Or from S3:
   aws s3 ls s3://your-bucket/backups/
   ```

3. **Restore from backup:**
   ```bash
   ./scripts/restore-database.sh /var/backups/mdl/mdl_backup_20251125_020000.sql.gz
   ```

4. **Verify data integrity:**
   ```bash
   psql -h localhost -U mdl -d mdl -c "SELECT COUNT(*) FROM metrics;"
   ```

5. **Restart the application:**
   ```bash
   sudo systemctl start mdl
   ```

### File Restore
```bash
# Extract files from backup
tar -xzf /var/backups/mdl-files/mdl_files_20251125_030000.tar.gz -C /
```

## Testing Backups

- **Schedule:** Monthly restore test (first Monday of each month)
- **Process:**
  1. Restore backup to staging environment
  2. Verify data integrity
  3. Run smoke tests
  4. Document any issues

## Monitoring

- Alert if backup fails
- Alert if backup size deviates > 20% from average
- Alert if S3 upload fails
```

**Acceptance Criteria:**
- [ ] Backup documentation complete
- [ ] Recovery procedures documented
- [ ] Testing schedule documented

---

### Task 2 Acceptance Criteria

- [ ] Database backup script working
- [ ] Database restore script working
- [ ] File backup script working
- [ ] Backup scheduling configured
- [ ] S3 upload configured (optional)
- [ ] Backup restore tested successfully
- [ ] Complete documentation in `docs/operations/BACKUP_RECOVERY.md`

---

## Task 3: Rate Limiting & API Security (Week 3)

**Status:** ⚠️ **PARTIAL** - Basic auth exists, rate limiting needed  
**Priority:** P1 - High (Production security requirement)  
**Duration:** 3-4 days

### 3.1: Implement Rate Limiting (Day 1-2)

**Install dependencies:**
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

**Create rate limit middleware:**
```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// General API rate limit - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
});

// Strict rate limit for authentication - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Moderate rate limit for write operations - 30 writes per minute
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many write requests, please slow down'
});
```

**Apply to routes:**
```typescript
// src/api/server.ts
import { apiLimiter, authLimiter, writeLimiter } from '../middleware/rateLimit';

// Apply to all API routes
app.use('/api/', apiLimiter);

// Strict limiting for auth
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);

// Moderate limiting for writes
app.post('/api/v1/metrics', writeLimiter);
app.put('/api/v1/metrics/:id', writeLimiter);
app.delete('/api/v1/metrics/:id', writeLimiter);
```

**Configuration:**
```bash
# .env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
WRITE_RATE_LIMIT_MAX=30
```

**Acceptance Criteria:**
- [ ] express-rate-limit installed
- [ ] Rate limit middleware created
- [ ] Applied to all API routes
- [ ] Stricter limits on auth endpoints
- [ ] Configuration in .env
- [ ] Tests written
- [ ] Documentation updated

---

### 3.2: Security Headers (Day 3)

Install and configure helmet:
```bash
npm install helmet
```

```typescript
// src/api/server.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Acceptance Criteria:**
- [ ] Helmet installed
- [ ] Security headers configured
- [ ] CSP policy defined
- [ ] HSTS enabled

---

### Task 3 Acceptance Criteria

- [ ] Rate limiting implemented and tested
- [ ] Security headers configured
- [ ] Tests passing
- [ ] Documentation updated

---

## Task 4: Essential Operational Documentation (Week 4)

**Status:** ⚠️ **PARTIAL** - Some docs exist, need runbooks  
**Priority:** P2 - Medium (Important for operations)  
**Duration:** 4-5 days

### 4.1: Deployment Guide (Day 1-2)

Create `docs/operations/DEPLOYMENT.md`:

```markdown
# MDL Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- 2GB RAM minimum
- 10GB disk space

## Environment Variables

See [.env.example](.env.example) for all required variables.

Critical variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing (min 32 characters)
- `NODE_ENV` - `production` for production

## Deployment Steps

### Option 1: Docker (Recommended)

```bash
# Build image
docker build -t mdl:latest .

# Run with docker-compose
docker-compose up -d

# Verify
curl http://localhost:3000/health
```

### Option 2: Direct Deployment

```bash
# Install dependencies
npm ci --production

# Build
npm run build

# Run database migrations
npm run migrate

# Start application
npm start
```

## Health Checks

- **Liveness:** `GET /health` - Returns 200 if application is running
- **Readiness:** `GET /health/ready` - Returns 200 if application can serve traffic

## Monitoring

- **Metrics:** `GET /metrics` (Prometheus format)
- **Logs:** JSON format to stdout
- **Tracing:** Jaeger (if configured)
```

**Acceptance Criteria:**
- [ ] Deployment guide complete
- [ ] Docker instructions included
- [ ] Health check endpoints documented
- [ ] Troubleshooting section added

---

### 4.2: Operational Runbooks (Day 3-5)

Create runbooks for common operations:

**docs/operations/runbooks/high-cpu-usage.md:**
```markdown
# Runbook: High CPU Usage

## Symptoms
- CPU usage > 80% for > 5 minutes
- Slow API response times

## Investigation

1. Check current CPU usage:
   ```bash
   top -p $(pgrep -f node)
   ```

2. Check slow queries:
   ```bash
   curl http://localhost:3000/api/v1/metrics/slow-queries
   ```

3. Check active connections:
   ```bash
   psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
   ```

## Resolution

1. If slow queries found:
   - Review query performance
   - Add database indexes if needed

2. If high connection count:
   - Reduce connection pool size
   - Restart application

3. If persistent:
   - Scale horizontally (add more instances)
   - Increase instance size
```

**Create runbooks for:**
- [ ] High CPU usage
- [ ] High memory usage
- [ ] Database connection issues
- [ ] Cache failures
- [ ] Application crashes

**Acceptance Criteria:**
- [ ] 5+ runbooks created
- [ ] Each runbook has symptoms, investigation, resolution
- [ ] Runbooks tested

---

### Task 4 Acceptance Criteria

- [ ] Deployment guide complete
- [ ] 5+ operational runbooks created
- [ ] Documentation reviewed and tested

---

## Phase 3 Completion Summary

### Essential Tasks Checklist

**Task 1: Test Coverage** ✅
- [ ] FileUserStore tests fixed (31 tests passing)
- [ ] Coverage ≥ 85% statements, 80% branches
- [ ] All tests passing (0 failures)
- [ ] Test infrastructure issues resolved

**Task 2: Backup & DR** ✅
- [ ] Database backup script created and tested
- [ ] Database restore script created and tested
- [ ] File backup script created
- [ ] Backup scheduling configured
- [ ] Backup documentation complete

**Task 3: Rate Limiting** ✅
- [ ] Rate limiting middleware implemented
- [ ] Applied to all API endpoints
- [ ] Security headers configured
- [ ] Tests passing

**Task 4: Documentation** ✅
- [ ] Deployment guide complete
- [ ] 5+ operational runbooks created
- [ ] All documentation reviewed

---

## Success Metrics

- **Test Coverage:** ≥ 85% statements/lines/functions, ≥ 80% branches
- **Backup Success Rate:** 100% (no failed backups)
- **API Security:** 100% of endpoints rate-limited
- **Documentation:** 100% of critical operations documented
- **Time to Deploy:** < 30 minutes from code to production
- **Time to Recover:** < 1 hour from backup

---

## Deferred to Phase 4+ (Nice-to-Have)

The following tasks are **NOT ESSENTIAL** for production and have been deferred:

### UX Enhancements (Phase 4)
- Bulk operations API
- Advanced filtering
- Saved queries
- Data visualization dashboard

### Data Export (Phase 4)
- Excel export
- Enhanced CSV options
- Custom column selection

### Advanced Features (Phase 4)
- Feature flags system
- GraphQL API
- Real-time updates (WebSockets)
- AI-powered suggestions

### Accessibility (Phase 4)
- ARIA attributes
- Keyboard navigation
- Screen reader support
- WCAG 2.1 AA compliance

### Code Quality (Continuous)
- Code refactoring
- Type safety improvements
- Remove technical debt

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Test Coverage (Part 1) | FileUserStore fixed, 3 new test files |
| Week 2 | Test Coverage (Part 2) | CacheService tests, 85% coverage achieved |
| Week 2 | Backup & DR (Part 1) | Backup scripts created and tested |
| Week 3 | Backup & DR (Part 2) + Rate Limiting | Backup scheduling, rate limiting implemented |
| Week 4 | Documentation | Deployment guide, runbooks |

**Total:** 4-5 weeks

**Cost Estimate:** 4 weeks × $10k/week = **$40k**

---

## Post-Phase 3 Status

After Phase 3 completion:
- ✅ **Production Ready:** All critical requirements met
- ✅ **Test Coverage:** 85%+ coverage achieved
- ✅ **Disaster Recovery:** Backup/restore procedures in place
- ✅ **API Security:** Rate limiting and security headers configured
- ✅ **Operations:** Complete deployment and runbook documentation

**Next Steps:**
- Deploy to production
- Monitor for 2-4 weeks
- Collect user feedback
- Plan Phase 4 enhancements

---

**Navigation:**
- [← Back to Gaps Analysis](./GAPS_AND_IMPROVEMENTS.md)
- [← Back to Phase 2 Summary](./PHASE_2_COMPLETION_SUMMARY.md)
- [→ Forward to Phase 4 Plan](./PHASE_4_HARDENING.md)

---

*Document Version: 1.0.0*  
*Created: November 25, 2025*  
*Status: Draft*  
*Next Review: After Task 1 completion*
