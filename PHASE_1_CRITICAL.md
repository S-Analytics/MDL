# Phase 1: Critical Improvements - Implementation Plan

**Duration:** 8 weeks  
**Priority:** P0 - Must complete before production deployment  
**Last Updated:** November 19, 2025

---

## Overview

Phase 1 addresses critical security, reliability, and data integrity issues that must be resolved before any production deployment. This phase focuses on foundational improvements that protect data, ensure system stability, and establish operational excellence.

**Success Criteria:**
- [ ] All API endpoints require authentication
- [ ] Structured logging implemented across entire application
- [ ] All user inputs validated and sanitized
- [ ] Database connections managed robustly with health checks

---

## Task 1: Authentication & Authorization (3-5 weeks)

### Priority: P0 - Critical
### Estimated Effort: 3-5 weeks

---

### 1.1: Choose and Install Authentication Framework

**Duration:** 2-3 days

**Description:**  
Evaluate and select authentication strategy, install required dependencies.

**Steps:**
1. Evaluate options:
   - Option A: JWT-based authentication (recommended for API-first)
   - Option B: Session-based authentication (better for dashboard)
   - Option C: OAuth2/OpenID Connect (enterprise SSO)

2. Install dependencies:
```bash
npm install jsonwebtoken bcrypt express-jwt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

3. Create authentication configuration:
```typescript
// src/auth/config.ts
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  jwtExpiresIn: '24h',
  refreshTokenExpiresIn: '7d',
  bcryptRounds: 10
};
```

**Acceptance Criteria:**
- [ ] Authentication library installed and configured
- [ ] JWT_SECRET environment variable documented in .env.example
- [ ] Authentication config module created
- [ ] Security best practices documented

**Testing:**
- Verify JWT signing and verification works
- Test bcrypt hashing and comparison

---

### 1.2: Implement User Model and Database Schema

**Duration:** 2-3 days

**Description:**  
Create user data model and database tables for storing user credentials and roles.

**Steps:**
1. Create user interface:
```typescript
// src/models/User.ts
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
}
```

2. Create database migration:
```sql
-- scripts/migrations/001_create_users_table.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

3. Create UserStore:
```typescript
// src/storage/UserStore.ts
export interface IUserStore {
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<void>;
}
```

**Acceptance Criteria:**
- [ ] User model defined with proper types
- [ ] Database migration script created
- [ ] UserStore interface and implementation completed
- [ ] Password hashing implemented (never store plain text)
- [ ] User CRUD operations tested

**Testing:**
- Unit tests for UserStore methods
- Test password hashing and comparison
- Verify unique constraints on username/email

---

### 1.3: Implement Authentication Middleware

**Duration:** 3-4 days

**Description:**  
Create middleware to protect routes and verify JWT tokens.

**Steps:**
1. Create JWT utility functions:
```typescript
// src/auth/jwt.ts
import jwt from 'jsonwebtoken';
import { authConfig } from './config';

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, authConfig.jwtSecret, {
    expiresIn: authConfig.refreshTokenExpiresIn
  });
}

export function verifyToken(token: string): { userId: string; role: string } {
  return jwt.verify(token, authConfig.jwtSecret) as { userId: string; role: string };
}
```

2. Create authentication middleware:
```typescript
// src/auth/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

**Acceptance Criteria:**
- [ ] JWT generation and verification functions implemented
- [ ] Authentication middleware created
- [ ] Role-based authorization middleware created
- [ ] Proper error responses for authentication failures
- [ ] Token expiration handled correctly

**Testing:**
- Test valid token authentication
- Test expired token rejection
- Test invalid token rejection
- Test role-based authorization
- Test missing token handling

---

### 1.4: Implement Login and Registration Endpoints

**Duration:** 2-3 days

**Description:**  
Create API endpoints for user registration, login, and token refresh.

**Steps:**
1. Create authentication routes:
```typescript
// src/api/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { UserStore } from '../../storage/UserStore';
import { generateAccessToken, generateRefreshToken } from '../../auth/jwt';

