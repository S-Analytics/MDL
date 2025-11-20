# Authentication Setup and Usage Guide

This guide shows how to enable and use the authentication system in the MDL application.

## Quick Start

### 1. Enable Authentication

Update your `.env` file:

```bash
# Enable authentication
AUTH_ENABLED=true

# JWT secrets (change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Token expiry (in seconds)
JWT_ACCESS_TOKEN_EXPIRY=900        # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800    # 7 days

# Storage mode: 'file' for development, 'postgres' for production
AUTH_STORAGE_MODE=file
AUTH_FILE_PATH=./data/users.json

# Default admin password (development only)
DEFAULT_ADMIN_PASSWORD=Admin123!
```

### 2. Start the Server with Authentication

Create a new file `src/index-with-auth.ts`:

```typescript
import dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import { createServer } from './api';
import { FileUserStore } from './auth/FileUserStore';
import { PostgresUserStore } from './auth/PostgresUserStore';
import { getDashboardHTML } from './dashboard';
import { errorHandlingMiddleware, notFoundMiddleware } from './middleware/logging';
import { InMemoryMetricStore } from './storage';
import { DatabasePool } from './utils/database';
import { logger, logStartup } from './utils/logger';

dotenv.config();

async function startServer() {
  // Initialize metric store
  const DEFAULT_STORAGE_PATH = process.env.PERSISTENCE_PATH || 
    path.join(process.cwd(), '.mdl', 'metrics.json');
  const metricStore = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);

  // Initialize user store based on configuration
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  let userStore = undefined;

  if (authEnabled) {
    const authMode = process.env.AUTH_STORAGE_MODE || 'file';
    
    if (authMode === 'postgres') {
      // PostgreSQL user storage
      const dbPool = new DatabasePool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'mdl',
        user: process.env.DB_USER || 'mdl',
        password: process.env.DB_PASSWORD || '',
      });
      
      await dbPool.connect();
      userStore = new PostgresUserStore(dbPool);
      await userStore.initialize();
      
      logger.info('User authentication initialized (PostgreSQL)');
    } else {
      // File-based user storage
      const userFilePath = process.env.AUTH_FILE_PATH || './data/users.json';
      userStore = new FileUserStore(userFilePath);
      await userStore.initialize();
      
      logger.info({ path: userFilePath }, 'User authentication initialized (File)');
    }

    // Create default admin user in development
    if (process.env.NODE_ENV === 'development' && process.env.DEV_CREATE_DEFAULT_USER === 'true') {
      const existingAdmin = await userStore.findByUsername('admin');
      if (!existingAdmin) {
        const { hashPassword } = await import('./auth/jwt');
        const { UserRole } = await import('./models/User');
        
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
        const passwordHash = await hashPassword(password);
        
        await userStore.create({
          username: 'admin',
          email: 'admin@mdl.local',
          password_hash: passwordHash,
          full_name: 'System Administrator',
          role: UserRole.ADMIN,
        });
        
        logger.info('Default admin user created');
        logger.info(`   Username: admin`);
        logger.info(`   Password: ${password}`);
        logger.info('   ⚠️  Change this password in production!');
      }
    }
  }

  // Create API server with auth configuration
  const app = createServer(metricStore, {
    enableAuth: authEnabled,
    userStore,
  });

  // Serve static files
  app.use('/examples', express.static(path.join(process.cwd(), 'examples')));

  // Dashboard routes
  app.get('/', (req, res) => res.send(getDashboardHTML()));
  app.get('/dashboard', (req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.send(getDashboardHTML());
  });

  // Error handlers
  app.use(notFoundMiddleware);
  app.use(errorHandlingMiddleware);

  // Start listening
  const PORT = parseInt(process.env.PORT || '3000');
  const HOST = process.env.HOST || '0.0.0.0';

  app.listen(PORT, HOST, () => {
    logger.info('╔══════════════════════════════════════════════════════════════╗');
    logger.info('║  MDL - Metrics Definition Library                           ║');
    logger.info('╚══════════════════════════════════════════════════════════════╝');
    
    logStartup({
      port: PORT,
      host: HOST,
      storageMode: process.env.STORAGE_MODE || 'local',
      dbConnected: false,
    });
    
    logger.info(`🚀 Server: http://${HOST}:${PORT}`);
    logger.info(`📊 Dashboard: http://${HOST}:${PORT}/dashboard`);
    logger.info(`🔌 API: http://${HOST}:${PORT}/api/metrics`);
    
    if (authEnabled) {
      logger.info(`🔐 Auth: http://${HOST}:${PORT}/api/auth`);
      logger.info(`   Endpoints: /register, /login, /logout, /refresh, /me`);
    }
    
    logger.info(`💚 Health: http://${HOST}:${PORT}/health`);
  });
}

