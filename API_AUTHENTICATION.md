# API Authentication Summary

This document outlines the authentication and authorization requirements for all API endpoints.

## Authentication Middleware

- **optionalAuthenticate**: Allows public access but authenticates if JWT token is provided
- **requireEditor**: Requires EDITOR or ADMIN role
- **requireAdmin**: Requires ADMIN role only

## User Roles

- **VIEWER**: Read-only access
- **EDITOR**: Can create and update resources
- **ADMIN**: Full access including delete operations

## API Endpoints by Authentication Level

### Public Endpoints (Optional Authentication)

These endpoints are publicly accessible but will authenticate users if a JWT token is provided:

- `GET /health` - Health check (no auth required)
- `GET /api/metrics` - List all metrics
- `GET /api/metrics/:id` - Get metric by ID
- `GET /api/metrics/:id/policy` - Generate OPA policy for a metric
- `GET /api/policies` - Generate OPA policies for all metrics
- `GET /api/stats` - Get statistics

### Editor/Admin Endpoints (Requires EDITOR or ADMIN role)

These endpoints require users to have EDITOR or ADMIN role:

**Metric Operations:**
- `POST /api/metrics` - Create new metric
- `PUT /api/metrics/:id` - Update metric
- `POST /api/postgres/metrics` - Fetch metrics from PostgreSQL
- `POST /api/postgres/metrics/save` - Save/update metric in PostgreSQL

**Domain Operations:**
- `POST /api/postgres/domains` - Fetch domains from PostgreSQL
- `POST /api/postgres/domains/save` - Save/update domain in PostgreSQL

**Objective Operations:**
- `POST /api/postgres/objectives` - Fetch objectives from PostgreSQL
- `POST /api/postgres/objectives/save` - Save/update objective in PostgreSQL

**Other Operations:**
- `POST /api/export/objective/docx` - Export objective to DOCX
- `POST /api/import` - Import data (metrics, domains, objectives)
- `POST /api/database/test` - Test database connection

### Admin-Only Endpoints (Requires ADMIN role)

These endpoints require ADMIN role:

- `DELETE /api/metrics/:id` - Delete metric
- `POST /api/postgres/metrics/delete` - Delete metric from PostgreSQL
- `POST /api/postgres/domains/delete` - Delete domain from PostgreSQL
- `POST /api/postgres/objectives/delete` - Delete objective from PostgreSQL

## Authentication Methods

### JWT Token Authentication

Include the JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### API Key Authentication

Include the API key in the X-API-Key header:

```
X-API-Key: <api_key>
```

## Example Authenticated Requests

### Get Metrics (Public - Optional Auth)

```bash
# Without authentication
curl http://localhost:3000/api/metrics

# With authentication
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/metrics
```

### Create Metric (Requires EDITOR or ADMIN)

```bash
curl -X POST http://localhost:3000/api/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"metric_id": "m001", "name": "Test Metric", ...}'
```

### Delete Metric (Requires ADMIN)

```bash
curl -X DELETE http://localhost:3000/api/metrics/m001 \
  -H "Authorization: Bearer <token>"
```

## Getting Authentication Tokens

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123",
    "role": "EDITOR"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "...",
      "username": "user@example.com",
      "role": "EDITOR"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

## Error Responses

### 401 Unauthorized

Returned when no valid authentication is provided for a protected endpoint:

```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden

Returned when the authenticated user doesn't have the required role:

```json
{
  "success": false,
  "error": "Insufficient permissions. Required role: ADMIN"
}
```

## Security Notes

1. **Access tokens expire after 15 minutes** - Use refresh tokens to obtain new access tokens
2. **Refresh tokens expire after 7 days** - Users must login again after this period
3. **API keys never expire** - Store them securely and rotate regularly
4. **All authentication uses bcrypt** - Passwords are hashed with salt rounds of 10
5. **JWT secret is configurable** - Set via JWT_SECRET environment variable (default: "your-secret-key")

## Default Admin Account

A default admin account is created on first startup:
- Username: `admin`
- Password: `admin123`
- Role: `ADMIN`

**⚠️ IMPORTANT: Change the default password immediately in production!**
