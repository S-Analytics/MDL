# Authentication System

The MDL application includes a comprehensive authentication and user management system with support for multiple storage backends.

## Features

- **User Registration & Login** - Self-service user registration with secure password requirements
- **Role-Based Access Control (RBAC)** - Three user roles: Viewer, Editor, and Admin
- **Password Management** - Secure password change functionality
- **Admin User Management** - Complete user CRUD operations for administrators
- **Flexible Storage** - Support for both file-based and database-based user storage
- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **API Key Support** - Generate and manage API keys for programmatic access

## User Roles

### Viewer (Default)
- Read-only access to metrics
- View dashboards and reports
- Cannot create or modify resources

### Editor
- All Viewer permissions
- Create, update, and delete metrics
- Manage domains and objectives
- Import/export data

### Admin
- All Editor permissions
- Full user management capabilities
- System configuration access
- Access to admin-only endpoints

## Storage Modes

### File-Based Storage (Default)

Stores user data in a JSON file, suitable for development and small deployments.

**Configuration:**
```env
AUTH_ENABLED=true
AUTH_STORAGE_MODE=file
AUTH_FILE_PATH=./data/users.json
```

**Advantages:**
- No database required
- Simple setup
- Easy backup (single file)
- Suitable for development

**Limitations:**
- Not suitable for high-concurrency environments
- Limited scalability
- File locking issues in distributed deployments

### Database Storage (PostgreSQL)

Stores user data in PostgreSQL database, recommended for production deployments.

**Configuration:**
```env
AUTH_ENABLED=true
AUTH_STORAGE_MODE=database

# Database connection (same as metrics database)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mdl
DB_USER=postgres
DB_PASSWORD=your_password
```

**Advantages:**
- Production-ready
- High concurrency support
- ACID compliance
- Suitable for distributed deployments
- Better performance at scale

**Database Schema:**
The system automatically creates the following tables:
- `users` - User accounts with credentials
- `refresh_tokens` - JWT refresh tokens
- `api_keys` - API keys for programmatic access

## Authentication Pages

### Login Page
**URL:** `/auth/login`

User login interface with username/email and password fields.

**Features:**
- Email or username login
- Remember credentials
- Redirects to dashboard on success
- Error handling with user-friendly messages

### Registration Page
**URL:** `/auth/register`

Self-service user registration interface.

**Features:**
- Username validation (3-50 chars, alphanumeric + underscore)
- Email validation
- Password strength requirements
- Full name field
- Real-time validation feedback

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

### Change Password Page
**URL:** `/auth/change-password`

Allows authenticated users to change their password.

**Features:**
- Current password verification
- New password validation
- Password confirmation
- Secure token-based authentication

### Admin User Management Page
**URL:** `/admin/users`

**Access:** Admin role required

Complete user management interface for administrators.

**Features:**
- View all users with filtering (role, status, search)
- Create new users
- Edit existing users
- Delete users (except self)
- Update user roles and status
- Real-time search by username/email

## API Endpoints

### Public Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

Response includes:
- `access_token` - Short-lived JWT (15 minutes default)
- `refresh_token` - Long-lived token (7 days default)
- `user` - User profile information

#### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your-refresh-token"
}
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Protected Endpoints

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### Change Password
```
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

### Admin Endpoints

#### List Users
```
GET /api/auth/users?limit=100&offset=0&role=editor&status=active
Authorization: Bearer <admin_access_token>
```

Query parameters:
- `limit` - Number of users to return (default: 100)
- `offset` - Pagination offset (default: 0)
- `role` - Filter by role (admin/editor/viewer)
- `status` - Filter by status (active/inactive)

#### Create User (Admin)
```
POST /api/auth/users
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "username": "new_user",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "New User",
  "role": "editor",
  "status": "active"
}
```

#### Get User by ID
```
GET /api/auth/users/:id
Authorization: Bearer <admin_access_token>
```

#### Update User
```
PUT /api/auth/users/:id
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Updated Name",
  "role": "editor",
  "status": "active"
}
```

#### Delete User
```
DELETE /api/auth/users/:id
Authorization: Bearer <admin_access_token>
```

## Setup Instructions

### Development Setup

1. **Enable Authentication**
   ```bash
   # Edit .env file
   AUTH_ENABLED=true
   AUTH_STORAGE_MODE=file
   ```

2. **Start the Server**
   ```bash
   npm run dev
   ```

3. **Access Auth Pages**
   - Login: http://localhost:3000/auth/login
   - Register: http://localhost:3000/auth/register
   - User Management: http://localhost:3000/admin/users

4. **Default Admin Account**
   
   If `DEV_CREATE_DEFAULT_USER=true` in development mode:
   - Username: `admin`
   - Password: `Admin123!` (or value from `DEFAULT_ADMIN_PASSWORD`)
   
   **⚠️ Change this password immediately in production!**

### Production Setup (Database Storage)

1. **Configure Database**
   ```bash
   # .env file
   AUTH_ENABLED=true
   AUTH_STORAGE_MODE=database
   
   DB_HOST=your-db-host
   DB_PORT=5432
   DB_NAME=mdl
   DB_USER=your-db-user
   DB_PASSWORD=your-secure-password
   ```

2. **Initialize Database**
   
   The application automatically creates necessary tables on first run.

3. **Create Admin User**
   
   Use the registration API or enable `DEV_CREATE_DEFAULT_USER` temporarily:
   
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "email": "admin@yourcompany.com",
       "password": "YourSecurePassword123!",
       "full_name": "System Administrator",
       "role": "admin"
     }'
   ```