startServer().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
```

### 3. Protect Your API Routes

Update `src/api/server.ts` to protect specific routes:

```typescript
import { authenticate, requireEditor, requireAdmin } from '../middleware/auth';

// Public endpoint (no auth required)
app.get('/api/metrics', validateQuery(metricQuerySchema), 
  asyncHandler(async (req, res) => {
    const metrics = await store.findAll();
    res.json({ success: true, data: metrics });
  })
);

// Protected endpoint (requires authentication)
app.post('/api/metrics', 
  authenticate,  // Must be logged in
  requireEditor,  // Must have editor or admin role
  validateBody(metricDefinitionSchema),
  asyncHandler(async (req, res) => {
    const metric = await store.create(req.body);
    res.json({ success: true, data: metric });
  })
);

// Admin-only endpoint
app.delete('/api/metrics/:id',
  authenticate,
  requireAdmin,  // Must be admin
  validateParams(metricIdParamSchema),
  asyncHandler(async (req, res) => {
    await store.delete(req.params.id);
    res.json({ success: true });
  })
);
```

### 4. Create Admin User

Run the script to create a default admin:

```bash
npm run ts-node scripts/create-admin.ts
```

Or manually via API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecureAdmin123!",
    "full_name": "Administrator",
    "role": "admin"
  }'
```

### 5. Test Authentication

Run the comprehensive test suite:

```bash
./scripts/test-auth.sh
```

Or test manually:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Save the access_token from the response, then:

# Access protected endpoint
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Usage Examples

### Client-Side Authentication Flow

```javascript
class MDLAuthClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();
    this.accessToken = data.tokens.access_token;
    this.refreshToken = data.tokens.refresh_token;
    
    return data.user;
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });

    if (!response.ok) {
      // Refresh token expired, need to re-login
      this.accessToken = null;
      this.refreshToken = null;
      throw new Error('Session expired');
    }

    const data = await response.json();
    this.accessToken = data.tokens.access_token;
    this.refreshToken = data.tokens.refresh_token;
  }

  async request(endpoint, options = {}) {
    // Add authorization header
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, options);

    // If token expired, try to refresh
    if (response.status === 401) {
      await this.refreshAccessToken();
      
      // Retry with new token
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
      response = await fetch(`${this.baseUrl}${endpoint}`, options);
    }

    return response;
  }

  async getMetrics() {
    const response = await this.request('/api/metrics');
    return response.json();
  }

  async createMetric(metricData) {
    const response = await this.request('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricData)
    });
    return response.json();
  }
}

// Usage
const client = new MDLAuthClient('http://localhost:3000');
await client.login('admin', 'Admin123!');
const metrics = await client.getMetrics();
```

### Using API Keys

```bash
# Create an API key
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Automation Key",
    "description": "For CI/CD pipeline",
    "scopes": ["metrics:read", "metrics:write"]
  }'

# Use the API key (save it from the response!)
curl -X GET http://localhost:3000/api/metrics \
  -H "X-API-Key: mdl_1234567890abcdef..."
```

## Security Best Practices

1. **Change default credentials** immediately in production
2. **Use environment variables** for all secrets
3. **Use HTTPS** in production
4. **Rotate JWT secrets** periodically
5. **Set short token expiry** times (15 minutes for access tokens)
6. **Store refresh tokens securely** (httpOnly cookies recommended)
7. **Implement rate limiting** on auth endpoints
8. **Log authentication events** for auditing
9. **Use PostgreSQL storage** in production (not file-based)
10. **Regularly review and revoke** unused API keys

## Troubleshooting

### Token Expired Too Quickly
Increase `JWT_ACCESS_TOKEN_EXPIRY` in `.env` (value in seconds).

### Can't Access Protected Routes
Ensure:
1. You're including the `Authorization: Bearer <token>` header
2. Token hasn't expired (check timestamp)
3. User has the required role (viewer/editor/admin)

### PostgreSQL Connection Issues
Verify database credentials and ensure tables are created:
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public';
```

Should show: `users`, `refresh_tokens`, `api_keys`

## Additional Resources

- Full API documentation: `AUTHENTICATION.md`
- Security considerations: See "Security" section in main README
- Examples: `examples/` directory
