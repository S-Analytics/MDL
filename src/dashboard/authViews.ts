/**
 * Authentication HTML views
 * Login, Register, Password Change pages
 */

export function getLoginPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MDL</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        .auth-container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        .auth-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .auth-header h1 {
            color: #667eea;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .auth-header p {
            color: #666;
            font-size: 0.95rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 0.875rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #5568d3;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .alert {
            padding: 0.875rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
            display: none;
        }
        .alert-error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
        .alert-success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
        }
        .auth-links {
            text-align: center;
            margin-top: 1.5rem;
        }
        .auth-links a {
            color: #667eea;
            text-decoration: none;
            font-size: 0.95rem;
        }
        .auth-links a:hover {
            text-decoration: underline;
        }
        .divider {
            margin: 1.5rem 0;
            text-align: center;
            color: #999;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your MDL account</p>
        </div>

        <div id="alert" class="alert"></div>

        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username or Email</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>

            <button type="submit" class="btn" id="loginBtn">Sign In</button>
        </form>

        <div class="auth-links">
            <a href="/auth/register">Don't have an account? Register</a>
            <div class="divider">•</div>
            <a href="/dashboard">Back to Dashboard</a>
        </div>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const alert = document.getElementById('alert');

        function showAlert(message, type = 'error') {
            alert.textContent = message;
            alert.className = 'alert alert-' + type;
            alert.style.display = 'block';
        }

        function hideAlert() {
            alert.style.display = 'none';
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();
            
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            const formData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store tokens in localStorage
                    if (data.tokens) {
                        localStorage.setItem('accessToken', data.tokens.access_token);
                        localStorage.setItem('refreshToken', data.tokens.refresh_token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                    }
                    // Redirect immediately - tokens are now in localStorage
                    window.location.href = '/dashboard';
                } else {
                    showAlert(data.error?.message || 'Login failed. Please check your credentials.');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                }
            } catch (error) {
                showAlert('Network error. Please try again.');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign In';
            }
        });
    </script>
</body>
</html>`;
}

export function getRegisterPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - MDL</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            color: #333;
        }
        .auth-container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 450px;
        }
        .auth-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .auth-header h1 {
            color: #667eea;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .auth-header p {
            color: #666;
            font-size: 0.95rem;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-group small {
            color: #666;
            font-size: 0.85rem;
            margin-top: 0.25rem;
            display: block;
        }
        .btn {
            width: 100%;
            padding: 0.875rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #5568d3;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .alert {
            padding: 0.875rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
            display: none;
        }
        .alert-error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
        .alert-success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
        }
        .auth-links {
            text-align: center;
            margin-top: 1.5rem;
        }
        .auth-links a {
            color: #667eea;
            text-decoration: none;
            font-size: 0.95rem;
        }
        .auth-links a:hover {
            text-decoration: underline;
        }
        .divider {
            margin: 1rem 0;
            text-align: center;
            color: #999;
            font-size: 0.9rem;
        }
        .password-requirements {
            background: #f9f9f9;
            padding: 1rem;
            border-radius: 6px;
            font-size: 0.85rem;
            color: #666;
            margin-top: 0.5rem;
        }
        .password-requirements ul {
            margin-left: 1.25rem;
            margin-top: 0.5rem;
        }
        .password-requirements li {
            margin-bottom: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-header">
            <h1>Create Account</h1>
            <p>Join MDL to manage your metrics</p>
        </div>

        <div id="alert" class="alert"></div>

        <form id="registerForm">
            <div class="form-group">
                <label for="username">Username *</label>
                <input type="text" id="username" name="username" required 
                       pattern="[a-zA-Z0-9_]{3,50}" autocomplete="username">
                <small>3-50 characters, letters, numbers, and underscores only</small>
            </div>

            <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" name="email" required autocomplete="email">
            </div>

            <div class="form-group">
                <label for="full_name">Full Name *</label>
                <input type="text" id="full_name" name="full_name" required autocomplete="name">
            </div>

            <div class="form-group">
                <label for="password">Password *</label>
                <input type="password" id="password" name="password" required 
                       minlength="8" autocomplete="new-password">
                <div class="password-requirements">
                    <strong>Password must contain:</strong>
                    <ul>
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character (!@#$%^&*)</li>
                    </ul>
                </div>
            </div>

            <div class="form-group">
                <label for="confirm_password">Confirm Password *</label>
                <input type="password" id="confirm_password" name="confirm_password" 
                       required autocomplete="new-password">
            </div>

            <button type="submit" class="btn" id="registerBtn">Create Account</button>
        </form>

        <div class="auth-links">
            <a href="/auth/login">Already have an account? Sign in</a>
            <div class="divider">•</div>
            <a href="/dashboard">Back to Dashboard</a>
        </div>
    </div>

    <script>
        const registerForm = document.getElementById('registerForm');
        const registerBtn = document.getElementById('registerBtn');
        const alert = document.getElementById('alert');

        function showAlert(message, type = 'error') {
            alert.textContent = message;
            alert.className = 'alert alert-' + type;
            alert.style.display = 'block';
        }

        function hideAlert() {
            alert.style.display = 'none';
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;

            // Validate passwords match
            if (password !== confirmPassword) {
                showAlert('Passwords do not match');
                return;
            }

            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$/;
            if (!passwordRegex.test(password)) {
                showAlert('Password does not meet requirements. Please check the criteria below.');
                return;
            }
            
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating account...';

            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                full_name: document.getElementById('full_name').value,
                password: password
            };

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert('Account created successfully! Redirecting to login...', 'success');
                    setTimeout(() => {
                        window.location.href = '/auth/login';
                    }, 1500);
                } else {
                    showAlert(data.error?.message || 'Registration failed. Please try again.');
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Create Account';
                }
            } catch (error) {
                showAlert('Network error. Please try again.');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
        });
    </script>
</body>
</html>`;
}

