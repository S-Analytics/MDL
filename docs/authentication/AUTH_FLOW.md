# Authentication Flow Documentation

## Overview
The dashboard now requires authentication when `AUTH_ENABLED=true` is set in the environment. Users must login before accessing the dashboard.

## Authentication Flow

### 1. Initial Access
When a user tries to access the dashboard (`/` or `/dashboard`):

1. **Server-side Check**: The Express route handler checks for JWT token in the `Authorization` header
2. **No Token**: Server redirects (302) to `/auth/login`
3. **Invalid Token**: After verification fails, server redirects (302) to `/auth/login`
4. **Valid Token**: Server serves the dashboard HTML

### 2. Client-side Check
The dashboard includes client-side authentication verification:

```javascript
// Runs immediately when dashboard loads
(function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/auth/login';
    }
})();
```

### 3. API Requests
All API requests from the dashboard include the authentication token:

```javascript
const token = localStorage.getItem('accessToken');
const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

fetch('/api/metrics', { headers })
```

### 4. Token Expiration Handling
If any API call returns a 401 status:
- Clear tokens from localStorage
- Redirect user to `/auth/login`
- User must login again to get new tokens

## User Journey

### First Visit (Unauthenticated)
1. User navigates to `http://localhost:3000/` or `http://localhost:3000/dashboard`
2. Server checks for JWT token in Authorization header
3. No token found → Server redirects (302) to `/auth/login`
4. Browser follows redirect
5. User sees login page

### Login Process
1. User enters credentials on `/auth/login`
2. Form submits to `POST /api/auth/login`
3. Server validates credentials
4. Server returns:
   - `accessToken` (valid for 15 minutes)
   - `refreshToken` (valid for 7 days)
5. Client stores both tokens in localStorage
6. Client redirects to `/dashboard`

### Accessing Dashboard (Authenticated)
1. User navigates to `/dashboard`
2. Client-side check finds `accessToken` in localStorage
3. Dashboard loads and makes API calls with token in headers
4. Server validates token for each request
5. Dashboard displays data

### Token Refresh (Automatic)
When the access token expires:
1. API returns 401 Unauthorized
2. Client can call `POST /api/auth/refresh` with refreshToken
3. Server validates refreshToken
4. Server issues new accessToken
5. Client stores new accessToken
6. Client retries original request

### Logout
1. User clicks "Logout" button in dashboard header
2. Client calls `POST /api/auth/logout` (invalidates refresh token)
3. Client removes tokens from localStorage
4. Client redirects to `/auth/login`

## Implementation Details

### Server-Side Protection

#### index.ts
```typescript
import { authenticate } from './middleware/auth';

if (authEnabled) {
  // Protected dashboard routes - redirect to login if not authenticated
  app.get('/', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.redirect('/auth/login');
    }
    authenticate(req, res, (err) => {
      if (err) {
        return res.redirect('/auth/login');
      }
      res.send(getDashboardHTML());
    });
  });

  app.get('/dashboard', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.redirect('/auth/login');
    }
    authenticate(req, res, (err) => {
      if (err) {
        return res.redirect('/auth/login');
      }
      res.send(getDashboardHTML());
    });
  });
} else {
  // Unprotected routes when auth is disabled
  app.get('/', (req, res) => {
    res.send(getDashboardHTML());
  });
  
  app.get('/dashboard', (req, res) => {
    res.send(getDashboardHTML());
  });
}
```

### Client-Side Protection

#### Immediate Check on Page Load
```javascript
(function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.warn('No access token found, redirecting to login');
        window.location.href = '/auth/login';
    }
})();
```

#### API Request with Token
```javascript
async function fetchData() {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    
    const response = await fetch('/api/metrics', { headers });
    
    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return;
    }
    
    // Process response...
}
```

#### Logout Function
```javascript
async function logout() {
    const token = localStorage.getItem('accessToken');
    
    // Invalidate server-side session
    if (token) {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
    }
    
    // Clear client-side tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login
    window.location.href = '/auth/login';
}
```

## Security Considerations

### Defense in Depth
1. **Server-Side Middleware**: Primary protection against unauthorized access
2. **Client-Side Checks**: Immediate feedback and better UX
3. **Token Expiration**: Short-lived access tokens (15 minutes)
4. **Refresh Token Rotation**: Long-lived but revocable refresh tokens
5. **HTTPS Required**: Tokens should only be transmitted over HTTPS in production

### Token Storage
- Tokens stored in `localStorage` (accessible by JavaScript)
- Alternative: Use `httpOnly` cookies for refresh tokens (more secure, but requires server changes)

