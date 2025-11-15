# Changelog

All notable changes to the Metric Definition Language (MDL) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-14

### Added

#### User Interface Enhancements
- **Icon-Based UI**: Replaced text buttons with professional SVG icons
  - Add Domain button with plus icon
  - Add Objective button with target icon
  - Add Metric button with chart icon
  - Import button with upload icon
  - Export button with download icon
  - Refresh button with refresh icon
  - Edit buttons with pencil icons on all cards
  - Delete buttons with trash icons on all cards
  - Add/Remove Key Result buttons with plus/minus icons
  - Hover tooltips explaining each button's function
  - Smooth CSS transitions and animations

#### Settings & Configuration
- **Settings Page**: Comprehensive configuration interface
  - Application information display (version, build type, environment)
  - Storage type selection (Local File Storage vs Database Storage)
  - Database configuration form with connection parameters
    - Database type selector (PostgreSQL, MySQL, MongoDB)
    - Host, port, database name fields
    - Username and password fields
    - Test connection functionality (UI ready, backend pending)
  - Current storage status display
  - Settings persistence to localStorage
  - About section with GitHub links
  - Keyboard shortcuts (ESC to close)
  - Click-outside-to-close functionality
  - Toast notifications for save confirmation

#### Objective Reporting
- **Download Objective Reports**: Generate comprehensive reports for objectives
  - Download button on each objective card
  - Multiple format support:
    - Markdown (.md) - fully functional, ideal for documentation
    - HTML - styled reports (ready for PDF/Word conversion)
    - PDF - requires jsPDF library (UI ready)
    - Word (.docx) - requires docx library (UI ready)
  - Report contents:
    - Complete objective details (ID, name, description, owner, status, priority)
    - All key results with progress tracking
    - Associated metrics with formulas and definitions
    - Progress calculations and status indicators
    - Summary statistics (total KRs, metrics, average progress)
  - Visual format selection modal
  - Automatic filename generation from objective ID and name
  - Professional report styling and formatting
  - Keyboard shortcuts and click-outside-to-close

#### Core Features
- **Metric Management**
  - Create, read, update, and delete metric definitions
  - YAML and JSON format support
  - Metric validation with schema compliance
  - Sample metrics for quick start

- **Domain Organization**
  - Group metrics by business domains
  - Visual domain cards with metric counts
  - Add and manage domains dynamically
  - Domain filtering and organization

- **Objectives & Key Results (OKRs)**
  - Define business objectives
  - Link metrics to objectives as key results
  - Track progress toward goals
  - Visual OKR cards with completion status

- **Data Visualization**
  - Interactive dashboard with statistics
  - Metric cards with detailed information
  - Domain and objective overview
  - Visual indicators for metric health

- **Import/Export**
  - Bulk import metrics from JSON/YAML files
  - Export all metrics for backup or sharing
  - Sample data files for testing
  - Format validation on import

- **REST API**
  - Full RESTful API for all operations
  - `/api/metrics` - Metric CRUD operations
  - `/api/domains` - Domain management
  - `/api/objectives` - Objective management
  - `/api/stats` - Dashboard statistics
  - `/api/health` - Health check endpoint
  - `/api/catalog` - Complete catalog export
  - OpenAPI specification included

#### Developer Experience
- **TypeScript Support**: Full TypeScript implementation
  - Type-safe metric definitions
  - Interface definitions for all models
  - Comprehensive type checking

- **Testing Infrastructure**
  - Jest test framework setup
  - Unit tests for core modules
    - ConfigLoader tests
    - MetricStore tests
    - PolicyGenerator tests
  - Test coverage reporting
  - Sample test data

- **Build & Development**
  - TypeScript compilation with source maps
  - Development mode with hot reload
  - Production build optimization
  - Multiple package manager support (npm, yarn, pnpm)

- **Scripts & Utilities**
  - Icon generation script for multiple platforms
  - Sample data loader script
  - Build scripts for all platforms
  - Development and production modes

