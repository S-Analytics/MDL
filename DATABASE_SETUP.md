# PostgreSQL Database Setup for MDL

This guide will help you set up PostgreSQL database support for MDL.

## Prerequisites

- PostgreSQL 12 or higher installed and running
- Node.js 18+ with npm
- MDL application installed

## Step 1: Create Database

First, create a database for MDL:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mdl;

# Exit psql
\q
```

## Step 2: Run Database Setup Script

Use the provided setup script to create all tables and schema:

```bash
# From the MDL root directory
DB_PASSWORD=your_postgres_password node scripts/setup-database.js
```

**Environment Variables:**

- `DB_HOST` - PostgreSQL host (default: `localhost`)
- `DB_PORT` - PostgreSQL port (default: `5432`)
- `DB_NAME` - Database name (default: `mdl`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password (required)

**Full Example:**

```bash
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=mdl \
DB_USER=postgres \
DB_PASSWORD=mypassword \
node scripts/setup-database.js
```

## Step 3: Verify Schema

Check that tables were created successfully:

```bash
psql -U postgres -d mdl -c "\dt"
```

You should see:
- `business_domains`
- `metrics`
- `objectives`
- `key_results`

## Step 4: Load Sample Data (Optional)

Load sample metrics, domains, and objectives into the database:

```bash
DB_PASSWORD=mypassword \
node scripts/load-sample-data-postgres.js
```

This will load:
- 6 business domains (Digital Experience, Platform, Revenue, Customer Success, Sales, Engineering)
- 12 sample metrics across different tiers and domains
- 1 sample objective with 2 key results

**Note:** This script clears all existing data before loading samples.

## Step 5: Configure MDL Dashboard

1. Open MDL Dashboard: http://localhost:3000/dashboard
2. Click the **Settings** button (gear icon in top-right)
3. Select **🗄️ Database Storage**
4. Enter your PostgreSQL connection details:
   - **Host:** localhost
   - **Port:** 5432
   - **Database Name:** mdl
   - **Username:** postgres
   - **Password:** your password
5. Click **Test Connection** to verify
6. Click **Save Settings**

The dashboard will automatically reload and display data from PostgreSQL!

## Database Schema

### Tables

**business_domains**
- Domain definitions with metadata
- Fields: domain_id, name, description, owner_team, contact_email, tier_focus, key_areas, color

**metrics**
- Core metric definitions
- Fields: metric_id, name, description, category, tier, business_domain, metric_type, tags
- JSONB fields: definition, strategic_alignment, governance, targets, alert_rules, visualization, usage

**objectives**
- Strategic objectives (OKRs)
- Fields: objective_id, name, description, owner_team, status, priority, strategic_pillar, timeframe_start, timeframe_end

**key_results**
- Key results linked to objectives
- Fields: kr_id, objective_id, name, baseline_value, current_value, target_value, unit, direction, metric_ids, progress_percentage, status

### Views

**v_metrics_with_domains**
- Joins metrics with business domain details

**v_objectives_summary**
- Objectives with key results count and average progress

**v_key_results_with_objectives**
- Key results with parent objective details

## Manual Schema Setup (Alternative)

If you prefer to run the SQL script manually:

```bash
psql -h localhost -U postgres -d mdl -f scripts/db-setup.sql
```

## Troubleshooting

### Connection Refused
- Check PostgreSQL is running: `pg_isready`
- Verify port: `psql -p 5432 -U postgres`
- Check firewall settings

### Authentication Failed
- Verify username and password
- Check `pg_hba.conf` for authentication method
- Try: `ALTER USER postgres WITH PASSWORD 'newpassword';`

### Database Does Not Exist
- Create it first: `createdb -U postgres mdl`
- Or use psql: `CREATE DATABASE mdl;`

### Permission Denied
- Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE mdl TO postgres;`
- Or create a dedicated user:
  ```sql
  CREATE USER mdl_user WITH PASSWORD 'secure_password';
  GRANT ALL PRIVILEGES ON DATABASE mdl TO mdl_user;
  ```

## Data Migration

To migrate from file storage to database:

1. Export current data (backup `.mdl/metrics.json`)
2. Set up database following steps above
3. Import data using API or CLI (feature coming soon)

## Backup and Restore

### Backup
```bash
pg_dump -U postgres -d mdl -f mdl_backup.sql
```

### Restore
```bash
psql -U postgres -d mdl -f mdl_backup.sql
```

## Performance

The schema includes indexes on:
- Primary keys (all tables)
- Metric IDs and names
- Business domains
- Timeframes
- JSONB fields (GIN indexes)

For large datasets (>10,000 metrics), consider:
- Partitioning by business domain or date
- Additional indexes based on query patterns
- Connection pooling (pg_bouncer)

## Security

⚠️ **Important Security Notes:**

1. **Never commit passwords** to version control
2. Use environment variables for credentials
3. Consider using `.env` files (add to `.gitignore`)
4. Use strong passwords for database users
5. Limit database user permissions
6. Use SSL connections in production
7. Regularly update PostgreSQL

## Next Steps

- Configure database in MDL settings
- Test connection from dashboard
- Import sample data
- Set up automated backups
- Configure monitoring and alerts

## Support

For issues or questions:
- Check logs: `tail -f /var/log/postgresql/postgresql-*.log`
- MDL documentation: `README.md`
- PostgreSQL docs: https://www.postgresql.org/docs/
