# Changelog

All notable changes to the Metric Definition Language (MDL) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-11-18

### Added

#### Metric Versioning System
- **Semantic Versioning**: Automatic version tracking following semver standards (MAJOR.MINOR.PATCH)
  - **Major version bump** (X.0.0): Breaking changes (formula, unit, category modifications)
  - **Minor version bump** (x.X.0): Feature changes (name, description, business domain updates)
  - **Patch version bump** (x.x.X): Minor updates (tags, governance, status changes)
  - New `version` field in `MetricMetadata` interface
  - Automatic version calculation based on field changes
  - Works in both local file and PostgreSQL storage
- **Change History Tracking**: Complete audit trail for all metric modifications
  - `change_history` array storing all version changes
  - Each entry includes: version, timestamp, changed_by, change_type, changes_summary, fields_changed
  - Tracks which specific fields were modified in each update
  - Maintains full chronological history from creation to current state
- **Enhanced Metadata Interface**: Extended `MetricMetadata` with versioning fields
  - `version`: Current semver version (e.g., "2.1.3")
  - `created_at`: ISO timestamp of metric creation
  - `created_by`: User who created the metric
  - `last_updated`: ISO timestamp of last modification
  - `last_updated_by`: User who made the last update
  - `change_history`: Array of `ChangeHistoryEntry` objects
- **Dashboard UI Enhancements**: Visual change history timeline in metric details
  - Color-coded version badges (red=major, orange=minor, green=patch)
  - Reverse chronological display with newest changes first
  - Shows version number, timestamp, change type, summary, and fields changed
  - Latest change highlighted with different background
  - Scrollable timeline for long histories (max 300px height)
  - Prominent version display in metadata section
- **Storage Layer Updates**:
  - `InMemoryMetricStore`: Versioning logic in create/update methods
  - `PostgresMetricStore`: Same versioning logic with metadata JSONB column
  - `bumpVersion()`: Helper function to increment version numbers
  - `determineChangeType()`: Analyzes changes to select appropriate version bump
- **Database Schema**: Added `metadata` JSONB column to metrics table
  - Stores complete versioning information
  - Migration script provided for existing databases
  - Supports indexing and querying on version fields
- **Documentation**: Comprehensive versioning guide (`VERSIONING_IMPLEMENTATION.md`)
  - Detailed versioning rules and examples
  - Testing instructions for all change types
  - Database migration guide
  - API integration examples
  - Future enhancement suggestions

#### Bug Fixes
- **Strategic Alignment Dynamic Calculation**: Fixed metric details not showing current objective linkages
  - Added `calculateMetricAlignment()` function to scan objectives for metric references
  - Updates strategic alignment in real-time based on current objective/key result data
  - Shows all objectives where metric is linked (supports multiple alignments)
  - Displays objective name, key result details, business priority, and strategic theme
  - Backwards compatible with old static alignment data
- **Business Domain Dropdown Persistence**: Fixed dropdown not showing saved value on edit
  - Added `setTimeout()` to defer dropdown population until DOM is fully ready
  - Ensures selected value is properly set when reopening metric for edit
  - Resolves timing issue with form rendering and selection

#### Local Storage Management
- **Clean Local Storage Script**: New utility script to clear all data from JSON file storage
  - File: `scripts/clean-local-storage.js` - Clears metrics, domains, and objectives
  - NPM command: `npm run storage:clean` - Easy-to-use command
  - Features:
    - Interactive confirmation prompt (requires typing "DELETE ALL DATA")
    - `--confirm` flag to skip confirmation for automation
    - `--path` option to specify custom metrics.json location
    - Automatic backup creation with timestamps before deletion
    - Clears `.mdl/metrics.json`, `examples/sample-domains.json`, and `examples/sample-objectives.json`
    - Shows before/after record counts for verification
    - Provides recovery instructions for backups
  - Safety features:
    - Creates timestamped backups (e.g., `.mdl/metrics.json.backup-2025-11-18T12-30-00-000Z`)
    - Verification of deletion success
    - Clear warning messages about data loss
    - Instructions for backup restoration
  - Similar to `clean-sample-data-postgres.js` but for file storage
  - Updated `scripts/README.md` with comprehensive documentation

## [Unreleased] - 2025-11-15

### Added

#### API Testing Collection
- **Insomnia Collection**: Comprehensive API testing collection with 20+ pre-configured requests
  - File: `insomnia-collection.json` - Ready to import into Insomnia
  - Documentation: `INSOMNIA_COLLECTION.md` - Detailed usage guide
  - Quick Reference: `INSOMNIA_QUICK_REFERENCE.md` - At-a-glance request overview
  - Organized into 8 logical groups:
    1. Health checks
    2. Metrics (File Storage) - CRUD operations
    3. Policies - OPA policy generation
    4. Statistics - Aggregated metrics data
    5. PostgreSQL Metrics - Database operations
    6. PostgreSQL Domains - Business domain management
    7. PostgreSQL Objectives - Objectives and key results
    8. Database testing - Connection validation
  - Pre-configured environment variables for easy setup
  - Sample request bodies with realistic data
  - Dynamic variables for unique IDs (timestamps)
  - All endpoints from OpenAPI specification included
  - Full CRUD workflows for metrics, domains, and objectives
  - PostgreSQL operations with proper database config structure

#### Dashboard Visualization
- **Sunburst Chart**: Interactive hierarchical visualization combining Business Domain and Tier data
  - D3.js integration for advanced data visualization
  - Two-level hierarchy: Tier (inner ring) → Business Domain (outer ring)
  - 12-color palette with automatic cycling
  - Interactive features:
    - Hover tooltips with detailed information
    - Dynamic center text updates
    - Opacity changes on hover
    - Click interactions for exploration
  - Responsive design (300x300px, scales with container)
  - Automatic data grouping and counting
  - Handles missing/unassigned categories gracefully
  - Labels on larger segments for readability
  - White stroke separation between segments
  - Replaces previous side-by-side pie charts

### Changed
- **Dashboard Charts**: Replaced two separate pie charts with single combined sunburst chart
  - Provides better visualization of hierarchical relationships
  - Reduces vertical space usage
  - More intuitive understanding of metric distribution
  - Shows cross-dimensional relationships (Tier × Domain)

### Documentation
- Updated `README.md` with Insomnia collection information
- Added comprehensive API testing documentation
- Included quick start workflows for API testing
- Provided troubleshooting guide for common issues

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

- **Comprehensive Test Suite**: Full test coverage for PostgreSQL stores
  - `PostgresMetricStore.test.ts` - 40+ tests for metric CRUD operations
  - `PostgresDomainStore.test.ts` - 30+ tests for domain management
  - `PostgresObjectiveStore.test.ts` - 35+ tests for objectives with key results
  - Test helpers for database setup and cleanup (`tests/helpers/database.ts`)
  - Automatic test data cleanup with TEST- and test- prefixes
  - Connection pooling and concurrency tests
  - Transaction and rollback tests
  - Error handling and validation tests
  - Tests skip gracefully when database not configured
  - Updated tests/README.md with PostgreSQL testing guide

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
