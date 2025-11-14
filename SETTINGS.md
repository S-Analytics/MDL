# Settings Page Documentation

## Overview

MDL now includes a comprehensive Settings page accessible from the dashboard header. This allows users to view application information and configure data storage options.

## Features

### 1. Application Information

The settings page displays:
- **Version**: Current application version (1.0.0)
- **Build**: Build environment (Production/Development)
- **Environment**: Runtime environment (Desktop App or Web Browser)

### 2. Data Storage Configuration

Users can choose between two storage options:

#### Local File Storage (Default)
- ✅ No setup required
- ✅ Fast performance
- ✅ Portable and easy to backup
- Stores metrics in `.mdl/metrics.json`
- Ideal for single-user scenarios

#### Database Storage (Coming Soon)
- ⚠️ Requires database setup
- Supports PostgreSQL, MySQL, and MongoDB
- Ideal for multi-user environments
- Centralized data management
- Connection configuration includes:
  - Database type selection
  - Host and port
  - Database name
  - Username and password
  - Test connection functionality

### 3. About Section

Includes:
- Brief description of MDL
- Link to documentation
- Link to report issues on GitHub

## Accessing Settings

### From Dashboard
1. Click the **Settings** button (gear icon) in the top-right corner of the dashboard header
2. The Settings modal will open

### Keyboard Shortcut
- Press **ESC** to close the Settings modal

## Saving Settings

1. Configure your preferred storage type
2. If using database storage (when available), fill in connection details
3. Click **Test Connection** to verify database connectivity (coming soon)
4. Click **Save Settings** to apply changes
5. Settings are persisted in browser localStorage

## Current Storage Status

The settings page shows the currently active storage configuration:
- Local file storage displays the file path
- Database storage shows the connection string (when configured)

## Storage Configuration Details

### Local Storage
Settings are saved to:
- **Location**: Browser localStorage
- **Key**: `mdl_settings`
- **Format**: JSON

Example:
```json
{
  "storageType": "local",
  "savedAt": "2025-11-14T17:00:00.000Z"
}
```

### Database Storage (Future)
When database storage is configured:
```json
{
  "storageType": "database",
  "database": {
    "type": "postgresql",
    "host": "localhost",
    "port": "5432",
    "name": "mdl_metrics",
    "user": "admin"
  },
  "savedAt": "2025-11-14T17:00:00.000Z"
}
```

**Note**: Passwords are not stored in localStorage for security. The application would use secure credential storage or prompt for password on connection.

## Technical Implementation

### Frontend
- Settings modal with responsive design
- Radio button selection for storage type
- Conditional display of database configuration form
- Real-time validation and status updates
- Toast notifications for save confirmations

### Storage Layer
- Settings persisted in localStorage (`mdl_settings`)
- Metrics continue to use current storage layer (local file)
- Database integration prepared for future implementation

### Security Considerations
- Database passwords should not be stored in localStorage
- Future implementation will use:
  - Environment variables
  - Secure credential storage APIs
  - Server-side session management

## Future Enhancements

### Database Support
1. **Backend API Endpoints**
   - `/api/settings/database/test` - Test connection
   - `/api/settings/database/save` - Save configuration
   - `/api/settings/database/migrate` - Migrate existing data

2. **Database Schema**
   - Create tables for metrics, domains, objectives
   - Migration scripts for data import/export
   - Indexing for performance

3. **Connection Pooling**
   - Efficient database connection management
   - Connection retry logic
   - Health monitoring

### Additional Settings
- **UI Preferences**: Theme selection (light/dark mode)
- **Export Settings**: Default export format (JSON/YAML)
- **Notification Preferences**: Toast duration, position
- **Advanced**: Debug mode, API timeout settings

### Data Migration
- Tool to migrate from local storage to database
- Export/import functionality for backup
- Conflict resolution for concurrent edits

## Usage Examples

### Basic Setup (Local Storage)
1. Open Settings
2. Ensure "Local File Storage" is selected
3. Click "Save Settings"
4. Continue using the dashboard

### Database Setup (Future)
1. Open Settings
2. Select "Database Storage"
3. Choose database type (PostgreSQL/MySQL/MongoDB)
4. Enter connection details:
   - Host: `db.example.com`
   - Port: `5432`
   - Database: `mdl_metrics`
   - Username: `mdl_user`
   - Password: `secure_password`
5. Click "Test Connection"
6. If successful, click "Save Settings"
7. Application will migrate data to database

## Troubleshooting

### Settings Won't Save
- Check browser localStorage is enabled
- Ensure no browser extensions are blocking localStorage
- Try clearing browser cache

### Database Connection Fails (Future)
- Verify database server is running
- Check firewall rules allow connection
- Validate credentials are correct
- Ensure database exists and user has permissions

### Settings Reset on Browser Restart
- Check browser is not in private/incognito mode
- Ensure localStorage is not being cleared on exit
- Verify browser settings allow data persistence

## API Reference (Future)

### Test Database Connection
```bash
POST /api/settings/database/test
Content-Type: application/json

{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "name": "mdl_metrics",
  "user": "admin",
  "password": "secret"
}
```

Response:
```json
{
  "success": true,
  "message": "Connection successful",
  "version": "PostgreSQL 14.5"
}
```

### Save Database Configuration
```bash
POST /api/settings/database/save
Content-Type: application/json

{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "name": "mdl_metrics",
  "user": "admin"
}
```

Response:
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

## Best Practices

1. **Local Development**: Use local file storage for simplicity
2. **Production**: Consider database storage for multi-user access
3. **Backups**: Regularly backup `.mdl/metrics.json` or database
4. **Security**: Never commit database credentials to version control
5. **Testing**: Always test database connection before saving settings
6. **Migration**: Plan data migration during low-traffic periods

## Notes

- Database storage is currently in development
- Local file storage is production-ready and recommended
- Settings are stored in browser localStorage
- Database passwords are handled securely (not stored in localStorage)

---

For more information, see:
- [Main Documentation](../README.md)
- [API Documentation](../USAGE.md)