export function getChangePasswordPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Change Password - MDL</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            color: #333;
        }
        .auth-container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 450px;
        }
        .auth-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .auth-header h1 {
            color: #667eea;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .auth-header p {
            color: #666;
            font-size: 0.95rem;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-group small {
            color: #666;
            font-size: 0.85rem;
            margin-top: 0.25rem;
            display: block;
        }
        .btn {
            width: 100%;
            padding: 0.875rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #5568d3;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .alert {
            padding: 0.875rem;
            border-radius: 6px;
            margin-bottom: 1.5rem;
            display: none;
        }
        .alert-error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
        .alert-success {
            background: #efe;
            color: #3c3;
            border: 1px solid #cfc;
        }
        .auth-links {
            text-align: center;
            margin-top: 1.5rem;
        }
        .auth-links a {
            color: #667eea;
            text-decoration: none;
            font-size: 0.95rem;
        }
        .auth-links a:hover {
            text-decoration: underline;
        }
        .password-requirements {
            background: #f9f9f9;
            padding: 1rem;
            border-radius: 6px;
            font-size: 0.85rem;
            color: #666;
            margin-top: 0.5rem;
        }
        .password-requirements ul {
            margin-left: 1.25rem;
            margin-top: 0.5rem;
        }
        .password-requirements li {
            margin-bottom: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-header">
            <h1>Change Password</h1>
            <p>Update your account password</p>
        </div>

        <div id="alert" class="alert"></div>

        <form id="changePasswordForm">
            <div class="form-group">
                <label for="current_password">Current Password *</label>
                <input type="password" id="current_password" name="current_password" 
                       required autocomplete="current-password">
            </div>

            <div class="form-group">
                <label for="new_password">New Password *</label>
                <input type="password" id="new_password" name="new_password" 
                       required minlength="8" autocomplete="new-password">
                <div class="password-requirements">
                    <strong>Password must contain:</strong>
                    <ul>
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character (!@#$%^&*)</li>
                    </ul>
                </div>
            </div>

            <div class="form-group">
                <label for="confirm_password">Confirm New Password *</label>
                <input type="password" id="confirm_password" name="confirm_password" 
                       required autocomplete="new-password">
            </div>

            <button type="submit" class="btn" id="changePasswordBtn">Change Password</button>
        </form>

        <div class="auth-links">
            <a href="/dashboard">Back to Dashboard</a>
        </div>
    </div>

    <script>
        const changePasswordForm = document.getElementById('changePasswordForm');
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        const alert = document.getElementById('alert');

        // Check if user is logged in
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = '/auth/login';
        }

        function showAlert(message, type = 'error') {
            alert.textContent = message;
            alert.className = 'alert alert-' + type;
            alert.style.display = 'block';
        }

        function hideAlert() {
            alert.style.display = 'none';
        }

        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                showAlert('New passwords do not match');
                return;
            }

            // Validate password strength
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                showAlert('Password does not meet requirements. Please check the criteria below.');
                return;
            }
            
            changePasswordBtn.disabled = true;
            changePasswordBtn.textContent = 'Changing password...';

            const formData = {
                current_password: document.getElementById('current_password').value,
                new_password: newPassword
            };

            try {
                const response = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    showAlert('Password changed successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                } else {
                    showAlert(data.error?.message || 'Failed to change password. Please try again.');
                    changePasswordBtn.disabled = false;
                    changePasswordBtn.textContent = 'Change Password';
                }
            } catch (error) {
                showAlert('Network error. Please try again.');
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = 'Change Password';
            }
        });
    </script>
</body>
</html>`;
}