### Attack Vectors Mitigated
- **Unauthorized Access**: Server-side middleware blocks requests without valid tokens
- **Token Theft**: Short-lived access tokens limit damage window
- **Session Hijacking**: Refresh tokens can be revoked server-side
- **XSS Attacks**: Token validation happens server-side, limiting impact

## Configuration

### Enable Authentication
```env
# .env file
AUTH_ENABLED=true
AUTH_STORAGE_MODE=file  # or 'database'
AUTH_FILE_PATH=./data/users.json

JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_TOKEN_EXPIRY=900        # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800    # 7 days
```

### Disable Authentication (Development Only)
```env
AUTH_ENABLED=false
```

When authentication is disabled:
- Dashboard is publicly accessible
- No login required
- API endpoints are unprotected

## Testing the Flow

### 1. Test Unauthenticated Access
```bash
# Start server
npm run dev

# Try to access dashboard (should redirect to login)
open http://localhost:3000/
```

### 2. Test Login Flow
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials (default: admin / Admin123!)
3. Verify redirect to dashboard
4. Check localStorage for tokens:
   ```javascript
   localStorage.getItem('accessToken')
   localStorage.getItem('refreshToken')
   ```

### 3. Test Protected Dashboard
1. Ensure you're logged in
2. Navigate to `http://localhost:3000/dashboard`
3. Dashboard should load successfully
4. Check browser Network tab - API requests should include `Authorization` header

### 4. Test Logout
1. Click "Logout" button in dashboard header
2. Verify redirect to login page
3. Check localStorage - tokens should be removed
4. Try to access dashboard - should redirect to login

### 5. Test Token Expiration
1. Login and access dashboard
2. Delete `accessToken` from localStorage:
   ```javascript
   localStorage.removeItem('accessToken')
   ```
3. Refresh page or trigger API call
4. Should redirect to login page

## Troubleshooting

### Issue: Stuck in redirect loop
**Cause**: Login page may be trying to authenticate
**Solution**: Ensure `/auth/login` route is NOT protected by `authenticate` middleware

### Issue: 401 errors on API calls
**Cause**: Token not being sent or invalid
**Solution**: 
- Check localStorage for `accessToken`
- Verify token is included in `Authorization` header
- Check token expiration
- Try logging out and logging back in

### Issue: Dashboard loads but shows no data
**Cause**: API calls failing authentication
**Solution**:
- Open browser console
- Check for 401 errors
- Verify token is being sent with API requests
- Check server logs for authentication errors

### Issue: Can't access dashboard even after login
**Cause**: Multiple possibilities
**Solution**:
1. Check if `AUTH_ENABLED=true` in `.env`
2. Verify tokens are stored in localStorage
3. Check browser console for errors
4. Verify server is running
5. Check server logs for authentication errors

## Best Practices

### For Development
1. Use default admin account (admin / Admin123!)
2. Keep `AUTH_ENABLED=true` to test auth flow
3. Use file-based storage for simplicity
4. Check browser console for authentication errors

### For Production
1. Change default admin password immediately
2. Use database storage mode for scalability
3. Enable HTTPS for token security
4. Set strong JWT secrets (32+ characters)
5. Configure appropriate token expiry times
6. Implement rate limiting on auth endpoints
7. Enable audit logging for auth events
8. Consider implementing 2FA for admin accounts

## API Endpoints

### Public Endpoints (No Authentication Required)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Protected Endpoints (Authentication Required)
- `GET /` - Dashboard home page
- `GET /dashboard` - Dashboard page
- `GET /api/metrics` - Get all metrics
- `POST /api/metrics` - Create metric
- `PUT /api/metrics/:id` - Update metric
- `DELETE /api/metrics/:id` - Delete metric
- `GET /api/stats` - Get statistics
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change password

### Admin-Only Endpoints
- `GET /admin/users` - User management page
- `GET /api/auth/users` - List all users
- `POST /api/auth/users` - Create user
- `PUT /api/auth/users/:id` - Update user
- `DELETE /api/auth/users/:id` - Delete user

## Summary

The authentication flow now ensures that:
1. ✅ Users must login before accessing the dashboard
2. ✅ Server validates JWT tokens on every request
3. ✅ Client checks for tokens and redirects to login if missing
4. ✅ Expired tokens trigger re-authentication
5. ✅ Users can logout securely
6. ✅ Authentication can be disabled for development
7. ✅ Both server-side and client-side protection are in place

This provides a secure, user-friendly authentication experience while maintaining backward compatibility (auth can be disabled via environment variable).
