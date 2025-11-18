# Clean Local Storage - Quick Reference

## Overview
Script to clear all data from MDL's local JSON file storage system.

## Quick Commands

```bash
# Interactive (with confirmation)
npm run storage:clean

# Skip confirmation (automated)
node scripts/clean-local-storage.js --confirm

# Custom metrics path
node scripts/clean-local-storage.js --path /custom/path/metrics.json
```

## What Gets Cleaned

| File | Action | Result |
|------|--------|--------|
| `.mdl/metrics.json` | Cleared | Set to `[]` |
| `examples/sample-domains.json` | Cleared | Set to `{"domains": []}` |
| `examples/sample-objectives.json` | Cleared | Set to `{"objectives": []}` |

## Safety Features

✅ **Automatic Backups**
- Creates timestamped backups before deletion
- Format: `filename.backup-2025-11-18T12-30-00-000Z`
- Allows data recovery if needed

✅ **Confirmation Required**
- Must type "DELETE ALL DATA" to proceed
- Use `--confirm` flag to skip (automation only)

✅ **Verification**
- Shows record counts before deletion
- Shows record counts after deletion
- Verifies cleanup was successful

## Usage Examples

### Standard Cleanup
```bash
npm run storage:clean
```
Output:
```
📊 Current storage status:
   Metrics:    12
   Domains:    6
   Objectives: 4

⚠️  WARNING: This will DELETE ALL data from local storage!

Type "DELETE ALL DATA" to confirm: DELETE ALL DATA

🧹 Cleaning local storage...

1️⃣  Cleaning metrics...
   📦 Backup created: .mdl/metrics.json.backup-2025-11-18T12-30-00-000Z
   ✅ Metrics cleared from .mdl/metrics.json

2️⃣  Cleaning domains...
   📦 Backup created: examples/sample-domains.json.backup-2025-11-18T12-30-00-000Z
   ✅ Domains cleared from examples/sample-domains.json

3️⃣  Cleaning objectives...
   📦 Backup created: examples/sample-objectives.json.backup-2025-11-18T12-30-00-000Z
   ✅ Objectives cleared from examples/sample-objectives.json

✓ Verification:
   Metrics:    12 → 0
   Domains:    6 → 0
   Objectives: 4 → 0

✅ Success! All data has been cleared from local storage.
```

### Automated Cleanup (CI/CD)
```bash
node scripts/clean-local-storage.js --confirm
```
Skips confirmation prompt - use with caution!

### Custom Path
```bash
node scripts/clean-local-storage.js --path /data/metrics.json
```
Cleans metrics from custom location.

## Recovery

### Restore from Backup
```bash
# List available backups
ls -lt .mdl/*.backup-* examples/*.backup-*

# Restore metrics
cp .mdl/metrics.json.backup-2025-11-18T12-30-00-000Z .mdl/metrics.json

# Restore domains
cp examples/sample-domains.json.backup-2025-11-18T12-30-00-000Z examples/sample-domains.json

# Restore objectives
cp examples/sample-objectives.json.backup-2025-11-18T12-30-00-000Z examples/sample-objectives.json
```

### Reload Sample Data
```bash
npm run load:samples
```
Loads fresh sample data into the system.

## Comparison with Database Cleaning

| Feature | Local Storage | PostgreSQL |
|---------|---------------|------------|
| Script | `clean-local-storage.js` | `clean-sample-data-postgres.js` |
| Command | `npm run storage:clean` | `npm run db:clean` |
| Requires Password | ❌ No | ✅ Yes (DB_PASSWORD) |
| Creates Backups | ✅ Yes (automatic) | ❌ No |
| Confirmation | ✅ Required | ✅ Required |
| Files Affected | 3 JSON files | 4 database tables |
| Recovery | Copy backup files | Reload from JSON |

## When to Use

✅ **Good Use Cases**
- Testing: Clear data before running tests
- Development: Reset to clean state
- Demo prep: Start with empty system
- Switching to PostgreSQL: Clean old file storage
- Troubleshooting: Remove corrupted data

⚠️ **Be Careful When**
- Production environment (use backups!)
- Shared development environment
- Important data exists (backup first)
- Automation scripts (verify behavior first)

## Troubleshooting

### "No data found to delete"
Storage is already empty - nothing to clean.

### "Permission denied"
Check file permissions:
```bash
ls -la .mdl/metrics.json
chmod 644 .mdl/metrics.json
```

### "File not found"
Files don't exist yet. Create them with:
```bash
mkdir -p .mdl
echo "[]" > .mdl/metrics.json
```

### "Backup creation failed"
Disk space or permissions issue:
```bash
df -h .mdl/
ls -la .mdl/
```

## Script Options

```bash
node scripts/clean-local-storage.js [OPTIONS]
```

| Option | Description |
|--------|-------------|
| `--confirm` | Skip confirmation prompt |
| `--path <path>` | Custom metrics.json path |

## Related Scripts

- `db:clean` - Clean PostgreSQL database
- `load:samples` - Load sample data to file storage
- `db:load` - Load sample data to PostgreSQL

## Tips

💡 **Backup Before Cleaning**
```bash
# Manual backup
cp .mdl/metrics.json .mdl/metrics.json.manual-backup
```

💡 **Clean and Reload**
```bash
# One-liner to reset data
npm run storage:clean -- --confirm && npm run load:samples
```

💡 **Check Current Data**
```bash
# Count records
jq 'length' .mdl/metrics.json
jq '.domains | length' examples/sample-domains.json
jq '.objectives | length' examples/sample-objectives.json
```

💡 **Clean Old Backups**
```bash
# Remove backups older than 7 days
find . -name "*.backup-*" -mtime +7 -delete
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (file not found, permission denied, etc.) |

---

**⚠️ Warning:** This script permanently deletes data. Backups are created automatically, but verify you can recover data before running in production environments.
