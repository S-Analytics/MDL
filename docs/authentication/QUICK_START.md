# Quick Start: Testing Authentication Flow

## Prerequisites
- Node.js installed
- PostgreSQL installed (optional, can use file storage)
- Project dependencies installed (`npm install`)

## Step 1: Enable Authentication

Edit your `.env` file:

```env
# Enable authentication
AUTH_ENABLED=true

# Use file-based storage for simplicity
AUTH_STORAGE_MODE=file
AUTH_FILE_PATH=./data/users.json

# JWT secrets (use your own in production)
JWT_SECRET=my-super-secret-jwt-key-for-development
JWT_REFRESH_SECRET=my-super-secret-refresh-key-for-development

# Token expiry times (in seconds)
JWT_ACCESS_TOKEN_EXPIRY=900        # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800    # 7 days

# Auto-create default admin user
DEV_CREATE_DEFAULT_USER=true
DEFAULT_ADMIN_PASSWORD=Admin123!
```

## Step 2: Ensure Users File Exists

Create the users data directory and file:

```bash
mkdir -p data
echo '{"users":[],"refreshTokens":[],"apiKeys":[]}' > data/users.json
```

## Step 3: Start the Server

```bash
npm run dev
```

You should see in the logs:
```
🔐 Auth: http://localhost:3000/api/auth
   Endpoints: /register, /login, /logout, /refresh, /me
Auth pages enabled: /auth/login, /auth/register, /auth/change-password, /admin/users
⚠️  Default admin user created:
   Username: admin
   Password: Admin123!
   Change this password immediately!
```

## Step 4: Test the Authentication Flow

### Test 1: Unauthenticated Dashboard Access

1. Open browser to: `http://localhost:3000/`
2. **Expected Result**: Should immediately redirect to `/auth/login`
3. **What happens**:
   - Server checks for JWT token in Authorization header
   - No token found → server sends 302 redirect to `/auth/login`
   - Browser follows redirect
   - Login page is displayed

### Test 2: Login

1. On the login page (`/auth/login`), enter:
   - **Username**: `admin`
   - **Password**: `Admin123!`
2. Click "Login"
3. **Expected Result**: 
   - Successful login
   - Tokens stored in localStorage
   - Redirect to `/dashboard`

### Test 3: Access Dashboard (Authenticated)

1. After login, you should see the dashboard
2. Open browser DevTools (F12) → Console
3. Check for token:
   ```javascript
   localStorage.getItem('accessToken')
   ```
4. **Expected Result**: Should see a JWT token string

### Test 4: API Requests Include Token

1. Still in DevTools, go to Network tab
2. Refresh the dashboard
3. Click on any API request (e.g., `/api/metrics`)
4. Check Request Headers
5. **Expected Result**: Should see `Authorization: Bearer <token>`

### Test 5: Logout

1. Click the "Logout" button in the dashboard header (top right)
2. **Expected Result**:
   - Redirect to login page
   - Tokens removed from localStorage
3. Verify tokens are gone:
   ```javascript
   localStorage.getItem('accessToken')  // Should be null
   ```

### Test 6: Token Expiration

1. Login again
2. Open DevTools → Console
3. Delete the access token:
   ```javascript
   localStorage.removeItem('accessToken')
   ```
4. Refresh the page
5. **Expected Result**: Should redirect to login page

### Test 7: User Registration

1. Go to: `http://localhost:3000/auth/register`
2. Fill in the form:
   - **Username**: `testuser`
   - **Email**: `test@example.com`
   - **Password**: `Test123!@#` (must meet strength requirements)
   - **Full Name**: `Test User`
3. Click "Register"
4. **Expected Result**: Redirect to login page with success message
5. Login with the new credentials

### Test 8: Change Password

1. Login with any user
2. Go to: `http://localhost:3000/auth/change-password`
3. Fill in the form:
   - **Current Password**: (your current password)
   - **New Password**: (meet strength requirements)
   - **Confirm Password**: (match new password)
