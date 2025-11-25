/**
 * Admin User Management HTML view
 * For administrators to manage users
 */

export function getUserManagementPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - MDL</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 1.8rem;
        }
        .header-actions {
            display: flex;
            gap: 1rem;
        }
        .btn {
            padding: 0.625rem 1.25rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary {
            background: white;
            color: #667eea;
        }
        .btn-primary:hover {
            background: #f0f0f0;
        }
        .btn-secondary {
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.5);
        }
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .btn-sm {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        .section {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .section-header h2 {
            color: #667eea;
            font-size: 1.5rem;
        }
        .filters {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }
        .filter-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .filter-group label {
            font-weight: 500;
            color: #555;
        }
        .filter-group select, .filter-group input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 0.95rem;
        }
        .table-container {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: #f8f9fa;
        }
        th, td {
            padding: 0.875rem 1rem;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        th {
            font-weight: 600;
            color: #555;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .badge-admin {
            background: #dc3545;
            color: white;
        }
        .badge-editor {
            background: #667eea;
            color: white;
        }
        .badge-viewer {
            background: #6c757d;
            color: white;
        }
        .badge-active {
            background: #28a745;
            color: white;
        }
        .badge-inactive {
            background: #ffc107;
            color: #000;
        }
        .action-btns {
            display: flex;
            gap: 0.5rem;
        }
        .alert {
            padding: 0.875rem 1rem;
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
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            overflow: auto;
        }
        .modal-content {
            background: white;
            margin: 5% auto;
            padding: 2rem;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .modal-header h3 {
            color: #667eea;
            font-size: 1.5rem;
        }
        .close {
            font-size: 2rem;
            font-weight: bold;
            color: #999;
            cursor: pointer;
            border: none;
            background: none;
        }
        .close:hover {
            color: #333;
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
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        .modal-footer {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
        }
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #999;
        }
        .empty-state svg {
            width: 80px;
            height: 80px;
            margin-bottom: 1rem;
            opacity: 0.3;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>👥 User Management</h1>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="showCreateUserModal()">+ Create User</button>
                <button class="btn btn-secondary" onclick="window.location.href='/dashboard'">Back to Dashboard</button>
            </div>
        </div>
    </div>

    <div class="container">
        <div id="alert" class="alert"></div>

        <div class="section">
            <div class="section-header">
                <h2>Users</h2>
                <button class="btn btn-secondary btn-sm" onclick="loadUsers()">Refresh</button>
            </div>

            <div class="filters">
                <div class="filter-group">
                    <label>Role:</label>
                    <select id="roleFilter" onchange="loadUsers()">
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="statusFilter" onchange="loadUsers()">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Search:</label>
                    <input type="text" id="searchInput" placeholder="Username or email..." 
                           oninput="filterUsers()" style="min-width: 250px;">
                </div>
            </div>

            <div class="table-container">
                <table id="usersTable">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Full Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <tr>
                            <td colspan="8" class="empty-state">
                                <div>Loading users...</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Create/Edit User Modal -->
    <div id="userModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Create User</h3>
                <button class="close" onclick="closeUserModal()">&times;</button>
            </div>
            
            <form id="userForm">
                <input type="hidden" id="userId" name="userId">
                
                <div class="form-group">
                    <label for="username">Username *</label>
                    <input type="text" id="username" name="username" required>
                </div>

                <div class="form-group">
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                </div>

                <div class="form-group">
                    <label for="full_name">Full Name *</label>
                    <input type="text" id="full_name" name="full_name" required>
                </div>

                <div class="form-group">
                    <label for="role">Role *</label>
                    <select id="role" name="role" required>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div class="form-group" id="passwordGroup">
                    <label for="password">Password *</label>
                    <input type="password" id="password" name="password" minlength="8">
                    <small>At least 8 characters with uppercase, lowercase, number, and special character</small>
                </div>

                <div class="form-group">
                    <label for="status">Status *</label>
                    <select id="status" name="status" required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeUserModal()">Cancel</button>
                    <button type="submit" class="btn btn-success" id="saveUserBtn">Save User</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let allUsers = [];
        const token = localStorage.getItem('accessToken');
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        // Check if user is admin
        if (!token || currentUser.role !== 'admin') {
            alert('Access denied. Admin role required.');
            window.location.href = '/dashboard';
        }

        function showAlert(message, type = 'error') {
            const alert = document.getElementById('alert');
            alert.textContent = message;
            alert.className = 'alert alert-' + type;
            alert.style.display = 'block';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }

        async function loadUsers() {
            try {
                const role = document.getElementById('roleFilter').value;
                const status = document.getElementById('statusFilter').value;
                
                let url = '/api/auth/users?limit=1000';
                if (role) url += '&role=' + role;
                if (status) url += '&status=' + status;

                const response = await fetch(url, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (!response.ok) {
                    throw new Error('Failed to load users');
                }

                const data = await response.json();
                allUsers = data.users || [];
                renderUsers(allUsers);
            } catch (error) {
                showAlert('Failed to load users: ' + error.message);
            }
        }

        function filterUsers() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            if (!search) {
                renderUsers(allUsers);
                return;
            }

            const filtered = allUsers.filter(user => 
                user.username.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search) ||
                (user.full_name && user.full_name.toLowerCase().includes(search))
            );
            renderUsers(filtered);
        }

        function renderUsers(users) {
            const tbody = document.getElementById('usersTableBody');
            
            if (users.length === 0) {
                tbody.innerHTML = \`
                    <tr>
                        <td colspan="8" class="empty-state">
                            <div>No users found</div>
                        </td>
                    </tr>
                \`;
                return;
            }

            tbody.innerHTML = users.map(user => \`
                <tr>
                    <td><strong>\${user.username}</strong></td>
                    <td>\${user.email}</td>
                    <td>\${user.full_name || '-'}</td>
                    <td><span class="badge badge-\${user.role}">\${user.role.toUpperCase()}</span></td>
                    <td><span class="badge badge-\${user.status}">\${user.status.toUpperCase()}</span></td>
                    <td>\${formatDate(user.created_at)}</td>
                    <td>\${user.last_login_at ? formatDate(user.last_login_at) : 'Never'}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn btn-primary btn-sm" onclick="editUser('\${user.user_id}')">Edit</button>
                            \${user.user_id !== currentUser.user_id ? \`
                                <button class="btn btn-danger btn-sm" onclick="deleteUser('\${user.user_id}', '\${user.username}')">Delete</button>
                            \` : ''}
                        </div>
                    </td>
                </tr>
            \`).join('');
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }

        function showCreateUserModal() {
            document.getElementById('modalTitle').textContent = 'Create User';
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.getElementById('password').required = true;
            document.getElementById('passwordGroup').style.display = 'block';
            document.getElementById('userModal').style.display = 'block';
        }

        function editUser(userId) {
            const user = allUsers.find(u => u.user_id === userId);
            if (!user) return;

            document.getElementById('modalTitle').textContent = 'Edit User';
            document.getElementById('userId').value = user.user_id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('full_name').value = user.full_name;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status;
            document.getElementById('password').value = '';
            document.getElementById('password').required = false;
            document.getElementById('passwordGroup').style.display = 'none';
            document.getElementById('userModal').style.display = 'block';
        }

        function closeUserModal() {
            document.getElementById('userModal').style.display = 'none';
        }

        async function deleteUser(userId, username) {
            if (!confirm(\`Are you sure you want to delete user "\${username}"? This action cannot be undone.\`)) {
                return;
            }

            try {
                const response = await fetch(\`/api/auth/users/\${userId}\`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }

                showAlert('User deleted successfully', 'success');
                loadUsers();
            } catch (error) {
                showAlert('Failed to delete user: ' + error.message);
            }
        }

        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = document.getElementById('userId').value;
            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                full_name: document.getElementById('full_name').value,
                role: document.getElementById('role').value,
                status: document.getElementById('status').value
            };

            const password = document.getElementById('password').value;
            if (password) {
                formData.password = password;
            }

            try {
                const url = userId ? \`/api/auth/users/\${userId}\` : '/api/auth/users';
                const method = userId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error?.message || 'Failed to save user');
                }

                showAlert(\`User \${userId ? 'updated' : 'created'} successfully\`, 'success');
                closeUserModal();
                loadUsers();
            } catch (error) {
                showAlert('Failed to save user: ' + error.message);
            }
        });

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('userModal');
            if (event.target === modal) {
                closeUserModal();
            }
        }

        // Load users on page load
        loadUsers();
    </script>
</body>
</html>`;
}