const router = Router();
const userStore = new UserStore();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'viewer' } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const existingUser = await userStore.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await userStore.createUser({
      username,
      email,
      password_hash,
      role,
      is_active: true
    });
    
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await userStore.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await userStore.updateLastLogin(user.id);
    
    // Generate tokens
    const access_token = generateAccessToken(user.id, user.role);
    const refresh_token = generateRefreshToken(user.id);
    
    res.json({
      access_token,
      refresh_token,
      expires_in: 86400, // 24 hours
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

2. Integrate auth routes into server:
```typescript
// In src/api/server.ts
import authRoutes from './routes/auth';

app.use('/api/auth', authRoutes);
```

**Acceptance Criteria:**
- [ ] POST /api/auth/register endpoint implemented
- [ ] POST /api/auth/login endpoint implemented
- [ ] POST /api/auth/refresh endpoint implemented (token refresh)
- [ ] Password validation enforced (min 8 chars, complexity)
- [ ] Rate limiting applied to login endpoint
- [ ] Last login timestamp updated

**Testing:**
- Test successful registration
- Test duplicate username/email rejection
- Test successful login
- Test invalid credentials rejection
- Test inactive user rejection
- Test token refresh

---

### 1.5: Protect Existing API Endpoints

**Duration:** 3-4 days

**Description:**  
Apply authentication and authorization to all existing API endpoints.

**Steps:**
1. Identify public vs protected endpoints:
```typescript
// Public endpoints (no auth required):
// - GET /health
// - POST /api/auth/register
// - POST /api/auth/login

// Protected endpoints (require auth):
// - All /api/metrics/* endpoints
// - All /api/policies/* endpoints
// - All /api/stats/* endpoints
// - All /api/domains/* endpoints
// - All /api/objectives/* endpoints
```

2. Apply authentication middleware:
```typescript
// In src/api/server.ts
import { authenticate, requireRole } from '../auth/middleware';

// Public routes
app.get('/health', healthCheck);
app.use('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/metrics', authenticate, metricsRoutes);
app.use('/api/policies', authenticate, policiesRoutes);
app.use('/api/stats', authenticate, statsRoutes);

// Admin-only routes
app.use('/api/admin', authenticate, requireRole(['admin']), adminRoutes);
```

3. Update route handlers to use user context:
```typescript
// Example: Add created_by field to metrics
router.post('/metrics', async (req: AuthRequest, res) => {
  const metricData = {
    ...req.body,
    created_by: req.user?.userId,
    updated_by: req.user?.userId
  };
  // ... create metric
});
```

**Acceptance Criteria:**
- [ ] All API endpoints protected except public routes
- [ ] Role-based access control applied correctly
  - Admins: Full CRUD access
  - Editors: Create, read, update own metrics
  - Viewers: Read-only access
- [ ] User context available in all protected routes
- [ ] Audit fields populated (created_by, updated_by)
- [ ] Authorization errors return 403 Forbidden

**Testing:**
- Test unauthenticated access rejection
- Test valid token access
- Test role-based authorization
- Test each role's permissions
- Integration tests for protected endpoints

---

### 1.6: Secure PostgreSQL Credentials

**Duration:** 1 day

**Description:**  
Move database credentials from request bodies to environment variables.

**Steps:**
1. Update environment configuration:
```bash
# .env.example
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mdl
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
```

2. Update PostgreSQL stores:
```typescript
// src/storage/PostgresMetricStore.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mdl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
```

3. Remove database credentials from API endpoints:
```typescript
// Remove this pattern from all PostgreSQL routes:
const { host, port, database, user, password } = req.body;
```

**Acceptance Criteria:**
- [ ] All database credentials moved to environment variables
- [ ] .env.example updated with database configuration
- [ ] No credentials accepted in API request bodies
- [ ] Connection pooling uses environment config
- [ ] SSL support configurable via environment

**Testing:**
- Test database connection with environment variables
- Verify credentials not exposed in API responses
- Test SSL connection if enabled

---

### 1.7: Implement API Key Authentication (Optional)

**Duration:** 2 days

**Description:**  
Add API key support for CLI and programmatic access.

**Steps:**
1. Create API keys table:
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

2. Implement API key authentication:
```typescript
// src/auth/apikey.ts
import crypto from 'crypto';

export function generateApiKey(): string {
  return `mdl_${crypto.randomBytes(32).toString('hex')}`;
}

export async function authenticateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(); // Fall through to JWT auth
  }
  
  // Verify API key and set user context
  // ...
  next();
}
```

**Acceptance Criteria:**
- [ ] API key generation endpoint created
- [ ] API key authentication middleware implemented
- [ ] API keys stored securely (hashed)
- [ ] API key management endpoints (list, revoke)
- [ ] CLI updated to support API key authentication

---

## Task 2: Error Handling & Logging (2-3 weeks)

### Priority: P0 - Critical
### Estimated Effort: 2-3 weeks

---

### 2.1: Install and Configure Logging Framework

**Duration:** 2-3 days

**Description:**  
Replace console.log with structured logging using Winston or Pino.

**Steps:**
1. Install dependencies:
```bash
npm install winston winston-daily-rotate-file
npm install --save-dev @types/winston
```

2. Create logger configuration:
```typescript
// src/utils/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports: winston.transport[] = [
  // Console logging
  new winston.transports.Console({
    format: nodeEnv === 'development' 
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : logFormat
  })
];

// File logging for production
if (nodeEnv === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false
});

// Create child logger with context
export function createLogger(context: string) {
  return logger.child({ context });
}
```

**Acceptance Criteria:**
- [ ] Winston installed and configured
- [ ] Log levels configured (error, warn, info, debug)
- [ ] JSON format for structured logs
- [ ] Daily log rotation enabled (30-day retention)
- [ ] Console output for development
- [ ] File output for production
- [ ] LOG_LEVEL environment variable supported

**Testing:**
- Test logging at each level
- Verify log file rotation
- Check log format (JSON structure)
- Test context propagation

---

### 2.2: Replace All console.log Statements

**Duration:** 2-3 days

**Description:**  
Systematically replace all console.log/error/warn with structured logging.

**Steps:**
1. Find all console statements:
```bash
grep -r "console\." src/ --exclude-dir=node_modules
```

2. Replace patterns:
```typescript
// Before:
console.log('Server started on port 3000');
console.error('Database connection failed:', error);
console.warn('Metric not found:', metricId);

// After:
import { logger } from './utils/logger';

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: error.message, stack: error.stack });
logger.warn('Metric not found', { metricId });
```

3. Update key files:
   - src/index.ts (startup logging)
   - src/api/server.ts (request/error logging)
   - src/storage/*.ts (database operations)
   - src/config/ConfigLoader.ts (import operations)

**Acceptance Criteria:**
- [ ] All console.log replaced with logger.info/debug
- [ ] All console.error replaced with logger.error
- [ ] All console.warn replaced with logger.warn
- [ ] Consistent log structure with context fields
- [ ] No console statements remain (except startup banner if desired)

**Testing:**
- Search codebase for remaining console statements
- Verify logs appear in files and console
- Check log structure is JSON

---

### 2.3: Implement Request Logging Middleware

**Duration:** 1-2 days

**Description:**  
Add comprehensive request/response logging with correlation IDs.

**Steps:**
1. Create request logging middleware:
```typescript
// src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RequestWithId extends Request {
  requestId: string;
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  req.requestId = requestId;
  
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.userId
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.userId
    });
  });
  
  next();
}
```

2. Apply middleware:
```typescript
// In src/api/server.ts
import { requestLogger } from '../middleware/requestLogger';

app.use(requestLogger);
```

**Acceptance Criteria:**
- [ ] Request ID generated for each request
- [ ] Request details logged (method, URL, IP, user)
- [ ] Response details logged (status code, duration)
- [ ] Request ID propagated through entire request lifecycle
- [ ] Correlation ID returned in response headers

**Testing:**
- Verify request logs created
- Check request ID uniqueness
- Validate timing accuracy
- Test correlation ID in headers

---

### 2.4: Implement Error Codes and Standard Error Responses

**Duration:** 2-3 days

**Description:**  
Create standardized error responses with error codes for debugging.

**Steps:**
1. Define error codes:
```typescript
// src/errors/codes.ts
export const ErrorCodes = {
  // Authentication errors (1xxx)
  AUTH_REQUIRED: 'ERR_1001',
  INVALID_TOKEN: 'ERR_1002',
  INSUFFICIENT_PERMISSIONS: 'ERR_1003',
  
  // Validation errors (2xxx)
  VALIDATION_FAILED: 'ERR_2001',
  INVALID_INPUT: 'ERR_2002',
  MISSING_REQUIRED_FIELD: 'ERR_2003',
  
  // Resource errors (3xxx)
  RESOURCE_NOT_FOUND: 'ERR_3001',
  RESOURCE_ALREADY_EXISTS: 'ERR_3002',
  
  // Database errors (4xxx)
  DATABASE_ERROR: 'ERR_4001',
  CONNECTION_FAILED: 'ERR_4002',
  
  // Internal errors (5xxx)
  INTERNAL_ERROR: 'ERR_5001',
  CONFIGURATION_ERROR: 'ERR_5002'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

2. Create error classes:
```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCodes.VALIDATION_FAILED, message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(ErrorCodes.RESOURCE_NOT_FOUND, `${resource} not found: ${id}`, 404);
  }
}
```

3. Create global error handler:
```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error
  logger.error('Request error', {
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack,
    code: (err as AppError).code,
    url: req.url,
    method: req.method
  });
  
  // Send error response
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: (req as any).requestId
      }
    });
  }
  
  // Unexpected errors
  res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      requestId: (req as any).requestId
    }
  });
}
```

**Acceptance Criteria:**
- [ ] Error code enum defined for all error types
- [ ] Custom error classes created
- [ ] Global error handler middleware implemented
- [ ] Consistent error response format
- [ ] Sensitive information sanitized from errors
- [ ] Stack traces hidden in production
- [ ] Request ID included in error responses

**Testing:**
- Test each error type returns correct status code
- Verify error codes are consistent
- Check production vs development error details
- Test error logging

---

### 2.5: Add Logging to Critical Operations

**Duration:** 2-3 days

**Description:**  
Add detailed logging to database operations, imports, and business logic.

**Steps:**
1. Add logging to database operations:
```typescript
// Example in MetricStore
async create(metric: MetricDefinition): Promise<MetricDefinition> {
  logger.info('Creating metric', { metricId: metric.metric_id });
  
  try {
    const created = await this.performCreate(metric);
    logger.info('Metric created successfully', { 
      metricId: created.metric_id,
      version: created.version 
    });
    return created;
  } catch (error) {
    logger.error('Failed to create metric', { 
      metricId: metric.metric_id,
      error: error.message 
    });
    throw error;
  }
}
```

2. Add logging to imports:
```typescript
// In ConfigLoader.importFromFile
logger.info('Starting import', { filePath, format });
logger.info('Import completed', { 
  metricsImported: results.metrics.length,
  domainsImported: results.domains.length,
  errors: results.errors.length
});
```

3. Add logging to versioning:
```typescript
// In bumpVersion
logger.info('Bumping metric version', { 
  metricId, 
  oldVersion, 
  newVersion,
  changeType 
});
```

**Acceptance Criteria:**
- [ ] All database operations logged (with duration)
- [ ] Import/export operations logged
- [ ] Versioning changes logged
- [ ] Authentication events logged
- [ ] Configuration changes logged
- [ ] Performance metrics logged

**Testing:**
- Trigger each operation and verify logs
- Check log completeness
- Validate log fields present

---

## Task 3: Data Validation & Input Sanitization (2-3 weeks)

### Priority: P0 - Critical
### Estimated Effort: 2-3 weeks

---

### 3.1: Install Validation Library

**Duration:** 1 day

**Description:**  
Install and configure Joi or Zod for schema validation.

**Steps:**
1. Install dependencies:
```bash
npm install joi
npm install --save-dev @types/joi
```

2. Create validation utilities:
```typescript
// src/validation/index.ts
import Joi from 'joi';

export function validateSchema<T>(schema: Joi.Schema, data: unknown): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('Validation failed', {
      errors: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }
  
  return value;
}
```

**Acceptance Criteria:**
- [ ] Joi installed and configured
- [ ] Validation utility functions created
- [ ] Error formatting standardized

---

### 3.2: Create Validation Schemas

**Duration:** 3-4 days

**Description:**  
Define comprehensive validation schemas for all data models.

**Steps:**
1. Create metric validation schema:
```typescript
// src/validation/schemas.ts
import Joi from 'joi';

export const metricSchema = Joi.object({
  metric_id: Joi.string()
    .pattern(/^METRIC-[A-Z0-9-]+$/)
    .required()
    .max(100),
  name: Joi.string()
    .min(3)
    .max(200)
    .required(),
  description: Joi.string()
    .min(10)
    .max(2000)
    .required(),
  category: Joi.string()
    .valid('operational', 'strategic', 'tactical', 'leading', 'lagging')
    .required(),
  metric_type: Joi.string()
    .valid('quantitative', 'qualitative', 'ratio', 'percentage', 'count')
    .required(),
  tier: Joi.string()
    .valid('tier1', 'tier2', 'tier3')
    .required(),
  unit_of_measure: Joi.string()
    .max(50)
    .required(),
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .default([]),
  owner: Joi.string()
    .max(100)
    .required(),
  business_domain: Joi.string()
    .max(100)
    .optional(),
  // ... more fields
}).options({ stripUnknown: true });

export const domainSchema = Joi.object({
  // Define domain validation
});

export const objectiveSchema = Joi.object({
  // Define objective validation
});
```

**Acceptance Criteria:**
- [ ] Validation schema for MetricDefinition
- [ ] Validation schema for BusinessDomain
- [ ] Validation schema for Objective
- [ ] Validation schema for User
- [ ] Maximum lengths enforced on all strings
- [ ] Email format validation
- [ ] URL format validation
- [ ] Enum values validated

**Testing:**
- Test valid data passes validation
- Test invalid data fails with correct errors
- Test boundary conditions (max lengths)
- Test required field validation

---

### 3.3: Add Validation Middleware

**Duration:** 2 days

**Description:**  
Create reusable validation middleware for Express routes.

**Steps:**
1. Create validation middleware:
```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateSchema } from '../validation';

export function validateBody(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = validateSchema(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = validateSchema(schema, req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

2. Apply to routes:
```typescript
// In routes
router.post('/metrics', 
  authenticate,
  validateBody(metricSchema),
  async (req, res, next) => {
    // req.body is now validated and typed
  }
);
```

**Acceptance Criteria:**
- [ ] Validation middleware created
- [ ] Applied to all POST/PUT endpoints
- [ ] Validation errors return 400 with details
- [ ] Unknown fields stripped automatically

**Testing:**
- Test validation middleware with valid data
- Test validation errors are caught
- Verify error response format

---

### 3.4: Implement SQL Injection Prevention

**Duration:** 2-3 days

**Description:**  
Replace all string interpolation with parameterized queries.

**Steps:**
1. Audit all SQL queries in PostgreSQL stores:
```bash
grep -r "pool.query" src/storage/Postgres*.ts
```

2. Replace unsafe patterns:
```typescript
// UNSAFE - DO NOT USE
const query = `SELECT * FROM metrics WHERE id = '${id}'`;

// SAFE - Use parameterized queries
const query = 'SELECT * FROM metrics WHERE id = $1';
const result = await pool.query(query, [id]);
```

3. Update all PostgreSQL stores:
   - PostgresMetricStore.ts
   - PostgresDomainStore.ts
   - PostgresObjectiveStore.ts

**Acceptance Criteria:**
- [ ] All SQL queries use parameterized queries
- [ ] No string interpolation in SQL queries
- [ ] SQL injection testing performed
- [ ] Dynamic query builder if needed (e.g., for filters)

**Testing:**
- SQL injection penetration testing
- Verify all queries use parameters
- Test with malicious input

---

### 3.5: Add XSS Protection

**Duration:** 1-2 days

**Description:**  
Implement XSS protection for dashboard and API responses.

**Steps:**
1. Install sanitization library:
```bash
npm install dompurify jsdom
npm install helmet
```

2. Add helmet middleware:
```typescript
// In src/api/server.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

3. Sanitize user input:
```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty);
}
```

**Acceptance Criteria:**
- [ ] Helmet middleware installed
- [ ] CSP headers configured
- [ ] HTML sanitization for user-generated content
- [ ] XSS testing performed

**Testing:**
- Test XSS payloads are sanitized
- Verify CSP headers present
- Test legitimate HTML not broken

---

### 3.6: Implement Rate Limiting

**Duration:** 1-2 days

**Description:**  
Add rate limiting to prevent abuse.

**Steps:**
1. Install rate limiter:
```bash
npm install express-rate-limit
```

2. Configure rate limits:
```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});
```

3. Apply rate limiters:
```typescript
// In src/api/server.ts
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
```

**Acceptance Criteria:**
- [ ] General API rate limiter (100 req/15min)
- [ ] Authentication rate limiter (5 attempts/15min)
- [ ] Rate limit headers in responses
- [ ] Custom limits for different endpoints

**Testing:**
- Exceed rate limit and verify 429 response
- Check rate limit headers
- Test rate limit reset

---

## Task 4: Database Connection Management (2 weeks)

### Priority: P0 - Critical
### Estimated Effort: 2 weeks

---

### 4.1: Implement Database Health Checks

**Duration:** 2-3 days

**Description:**  
Add comprehensive database health monitoring.

**Steps:**
1. Create health check utility:
```typescript
// src/storage/healthCheck.ts
import { Pool } from 'pg';
import { logger } from '../utils/logger';

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  lastChecked: Date;
}

export async function checkDatabaseHealth(pool: Pool): Promise<DatabaseHealth> {
  const startTime = Date.now();
  
  try {
    const result = await pool.query('SELECT 1 as health_check');
    const latency = Date.now() - startTime;
    
    return {
      status: latency < 100 ? 'healthy' : 'degraded',
      latency,
      activeConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
      lastChecked: new Date()
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'down',
      latency: Date.now() - startTime,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      lastChecked: new Date()
    };
  }
}
```

2. Update health endpoint:
```typescript
// In src/api/server.ts
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth(pool);
  
  const health = {
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };
  
  const statusCode = dbHealth.status === 'down' ? 503 : 200;
  res.status(statusCode).json(health);
});
```

**Acceptance Criteria:**
- [ ] Database health check function implemented
- [ ] Health metrics collected (latency, connections)
- [ ] /health endpoint returns detailed status
- [ ] Unhealthy database returns 503 status
- [ ] Health checks logged

**Testing:**
- Test health check with healthy database
- Test health check with stopped database
- Verify metrics accuracy

---

### 4.2: Implement Connection Retry Logic

**Duration:** 2-3 days

**Description:**  
Add exponential backoff retry for database connections.

**Steps:**
1. Create retry utility:
```typescript
// src/utils/retry.ts
import { logger } from './logger';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  context: string
): Promise<T> {
  let attempt = 1;
  let delay = options.initialDelay;
  
  while (attempt <= options.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === options.maxAttempts) {
        logger.error(`${context} failed after ${attempt} attempts`, { error });
        throw error;
      }
      
      logger.warn(`${context} failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts: options.maxAttempts,
        error: error.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
      attempt++;
    }
  }
  
  throw new Error('Retry logic error');
}
```

2. Apply to database initialization:
```typescript
// In PostgresMetricStore constructor
constructor() {
  this.pool = this.initializePool();
}

private async initializePool(): Promise<Pool> {
  return retryWithBackoff(
    async () => {
      const pool = new Pool(dbConfig);
      await pool.query('SELECT 1'); // Test connection
      return pool;
    },
    {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    },
    'Database connection'
  );
}
```

**Acceptance Criteria:**
- [ ] Retry logic implemented with exponential backoff
- [ ] Applied to database connection initialization
- [ ] Applied to critical database operations
- [ ] Maximum retry attempts configurable
- [ ] Retry attempts logged

**Testing:**
- Test retry with intermittent failures
- Verify exponential backoff timing
- Test max attempts exhausted

---

### 4.3: Implement Circuit Breaker Pattern

**Duration:** 2-3 days

**Description:**  
Add circuit breaker to prevent cascade failures.

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

export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  name: string
) {
  const options = {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    volumeThreshold: 10
  };
  
  const breaker = new CircuitBreaker(fn, options);
  
  breaker.on('open', () => {
    logger.warn(`Circuit breaker opened for ${name}`);
  });
  
  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open for ${name}`);
  });
  
  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${name}`);
  });
  
  return breaker;
}
```

3. Apply to database operations:
```typescript
// In PostgresMetricStore
private queryBreaker = createCircuitBreaker(
  (query: string, params: any[]) => this.pool.query(query, params),
  'PostgreSQL Query'
);

async findById(id: string): Promise<MetricDefinition | null> {
  try {
    const result = await this.queryBreaker.fire(
      'SELECT * FROM metrics WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    if (error.message === 'Breaker is open') {
      throw new AppError(
        ErrorCodes.DATABASE_ERROR,
        'Database temporarily unavailable',
        503
      );
    }
    throw error;
  }
}
```

**Acceptance Criteria:**
- [ ] Circuit breaker implemented
- [ ] Applied to all database operations
- [ ] Circuit state changes logged
- [ ] Fallback behavior defined
- [ ] Metrics exposed for monitoring

**Testing:**
- Test circuit opens after failures
- Test circuit closes after recovery
- Verify half-open state behavior

---

### 4.4: Optimize Connection Pool Configuration

**Duration:** 1-2 days

**Description:**  
Fine-tune connection pool settings for production.

**Steps:**
1. Update pool configuration:
```typescript
// src/storage/config.ts
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mdl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Max connections
  min: parseInt(process.env.DB_POOL_MIN || '5'),  // Min connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Wait 10s for connection
  
  // Statement timeout
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000,
  
  // SSL configuration
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};
```

2. Add connection pool monitoring:
```typescript
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Database connection acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err });
});
```

**Acceptance Criteria:**
- [ ] Connection pool optimized (20 max, 5 min)
- [ ] Timeouts configured (10s connection, 30s query)
- [ ] SSL support enabled
- [ ] Keep-alive configured
- [ ] Pool events monitored
- [ ] Environment variables for all settings

**Testing:**
- Test pool under load
- Monitor connection usage
- Test connection timeout
- Verify SSL connection

---

### 4.5: Implement Transaction Support

**Duration:** 2-3 days

**Description:**  
Add transaction wrappers for multi-step operations.

**Steps:**
1. Create transaction utility:
```typescript
// src/storage/transaction.ts
import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    logger.debug('Transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error });
    throw error;
  } finally {
    client.release();
  }
}
```

2. Use in complex operations:
```typescript
// Example: Create metric with audit log
async createMetricWithAudit(metric: MetricDefinition, userId: string): Promise<MetricDefinition> {
  return withTransaction(this.pool, async (client) => {
    // Insert metric
    const metricResult = await client.query(
      'INSERT INTO metrics (data) VALUES ($1) RETURNING *',
      [metric]
    );
    
    // Insert audit log
    await client.query(
      'INSERT INTO audit_log (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
      [userId, 'CREATE', 'metric', metricResult.rows[0].id]
    );
    
    return metricResult.rows[0];
  });
}
```

**Acceptance Criteria:**
- [ ] Transaction wrapper utility created
- [ ] Applied to multi-step operations
- [ ] Rollback on errors
- [ ] Transaction logging
- [ ] Nested transaction support (if needed)

**Testing:**
- Test successful transaction commit
- Test rollback on error
- Verify data consistency

---

### 4.6: Implement Graceful Degradation

**Duration:** 2 days

**Description:**  
Add fallback to file storage when database unavailable.

**Steps:**
1. Create storage factory:
```typescript
// src/storage/factory.ts
import { MetricStore } from './MetricStore';
import { PostgresMetricStore } from './PostgresMetricStore';
import { checkDatabaseHealth } from './healthCheck';

export async function createMetricStore(): Promise<IMetricStore> {
  if (process.env.STORAGE_TYPE === 'postgres') {
    try {
      const pgStore = new PostgresMetricStore();
      const health = await checkDatabaseHealth(pgStore.pool);
      
      if (health.status !== 'down') {
        logger.info('Using PostgreSQL storage');
        return pgStore;
      }
      
      logger.warn('PostgreSQL unavailable, falling back to file storage');
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL, using file storage', { error });
    }
  }
  
  logger.info('Using file-based storage');
  return new MetricStore();
}
```

2. Update server initialization:
```typescript
// In src/api/server.ts
const metricStore = await createMetricStore();
```

**Acceptance Criteria:**
- [ ] Storage factory with health check
- [ ] Automatic fallback to file storage
- [ ] Fallback logged clearly
- [ ] Environment variable to force storage type

**Testing:**
- Test with healthy database (uses PostgreSQL)
- Test with stopped database (falls back to file)
- Verify fallback logging

---

## Phase 1 Completion Checklist

### Task 1: Authentication & Authorization ✅
- [ ] JWT-based authentication implemented
- [ ] User model and database schema created
- [ ] Authentication middleware applied
- [ ] Login/registration endpoints working
- [ ] All API endpoints protected
- [ ] PostgreSQL credentials secured
- [ ] Role-based access control enforced
- [ ] API key authentication (optional)

### Task 2: Error Handling & Logging ✅
- [ ] Winston logging framework installed
- [ ] All console.log statements replaced
- [ ] Request logging with correlation IDs
- [ ] Error codes and standard responses
- [ ] Global error handler implemented
- [ ] Critical operations logged
- [ ] Log rotation configured (30 days)

### Task 3: Data Validation ✅
- [ ] Joi validation library installed
- [ ] Validation schemas for all models
- [ ] Validation middleware applied
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection implemented
- [ ] Rate limiting enabled

### Task 4: Database Management ✅
- [ ] Database health checks implemented
- [ ] Connection retry logic with backoff
- [ ] Circuit breaker pattern applied
- [ ] Connection pool optimized
- [ ] Transaction support implemented
- [ ] Graceful degradation to file storage

---

## Success Metrics

**Security:**
- 0 unauthenticated API access incidents
- 100% of endpoints protected
- 0 SQL injection vulnerabilities
- 0 XSS vulnerabilities

**Reliability:**
- Database health check passes 99.9% of time
- Connection failures handled gracefully
- Zero data loss incidents

**Observability:**
- 100% of operations logged
- Mean time to detection (MTTD) < 5 minutes
- All errors have correlation IDs

---

## Rollout Strategy

1. **Week 1-2:** Authentication & Authorization foundation
2. **Week 3-4:** Complete authentication, begin logging
3. **Week 5-6:** Data validation and security hardening
4. **Week 7-8:** Database reliability and final testing

---

## Dependencies

**External Services:**
- PostgreSQL 12+ (required)
- Log storage (optional: ELK, CloudWatch, etc.)

**Environment Variables Required:**
```bash
# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mdl
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=false
DB_POOL_MAX=20
DB_POOL_MIN=5

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

---

## Risk Mitigation

**Risk:** Authentication breaks existing integrations  
**Mitigation:** Provide API key fallback, clear migration guide

**Risk:** Logging impacts performance  
**Mitigation:** Async logging, log level configuration

**Risk:** Validation too strict breaks existing data  
**Mitigation:** Migration script to clean existing data

**Risk:** Database changes require downtime  
**Mitigation:** Schema migrations during maintenance window

---

**Next Phase:** [PHASE_2_MAJOR.md](./PHASE_2_MAJOR.md)