4. **Set JWT Secrets**
   ```bash
   # Generate secure random secrets
   JWT_SECRET=$(openssl rand -base64 32)
   JWT_REFRESH_SECRET=$(openssl rand -base64 32)
   ```

5. **Configure Token Expiry**
   ```bash
   JWT_ACCESS_TOKEN_EXPIRY=900        # 15 minutes
   JWT_REFRESH_TOKEN_EXPIRY=604800    # 7 days
   ```

## Security Best Practices

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, number, and special character
- Passwords are hashed using bcrypt with configurable rounds
- No password history stored

### Token Security
- Access tokens are short-lived (15 minutes default)
- Refresh tokens are long-lived (7 days default)
- Refresh tokens are stored hashed in database
- Tokens are revoked on logout
- Token reuse detection available

### API Key Security
- API keys are SHA-256 hashed before storage
- Only hash is stored in database
- Key is shown only once during creation
- Keys can have expiration dates
- Keys track last used timestamp

### Environment Variables
Never commit these to version control:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PASSWORD`
- `DEFAULT_ADMIN_PASSWORD`

### HTTPS
Always use HTTPS in production:
```bash
# Nginx reverse proxy example
server {
    listen 443 ssl;
    server_name mdl.yourcompany.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Users Table Not Created
If using database storage and tables aren't created:
```bash
# Check database connection
npm run dev

# Look for "Authentication initialized (PostgreSQL storage)" in logs

# Manually create tables if needed (see PostgresUserStore.ts)
```

### Cannot Login as Admin
1. Check if admin user exists:
   ```sql
   SELECT * FROM users WHERE role = 'admin';
   ```

2. Create admin user via API or SQL:
   ```sql
   -- Use hashed password from bcrypt
   INSERT INTO users (user_id, username, email, password_hash, full_name, role, status, created_at, updated_at)
   VALUES (gen_random_uuid(), 'admin', 'admin@local', '<bcrypt_hash>', 'Administrator', 'admin', 'active', NOW(), NOW());
   ```

### Token Expired Errors
- Increase `JWT_ACCESS_TOKEN_EXPIRY` for longer sessions
- Use refresh token endpoint to get new access token
- Check server time synchronization (NTP)

### CORS Issues
Configure CORS in .env:
```bash
CORS_ORIGIN=https://yourfrontend.com
CORS_CREDENTIALS=true
```

## Migration Guide

### From File to Database Storage

1. **Export users from file:**
   ```javascript
   const fs = require('fs');
   const users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));
   ```

2. **Update configuration:**
   ```bash
   AUTH_STORAGE_MODE=database
   ```

3. **Restart application** (creates database tables)

4. **Import users** (write migration script using API endpoints)

### From Database to File Storage

1. **Export users via API:**
   ```bash
   curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/auth/users?limit=10000 > users.json
   ```

2. **Format for file storage** (transform JSON structure)

3. **Update configuration:**
   ```bash
   AUTH_STORAGE_MODE=file
   ```

4. **Place users.json in AUTH_FILE_PATH location**

## API Client Examples

### JavaScript/TypeScript
```typescript
class MDLClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  
  async login(username: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    this.accessToken = data.tokens.access_token;
    this.refreshToken = data.tokens.refresh_token;
    
    return data.user;
  }
  
  async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.request(url, options);
    }
    
    return response.json();
  }
  
  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });
    
    const data = await response.json();
    this.accessToken = data.access_token;
  }
}
```

### Python
```python
import requests

class MDLClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
    
    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        data = response.json()
        self.access_token = data["tokens"]["access_token"]
        self.refresh_token = data["tokens"]["refresh_token"]
        return data["user"]
    
    def request(self, method, path, **kwargs):
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.access_token}"
        
        response = requests.request(
            method,
            f"{self.base_url}{path}",
            headers=headers,
            **kwargs
        )
        
        if response.status_code == 401:
            self.refresh_access_token()
            return self.request(method, path, **kwargs)
        
        return response.json()
    
    def refresh_access_token(self):
        response = requests.post(
            f"{self.base_url}/api/auth/refresh",
            json={"refresh_token": self.refresh_token}
        )
        data = response.json()
        self.access_token = data["access_token"]
```

## Related Documentation

- [API Documentation](../api/README.md)
- [Security Guide](../security/SECURITY.md)
- [Deployment Guide](../deployment/README.md)
- [Environment Variables](../.env.example)
