# Authentication System Documentation

## Overview

The MDL (Metrics Definition Language) project now includes a comprehensive JWT-based authentication and authorization system with role-based access control (RBAC).

## Features

✅ **JWT Authentication**: Secure token-based authentication with access and refresh tokens  
✅ **Role-Based Access Control**: Three roles (Viewer, Editor, Admin) with different permissions  
✅ **Password Security**: Bcrypt password hashing with strength validation  
✅ **API Key Support**: Generate and manage API keys for programmatic access  
✅ **Refresh Tokens**: Long-lived refresh tokens for seamless token renewal  
✅ **User Management**: Complete CRUD operations for user accounts  
✅ **Dual Storage**: File-based (development) and PostgreSQL (production) implementations  
✅ **Security Best Practices**: Timing-safe comparisons, secure token storage, password complexity requirements

## Architecture

### Components

```
src/
├── models/User.ts              # User models and interfaces
├── auth/
│   ├── IUserStore.ts          # User storage interface
│   ├── FileUserStore.ts       # File-based storage (development)
│   ├── PostgresUserStore.ts   # PostgreSQL storage (production)
│   └── jwt.ts                 # JWT token utilities
├── middleware/
│   └── auth.ts                # Authentication middleware
├── api/
│   └── auth.ts                # Authentication API routes
└── validation/
    └── schemas.ts             # Joi validation schemas (includes auth schemas)
```

### User Roles

| Role   | Permissions                                    |
|--------|------------------------------------------------|
| VIEWER | Read-only access to metrics and data          |
| EDITOR | Can read and modify metrics                   |
| ADMIN  | Full access including user management         |

### User Status

- **ACTIVE**: User can log in and access the system
- **INACTIVE**: User cannot log in (disabled account)
- **SUSPENDED**: User temporarily suspended

## API Endpoints

### Public Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "role": "viewer"  // optional, defaults to "viewer"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "viewer",
    "status": "active",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Response:** Same as register response

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

### Authenticated Endpoints

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <access_token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**Note:** Changes password and revokes all refresh tokens, forcing re-login on all devices.

### API Key Endpoints

#### List API Keys
```http
GET /api/auth/api-keys
Authorization: Bearer <access_token>
```

#### Create API Key
```http
POST /api/auth/api-keys
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My API Key",
  "description": "For automated scripts",
  "scopes": ["metrics:read", "metrics:write"],
  "expires_at": "2026-01-01T00:00:00.000Z"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "api_key": "mdl_1234567890abcdef...",
  "key_info": {
    "key_id": "uuid",
    "name": "My API Key",
    "scopes": ["metrics:read", "metrics:write"],
    "created_at": "2025-01-01T00:00:00.000Z",
    "expires_at": "2026-01-01T00:00:00.000Z"
  },
  "message": "Store this API key securely. It will not be shown again."
}
```

**Important:** The raw API key is only shown once. Store it securely!

#### Use API Key
```http
GET /api/metrics
X-API-Key: mdl_1234567890abcdef...
```

#### Revoke API Key
```http
DELETE /api/auth/api-keys/:id
Authorization: Bearer <access_token>
```

### Admin Endpoints

Requires `admin` role.

#### List Users
```http
GET /api/auth/users?limit=10&offset=0&role=editor&status=active
Authorization: Bearer <access_token>
```

#### Get User by ID
```http
GET /api/auth/users/:id
Authorization: Bearer <access_token>
```

**Note:** Users can access their own profile; admins can access any profile.

#### Update User
```http
PUT /api/auth/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Updated Name",
  "role": "editor",
  "status": "active"
}
```

#### Delete User
```http
DELETE /api/auth/users/:id
Authorization: Bearer <access_token>
```

**Note:** Cannot delete your own account.

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here                    # Secret for access tokens
JWT_REFRESH_SECRET=your-refresh-secret-here        # Secret for refresh tokens
JWT_ACCESS_TOKEN_EXPIRY=900                        # Access token expiry (seconds, default: 15 minutes)
JWT_REFRESH_TOKEN_EXPIRY=604800                    # Refresh token expiry (seconds, default: 7 days)

