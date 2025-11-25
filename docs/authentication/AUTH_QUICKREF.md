# Authentication Quick Reference

## 🔐 Environment Setup

```bash
# .env
AUTH_ENABLED=true
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_TOKEN_EXPIRY=900      # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800  # 7 days
AUTH_STORAGE_MODE=file           # or 'postgres'
DEFAULT_ADMIN_PASSWORD=Admin123!
```

## 📝 Quick Start Commands

```bash
# Create admin user
npm run ts-node scripts/create-admin.ts

# Test authentication
./scripts/test-auth.sh

# Start with auth enabled
# Update src/index.ts to enable auth (see examples/AUTHENTICATION_SETUP.md)
npm run dev
```

## 🔑 API Endpoints

### Public Endpoints
```bash
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
POST /api/auth/refresh     # Refresh access token
```

### Authenticated Endpoints
```bash
POST /api/auth/logout         # Logout (revoke token)
GET  /api/auth/me             # Get current user
POST /api/auth/change-password # Change password
GET  /api/auth/api-keys       # List API keys
POST /api/auth/api-keys       # Create API key
DELETE /api/auth/api-keys/:id # Revoke API key
```

### Admin Endpoints
```bash
GET    /api/auth/users     # List all users
GET    /api/auth/users/:id # Get user by ID
PUT    /api/auth/users/:id # Update user
DELETE /api/auth/users/:id # Delete user
```

## 💻 Code Examples

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

### Access Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create API Key
```bash
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Key","scopes":["metrics:read"]}'
```

### Use API Key
```bash
curl -X GET http://localhost:3000/api/metrics \
  -H "X-API-Key: mdl_..."
```

## 🛡️ Protecting Routes

```typescript
import { authenticate, requireEditor, requireAdmin } from '../middleware/auth';

// Require authentication
app.get('/api/protected', authenticate, handler);

// Require editor role
app.post('/api/metrics', authenticate, requireEditor, handler);

// Require admin role
app.delete('/api/metrics/:id', authenticate, requireAdmin, handler);
```

## 👥 User Roles

- **viewer**: Read-only access
- **editor**: Read and write access
- **admin**: Full access including user management

## ⏱️ Token Lifecycle

1. **Login** → Receive access token (15 min) + refresh token (7 days)
2. **Access expires** → Use refresh token to get new access token
3. **Refresh expires** → Must login again
4. **Logout** → Revokes refresh token

## 📚 Full Documentation

- Complete guide: `AUTHENTICATION.md`
- Setup guide: `examples/AUTHENTICATION_SETUP.md`
- Test suite: `scripts/test-auth.sh`

## ⚠️ Security Notes

- Change default passwords in production
- Use HTTPS in production
- Store tokens securely (not in localStorage)
- Rotate secrets periodically
- Use PostgreSQL storage in production
