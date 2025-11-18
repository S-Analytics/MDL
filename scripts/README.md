# MDL Scripts

Utility scripts for managing the Metrics Definition Library.

## Available Scripts

### setup-database.js

Sets up the PostgreSQL database schema for MDL. This creates all necessary tables (business_domains, metrics, objectives, key_results) and views.

**Usage:**
```bash
DB_PASSWORD=yourpassword node scripts/setup-database.js
```

**Environment Variables:**
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: mdl)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (required)

**Prerequisites:**
1. PostgreSQL installed and running
2. Database created: `CREATE DATABASE mdl;`
3. User with CREATE TABLE permissions

**What it does:**
- Creates tables: business_domains, metrics, objectives, key_results
- Sets up foreign key relationships
- Creates indexes for performance
- Creates views for common queries
- Sets up update triggers for timestamps

### db-setup.sql

PostgreSQL DDL script that defines the complete database schema. This file is executed by `setup-database.js` but can also be run manually.

**Manual Usage:**
```bash
psql -h localhost -U postgres -d mdl -f scripts/db-setup.sql
```

**Schema Details:**
- **business_domains**: Business domain definitions with colors and metadata
- **metrics**: Core metrics with comprehensive JSONB fields for definition, governance, targets, etc.
- **objectives**: Strategic objectives (OKRs) with timeframes
- **key_results**: Key results linked to objectives and metrics
- **Views**: Pre-built views for common queries (metrics with domains, objectives summary, etc.)

### load-sample-data-postgres.js

Loads sample metrics, business domains, and objectives from JSON files into the PostgreSQL database.

**Usage:**
```bash
DB_PASSWORD=yourpassword node scripts/load-sample-data-postgres.js
```

**Environment Variables:**
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: mdl)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (required)

**Prerequisites:**
1. Database schema already created (run `setup-database.js` first)
2. PostgreSQL running and accessible

**What it does:**
- Clears existing data from all tables
- Loads 6 business domains from `examples/sample-domains.json`
- Loads 12 sample metrics from `examples/sample-metrics.json`
- Loads objectives and key results from `examples/sample-metrics.json`
- Displays summary of inserted records

**Note:** This script clears all existing data before loading samples. Make sure to backup any important data first.

### clean-sample-data-postgres.js

Removes all data (metrics, business domains, objectives, and key results) from the PostgreSQL database. This is the reversal operation of `load-sample-data-postgres.js`.

**Usage:**
```bash
# With confirmation prompt
DB_PASSWORD=yourpassword node scripts/clean-sample-data-postgres.js

# Skip confirmation (use with caution!)
DB_PASSWORD=yourpassword node scripts/clean-sample-data-postgres.js --confirm
```

**Environment Variables:**
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: mdl)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (required)

**Options:**
- `--confirm` - Skip the confirmation prompt (use with extreme caution!)

**Prerequisites:**
1. Database exists and is accessible
2. PostgreSQL running

**What it does:**
- Shows current record counts
- Prompts for confirmation (unless `--confirm` flag is used)
- Deletes all key results
- Deletes all objectives
- Deletes all metrics
- Deletes all business domains
- Verifies all data is removed
- Displays deletion summary

**Safety Features:**
- Requires typing "DELETE ALL DATA" to confirm (unless `--confirm` flag is used)
- Shows record counts before deletion
- Verifies deletion was successful
- Respects foreign key constraints (deletes in correct order)

**⚠️ WARNING:** This action is irreversible! All data will be permanently deleted from the database.

### clean-local-storage.js

Removes all data from the local JSON file storage. This clears metrics, domains, and objectives from the file-based storage system.

**Usage:**
```bash
# With confirmation prompt
npm run storage:clean
# or
node scripts/clean-local-storage.js

# Skip confirmation (use with caution!)
node scripts/clean-local-storage.js --confirm

# Specify custom metrics path
node scripts/clean-local-storage.js --path /custom/path/metrics.json
```

**Options:**
- `--confirm` - Skip the confirmation prompt (use with extreme caution!)
- `--path <path>` - Specify custom path to metrics.json (default: .mdl/metrics.json)

**What it does:**
- Shows current record counts
- Creates backups of existing files (with timestamp suffix)
- Prompts for confirmation (unless `--confirm` flag is used)
- Clears metrics from `.mdl/metrics.json`
- Clears domains from `examples/sample-domains.json`
- Clears objectives from `examples/sample-objectives.json`
- Verifies all data is removed
- Displays cleanup summary

**Files affected:**
- `.mdl/metrics.json` - Set to empty array `[]`
- `examples/sample-domains.json` - Set to `{"domains": []}`
- `examples/sample-objectives.json` - Set to `{"objectives": []}`

**Safety Features:**
- Requires typing "DELETE ALL DATA" to confirm (unless `--confirm` flag is used)
- Creates timestamped backups before deletion (e.g., `.mdl/metrics.json.backup-2025-11-18T12-30-00-000Z`)
- Shows record counts before and after deletion
- Verifies cleanup was successful

**Backup Recovery:**
If you need to restore data, backups are saved with the original filename plus a timestamp:
```bash
# Restore metrics from backup
cp .mdl/metrics.json.backup-2025-11-18T12-30-00-000Z .mdl/metrics.json
```

**⚠️ WARNING:** While backups are created, this operation clears all local storage data. Make sure you have the backups or can recreate the data.

### load-sample-metrics.js

Loads the comprehensive sample metrics from `examples/sample-metrics.json` into the file-based metrics store (`.mdl/metrics.json`).

**Usage:**
```bash
npm run load:samples
# or
node scripts/load-sample-metrics.js
```

**What it does:**
- Reads the sample metrics catalog
- Extracts the metrics array
- Writes directly to the store file
- Preserves all comprehensive metric definitions (alignment, governance, targets, etc.)

**Note:** This script directly replaces the metrics store, so any existing metrics will be overwritten. The previous store is backed up as `.mdl/metrics.json.backup`.

## Sample Metrics Included

The sample metrics cover different business domains and metric types:

1. **Login Success Rate** (Tier-1, KPI)
   - Business Domain: Digital Experience
   - Type: Leading indicator
   - Measures authentication success

2. **API Response Time P95** (Tier-1, Performance)
   - Business Domain: Platform
   - Type: Operational
   - Measures API performance

3. **Annual Recurring Revenue (ARR)** (Tier-1, Finance)
   - Business Domain: Revenue
   - Type: Lagging indicator
   - Measures business growth

4. **Customer Churn Rate** (Tier-1, Retention)
   - Business Domain: Customer Success
   - Type: Lagging indicator
   - Measures customer retention

5. **Deployment Frequency** (Tier-2, Engineering)
   - Business Domain: Platform
   - Type: Operational
   - Measures DevOps maturity (DORA metric)

Each metric includes:
- Complete metadata (tier, domain, type, tags)
- Strategic alignment (objectives, key results)
- Detailed definitions (formula, data sources)
- Governance information (owners, classification)
- Targets and alert rules
- Visualization preferences
- Operational usage guidelines