#### Documentation
- **Comprehensive Documentation**
  - README.md with quick start guide
  - USAGE.md with detailed API usage
  - SETTINGS.md for configuration guide
  - USAGE_COMPARISON.md comparing usage modes
  - OpenAPI specification (openapi.yaml)
  - Code examples and sample data

#### Configuration & Storage
- **Flexible Storage Options**
  - Local file storage (default, `.mdl/metrics.json`)
  - Database support UI ready (PostgreSQL, MySQL, MongoDB)
  - Settings persistence via localStorage
  - Configuration file support

- **OPA Integration Ready**
  - Policy generator for metric governance
  - Policy evaluation framework
  - Rego policy templates

### Technical Details

#### Dependencies
- **Runtime**
  - Node.js 18+ support
  - Express.js for API server
  - TypeScript 5.x

- **Development**
  - Jest for testing
  - TypeScript compiler
  - ESLint and Prettier for code quality

#### Project Structure
```
MDL/
├── src/
│   ├── api/           # REST API endpoints
│   ├── config/        # Configuration loader
│   ├── dashboard/     # Web UI views
│   ├── models/        # Data models
│   ├── opa/           # Policy generator
│   └── storage/       # Data persistence
├── tests/             # Test suites
├── examples/          # Sample data
├── scripts/           # Utility scripts
├── assets/            # Application icons
└── docs/              # Documentation
```

#### Performance
- Fast local file storage
- Efficient in-memory caching
- Lightweight API endpoints
- Quick dashboard load times
- Responsive UI interactions

#### Security
- Secure credential handling (ready)
- Input validation on all forms
- Safe file operations
- CORS configuration

### Changed
- Dashboard header updated with Settings button
- Button styling updated to icon-based design throughout application
- Package.json updated with streamlined scripts

### Developer Notes
- Database backend integration is prepared but not yet implemented
- Test connection feature shows "coming soon" status
- Database credentials should not be stored in localStorage (secure backend needed)
- Future versions will include:
  - Complete database backend
  - Data migration tools
  - Theme selection (light/dark mode)
  - Additional settings options
  - Enhanced OPA policy features

### Installation
```bash
# Development mode
npm install
npm run dev

# Production mode
npm run build
npm start

# Load sample data
npm run load:samples
```

### Usage Modes
1. **Web Application**: Run server and access via browser at http://localhost:3000/dashboard
2. **CLI Mode**: Command-line interface for automation
3. **API Mode**: RESTful API for integration at http://localhost:3000/api

### Breaking Changes
None - Initial release

### Migration Guide
Not applicable - Initial release

---

## [Unreleased]

### Added

#### PostgreSQL Database Integration (Full CRUD)
- **Complete PostgreSQL Backend**: Full database storage implementation
  - PostgresMetricStore: Create, read, update, delete metrics
  - PostgresDomainStore: Create, read, update, delete business domains
  - PostgresObjectiveStore: Create, read, update, delete objectives with key results
  - Connection pooling with configurable parameters
  - Transaction support for atomic operations
  - JSONB fields for flexible schema storage

- **REST API Endpoints**: Comprehensive PostgreSQL operations
  - `POST /api/postgres/metrics` - Fetch metrics from database
  - `POST /api/postgres/metrics/save` - Create or update metric
  - `POST /api/postgres/metrics/delete` - Delete metric
  - `POST /api/postgres/domains` - Fetch business domains
  - `POST /api/postgres/domains/save` - Create or update domain
  - `POST /api/postgres/domains/delete` - Delete domain
  - `POST /api/postgres/objectives` - Fetch objectives with key results
  - `POST /api/postgres/objectives/save` - Create or update objective
  - `POST /api/postgres/objectives/delete` - Delete objective (CASCADE)
  - `POST /api/database/test` - Test database connection
  - All endpoints support both create and update operations with `isUpdate` flag

- **Dashboard Integration**: Seamless storage switching
  - Automatic routing to PostgreSQL endpoints when database storage enabled
  - Storage type indicator in UI (🗄️ Database / 💾 Local)
  - Settings persistence with database configuration
  - Real-time storage type display
  - Graceful fallback to local file storage