# Authentication
AUTH_ENABLED=true                                  # Enable authentication endpoints
```

### Password Requirements

- Minimum length: 8 characters
- Maximum length: 128 characters
- Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character (@$!%*?&)

### Token Expiry

- **Access Token**: 15 minutes (short-lived for security)
- **Refresh Token**: 7 days (long-lived for convenience)

Use the refresh token to get a new access token when it expires.

## Usage Examples

### Using Authentication in Server

```typescript
import { FileUserStore } from './auth/FileUserStore';
import { createServer } from './api/server';
import { MetricStore } from './storage/MetricStore';

const metricStore = new MetricStore();
const userStore = new FileUserStore();

await userStore.initialize();

const app = createServer(metricStore, {
  port: 3000,
  userStore,
  enableAuth: true
});

app.listen(3000);
```

### Protecting Custom Routes

```typescript
import { authenticate, requireAdmin } from './middleware/auth';

// Require authentication
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Require admin role
app.post('/api/admin-only', authenticate, requireAdmin, (req, res) => {
  // Only admins can access this
});

// Require specific role
import { authorize, UserRole } from './middleware/auth';

app.put('/api/metrics/:id', 
  authenticate, 
  authorize([UserRole.EDITOR, UserRole.ADMIN]),
  (req, res) => {
    // Only editors and admins can access
  }
);
```

### Using API Keys

```typescript
import { authenticateApiKey } from './middleware/auth';

app.get('/api/public-data',
  authenticateApiKey(() => userStore),
  (req, res) => {
    // Accessible with API key via X-API-Key header
    res.json({ user: req.user });
  }
);
```

## Storage Implementations

### File-Based Storage (Development)

```typescript
import { FileUserStore } from './auth/FileUserStore';

const userStore = new FileUserStore('./data/users.json');
await userStore.initialize();
```

**Storage Location:** `data/users.json`

**Structure:**
```json
{
  "users": [...],
  "refreshTokens": [...],
  "apiKeys": [...]
}
```

### PostgreSQL Storage (Production)

```typescript
import { Pool } from 'pg';
import { PostgresUserStore } from './auth/PostgresUserStore';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mdl',
  user: 'mdl_user',
  password: 'password'
});

const userStore = new PostgresUserStore(pool);
await userStore.initialize();  // Creates tables automatically
```

**Tables Created:**
- `users`: User accounts
- `refresh_tokens`: Stored refresh tokens
- `api_keys`: API key records

## Security Considerations

### Token Storage

- **Access Tokens**: Store in memory (not localStorage)
- **Refresh Tokens**: Store in httpOnly cookies or secure storage
- Never expose tokens in URLs or logs

### Password Security

- Passwords are hashed with bcrypt (10 salt rounds)
- Password strength validation enforced
- Timing-safe comparisons prevent timing attacks

### API Key Security

- API keys use SHA-256 hashing for storage
- Prefix `mdl_` for easy identification
- Keys are 64 hex characters (256 bits)
- Timing-safe verification prevents attacks

### Token Revocation

- Logout revokes refresh token
- Password change revokes all refresh tokens
- Expired tokens automatically cleaned up

### Database Security

- Prepared statements prevent SQL injection
- Foreign key constraints maintain integrity
- Indexes optimize query performance

## Testing

### Manual Testing with curl

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!"}'

# Access protected endpoint
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'

# Create API key
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Key","scopes":["metrics:read"]}'

# Use API key
curl -X GET http://localhost:3000/api/metrics \
  -H "X-API-Key: mdl_..."
```

## Troubleshooting

### "Token expired" Error
- Access tokens expire after 15 minutes
- Use the refresh token to get a new access token
- Implement automatic token refresh in your client

### "Invalid token" Error
- Ensure Bearer token is correctly formatted: `Authorization: Bearer <token>`
- Check JWT_SECRET matches between token generation and verification
- Verify token hasn't been tampered with

### "Account is not active" Error
- User status must be "active"
- Admin can update user status via PUT /api/auth/users/:id

### Password doesn't meet requirements
- Check password validation rules
- Ensure minimum 8 characters with upper, lower, digit, and special character

## Future Enhancements

Potential improvements for future iterations:

- [ ] Email verification on registration
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 integration (Google, GitHub, etc.)
- [ ] Session management dashboard
- [ ] Audit logging for security events
- [ ] Rate limiting on auth endpoints
- [ ] IP-based access restrictions
- [ ] API key usage analytics

## License

Same as the main MDL project.
