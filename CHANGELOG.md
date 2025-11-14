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

### Planned Features
- Complete database backend implementation
- PostgreSQL, MySQL, and MongoDB adapters
- Data migration tools (local to database)
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