4. Click "Change Password"
5. **Expected Result**: Success message, then logout and login with new password

### Test 9: Admin User Management

1. Login as admin user
2. Go to: `http://localhost:3000/admin/users`
3. **Expected Result**: See list of all users
4. Test features:
   - **Create User**: Click "Create User" button
   - **Edit User**: Click edit icon on any user
   - **Filter**: Use role and status filters
   - **Search**: Search by username or email
   - **Delete**: Click delete icon (note: cannot delete yourself)

## Step 5: Verify Server-Side Protection

Test that the server is actually protecting the routes:

```bash
# Without token - should get 302 redirect to /auth/login
curl -i http://localhost:3000/dashboard

# With invalid token - should get 302 redirect to /auth/login
curl -i -H "Authorization: Bearer invalid_token" http://localhost:3000/dashboard

# With valid token - should get 200 with HTML (replace TOKEN with actual token from localStorage)
curl -i -H "Authorization: Bearer TOKEN" http://localhost:3000/dashboard
```

## Common Issues and Solutions

### Issue: "No access token found, redirecting to login"
**Cause**: Normal behavior for unauthenticated users
**Solution**: This is expected. Login to get a token.

### Issue: "Default admin user created" doesn't appear in logs
**Cause**: User already exists, or DEV_CREATE_DEFAULT_USER is false
**Solution**: 
- Check if admin user already exists in `data/users.json`
- Set `DEV_CREATE_DEFAULT_USER=true` in `.env`

### Issue: Login works but dashboard shows no data
**Cause**: Token not being sent with API requests
**Solution**:
- Open DevTools → Network tab
- Check if API requests have `Authorization` header
- If not, clear browser cache and try again

### Issue: Infinite redirect loop
**Cause**: Login page may be protected by authentication
**Solution**: Ensure `/auth/login` route is NOT using `authenticate` middleware

### Issue: Can't access dashboard even with valid token
**Cause**: Token may be expired or invalid
**Solution**:
- Check token expiry: `JWT_ACCESS_TOKEN_EXPIRY` in `.env`
- Try logging out and logging in again
- Check server logs for authentication errors

## Disable Authentication (If Needed)

To disable authentication and access dashboard without login:

1. Edit `.env`:
   ```env
   AUTH_ENABLED=false
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. Access dashboard directly: `http://localhost:3000/`

## Production Deployment Checklist

When deploying to production with authentication:

- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET` to strong random strings
- [ ] Change `DEFAULT_ADMIN_PASSWORD` to a strong password
- [ ] Set `AUTH_STORAGE_MODE=database` for scalability
- [ ] Enable HTTPS (tokens should only be sent over HTTPS)
- [ ] Set appropriate `JWT_ACCESS_TOKEN_EXPIRY` (default 15 min is good)
- [ ] Set `DEV_CREATE_DEFAULT_USER=false` in production
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring and alerting for failed login attempts
- [ ] Consider implementing 2FA for admin accounts
- [ ] Set up regular password rotation policies

## Next Steps

After confirming authentication works:

1. **Customize User Roles**:
   - Viewer (read-only)
   - Editor (CRUD operations)
   - Admin (full access)

2. **Add More Users**:
   - Use registration page
   - Or use admin panel at `/admin/users`

3. **Implement Password Reset**:
   - Email-based password reset flow
   - Forgot password functionality

4. **Add 2FA**:
   - TOTP-based 2FA
   - SMS-based 2FA

5. **Enable Audit Logging**:
   - Track all auth events
   - Monitor failed login attempts

## Support

For issues or questions:
1. Check server logs for errors
2. Check browser console for client-side errors
3. Review `docs/authentication/AUTH_SYSTEM.md`
4. Review `docs/authentication/AUTH_FLOW.md`

## Summary

✅ Authentication is now required to access the dashboard  
✅ Users must login with valid credentials  
✅ JWT tokens are used for session management  
✅ Tokens are validated on both client and server  
✅ Users can logout securely  
✅ Admin panel for user management  
✅ Can be disabled for development via environment variable