- **Database Scripts**: Comprehensive database management
  - `scripts/setup-database.js` - Create database schema
  - `scripts/load-sample-data-postgres.js` - Load sample data
  - `scripts/clean-sample-data-postgres.js` - Clean all data (NEW)
  - `scripts/db-setup.sql` - DDL for manual setup
  - npm scripts: `db:setup`, `db:load`, `db:clean`

- **OpenAPI Specification Updates**: Complete API documentation
  - Added PostgreSQL tag for database operations
  - Added Domains tag for business domain operations
  - Added Objectives tag for objective/key result operations
  - Documented all PostgreSQL endpoints with request/response schemas
  - Added PostgresConfig, BusinessDomain, Objective, KeyResult schemas
  - Examples for all database operations

#### Database Cleaning Script
- **clean-sample-data-postgres.js**: Safe data deletion utility
  - Interactive confirmation prompt (requires typing "DELETE ALL DATA")
  - `--confirm` flag to skip confirmation for automation
  - Shows current record counts before deletion
  - Deletes in correct order respecting foreign key constraints
  - Verification of successful deletion
  - Detailed deletion summary with row counts
  - Comprehensive error handling and user-friendly messages
  - Full documentation in scripts/README.md

### Fixed

#### Critical Form Field Bug
- **Disabled Field FormData Issue**: Fixed ID regeneration bug
  - Problem: Disabled form fields (metric_id, objective_id, domain_id) were not included in FormData during edit operations
  - Impact: FormData.get() returned null, causing code to generate new IDs and create duplicates
  - Solution: Use JavaScript variables (editingMetricId, editingObjectiveId, editingDomainId) directly when in edit mode
  - Applied fix to all three entity types: metrics, domains, objectives
  - Prevents duplicate records and ensures proper updates

#### ID Generation Strategy
- **Smart ID Management**: Generate only when necessary
  - Objectives: `OBJ-YYYYMMDDHHMMSS` format (only if empty)
  - Domains: `{name-slug}-{last4digits}` format (only if empty)
  - Key Results: `{objective_id}:KR-{index}` format (objective-scoped)
  - Preserves existing IDs during edit operations
  - No timestamp-based IDs that caused duplicates

### Changed

- **Update Operations**: Improved database update behavior
  - Objectives: DELETE all existing key results, then INSERT new ones (prevents duplicates)
  - Transactional updates for atomicity (BEGIN/COMMIT/ROLLBACK)
  - Proper handling of created_at vs updated_at timestamps

- **Debug Logging**: Enhanced troubleshooting
  - Server logs show isUpdate flag, existing record checks
  - Logs display whether CREATE or UPDATE operation is called
  - Metric IDs and key result IDs logged for verification

- **Cache Control**: Browser caching prevention
  - Added cache control headers to dashboard route
  - Prevents stale JavaScript from being served
  - Headers: no-store, no-cache, must-revalidate, proxy-revalidate

### Technical Details

#### Database Schema
- **Tables**: business_domains, metrics, objectives, key_results
- **Views**: metrics_with_domains, objectives_summary, key_results_with_objectives
- **Foreign Keys**: CASCADE deletes for objectives → key results, SET NULL for domain references
- **Indexes**: Primary keys, foreign keys, GIN indexes on JSONB fields
- **Triggers**: Automatic updated_at timestamp management

#### Storage Architecture
- **Dual Storage Support**: Seamless switching between local files and PostgreSQL
- **Store Interfaces**: IMetricStore, IDomainStore, IObjectiveStore
- **Implementation**: PostgresMetricStore, PostgresDomainStore, PostgresObjectiveStore
- **Connection Management**: Pooling with max 10 connections, 30s idle timeout, 2s connection timeout

### Planned Features
- MySQL and MongoDB adapters
- Data migration tools (local to database, database to database)
- Theme selection (light/dark mode)
- Advanced settings options
- Enhanced policy evaluation
- Multi-user collaboration features
- Audit logging
- Backup and restore functionality
- Plugin system for extensibility

---

**Legend:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security updates

[1.0.0]: https://github.com/S-Analytics/MDL/releases/tag/v1.0.0
