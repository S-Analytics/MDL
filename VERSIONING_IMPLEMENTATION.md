# Metric Versioning Implementation

**Date:** November 18, 2025  
**Status:** ✅ Complete

## Overview

Implemented semantic versioning (semver) for metrics with automatic version bumping and comprehensive change history tracking. This system works for both storage options (local file and PostgreSQL) and provides full audit trails of metric changes.

---

## Semantic Versioning Rules

### Version Format: MAJOR.MINOR.PATCH

| Change Type | Version Bump | Triggered By |
|------------|--------------|--------------|
| **MAJOR** (X.0.0) | Breaking changes | Formula, Unit, Category changes |
| **MINOR** (x.X.0) | New features/content | Name, Description, Business Domain, Metric Type changes |
| **PATCH** (x.x.X) | Bug fixes/minor updates | Tags, Governance fields, Status, Owner changes |

### Examples:
- **1.0.0 → 2.0.0**: Formula changed from `(A + B) / C` to `(A * B) / C`
- **1.5.0 → 1.6.0**: Business domain changed from "Sales" to "Revenue"
- **1.5.3 → 1.5.4**: Owner team updated, tags added

---

## Implementation Details

### 1. Data Model Changes

#### MetricMetadata Interface (src/models/MetricDefinition.ts)
```typescript
export interface MetricMetadata {
  notes: string;
  example_queries: ExampleQuery[];
  version: string;                          // NEW: Semver version (e.g., "1.2.3")
  created_at: string;                       // NEW: ISO timestamp
  created_by: string;                       // NEW: User identifier
  last_updated: string;                     // NEW: ISO timestamp
  last_updated_by: string;                  // NEW: User identifier
  change_history: ChangeHistoryEntry[];     // NEW: Full audit trail
}

export interface ChangeHistoryEntry {
  version: string;                          // Version number for this change
  timestamp: string;                        // ISO timestamp
  changed_by: string;                       // User who made the change
  change_type: 'major' | 'minor' | 'patch'; // Type of change
  changes_summary: string;                  // Human-readable summary
  fields_changed: string[];                 // List of field names changed
}
```

### 2. Storage Layer Updates

#### InMemoryMetricStore (src/storage/MetricStore.ts)

**New Functions:**
- `bumpVersion(currentVersion, changeType)`: Increments version based on change type
- `determineChangeType(existing, updates)`: Analyzes changes to determine version bump type

**Create Method:**
- Initializes metrics at version 1.0.0
- Creates initial change history entry with all fields marked as new

**Update Method:**
- Compares existing vs. new values to determine change type
- Bumps version accordingly
- Tracks specific fields that changed
- Appends change history entry
- Maintains full audit trail

#### PostgresMetricStore (src/storage/PostgresMetricStore.ts)

**Same versioning logic as InMemoryMetricStore**

**Database Schema Changes (scripts/db-setup.sql):**
```sql
-- Added to metrics table:
metadata JSONB,  -- Stores version, timestamps, change history
```

**Updates:**
- CREATE: Stores metadata with initial version 1.0.0
- UPDATE: Calculates new version and appends to change history
- READ: Returns metadata with full version history

### 3. Dashboard UI Updates (src/dashboard/views.ts)

#### Version Calculation on Form Submit

**Helper Functions Added:**
```javascript
bumpVersion(currentVersion, changeType)
determineChangeType(existing, updates)
```

**Form Submit Handler:**
1. Retrieves existing metric if editing
2. Compares new data vs. existing data
3. Determines change type (major/minor/patch)
4. Calculates new version number
5. Tracks which fields changed
6. Creates change history entry
7. Saves metric with updated metadata

#### Metric Detail View Enhancements

**Updated "Metadata & Version History" Section:**
- **Version Badge**: Large, prominent display of current version
- **Timestamps**: Created at/by, Last updated at/by
- **Change History Timeline**:
  - Reverse chronological order (newest first)
  - Color-coded by change type:
    - 🔴 **Red**: Major changes (breaking)
    - 🟠 **Orange**: Minor changes (features)
    - 🟢 **Green**: Patch changes (fixes)
  - Each entry shows:
    - Version number with badge
    - Timestamp (localized)
    - Change summary
    - Changed by (user)
    - List of fields modified
  - Scrollable container (max 300px height)
  - Latest change highlighted with different background

---

## Usage Examples

### Example 1: Creating a New Metric
```javascript
// Dashboard form submission creates:
{
  "metadata": {
    "version": "1.0.0",
    "created_at": "2025-11-18T10:30:00.000Z",
    "created_by": "dashboard_user",
    "last_updated": "2025-11-18T10:30:00.000Z",
    "last_updated_by": "dashboard_user",
    "change_history": [
      {
        "version": "1.0.0",
        "timestamp": "2025-11-18T10:30:00.000Z",
        "changed_by": "dashboard_user",
        "change_type": "major",
        "changes_summary": "Initial metric creation",
        "fields_changed": ["*"]
      }
    ]
  }
}
```

### Example 2: Updating Metric Name (Minor Change)
```javascript
// Before: version "1.0.0"
// User changes name from "Customer Churn Rate" to "Monthly Churn Rate"

// After: version "1.1.0"
{
  "metadata": {
    "version": "1.1.0",
    "last_updated": "2025-11-18T14:25:00.000Z",
    "last_updated_by": "dashboard_user",
    "change_history": [
      {
        "version": "1.0.0",
        "timestamp": "2025-11-18T10:30:00.000Z",
        "changed_by": "dashboard_user",
        "change_type": "major",
        "changes_summary": "Initial metric creation",
        "fields_changed": ["*"]
      },
      {
        "version": "1.1.0",
        "timestamp": "2025-11-18T14:25:00.000Z",
        "changed_by": "dashboard_user",
        "change_type": "minor",
        "changes_summary": "Updated name",
        "fields_changed": ["name"]
      }
    ]
  }
}
```

### Example 3: Changing Formula (Major Change)
```javascript
// Before: version "1.1.0"
// User changes formula from "(A + B) / Total" to "(A * Weight + B) / Total"

// After: version "2.0.0"
{
  "metadata": {
    "version": "2.0.0",
    "last_updated": "2025-11-18T16:45:00.000Z",
    "last_updated_by": "dashboard_user",
    "change_history": [
      // ... previous entries ...
      {
        "version": "2.0.0",
        "timestamp": "2025-11-18T16:45:00.000Z",
        "changed_by": "dashboard_user",
        "change_type": "major",
        "changes_summary": "Updated formula",
        "fields_changed": ["formula"]
      }
    ]
  }
}
```

### Example 4: Updating Tags (Patch Change)
```javascript
// Before: version "2.0.0"
// User adds tags "finance, revenue, core"

// After: version "2.0.1"
{
  "metadata": {
    "version": "2.0.1",
    "last_updated": "2025-11-18T17:10:00.000Z",
    "last_updated_by": "dashboard_user",
    "change_history": [
      // ... previous entries ...
      {
        "version": "2.0.1",
        "timestamp": "2025-11-18T17:10:00.000Z",
        "changed_by": "dashboard_user",
        "change_type": "patch",
        "changes_summary": "Updated tags",
        "fields_changed": ["tags"]
      }
    ]
  }
}
```

---

## Database Migration (PostgreSQL Users)

If you have an existing PostgreSQL database, run this migration:

```sql
-- Add metadata column to metrics table
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Initialize versioning for existing metrics
UPDATE metrics 
SET metadata = jsonb_build_object(
  'version', '1.0.0',
  'created_at', COALESCE(created_at::text, NOW()::text),
  'created_by', 'system',
  'last_updated', COALESCE(updated_at::text, NOW()::text),
  'last_updated_by', 'system',
  'change_history', jsonb_build_array(
    jsonb_build_object(
      'version', '1.0.0',
      'timestamp', COALESCE(created_at::text, NOW()::text),
      'changed_by', 'system',
      'change_type', 'major',
      'changes_summary', 'Initial version (migrated)',
      'fields_changed', ARRAY['*']
    )
  )
)
WHERE metadata IS NULL;

-- Add comment
COMMENT ON COLUMN metrics.metadata IS 'Versioning metadata: version, timestamps, change history';
```

---

## Testing Instructions

### Test 1: New Metric Creation
1. Open dashboard: http://localhost:3000/dashboard
2. Click "Add New Metric"
3. Fill in all required fields
4. Save
5. Click on the metric to view details
6. **Verify**: 
   - Metadata section shows "Version: 1.0.0"
   - Change history shows "Initial metric creation"
   - Created at/by fields populated

### Test 2: Minor Change (Name Update)
1. Edit an existing metric
2. Change only the name field
3. Save
4. View metric details
5. **Verify**:
   - Version bumped to 1.1.0 (or x.X+1.0)
   - Change history shows new entry with "minor" badge
   - Changes summary: "Updated name"
   - Fields changed: ["name"]

### Test 3: Major Change (Formula Update)
1. Edit an existing metric
2. Change the formula field
3. Save
4. View metric details
5. **Verify**:
   - Version bumped to 2.0.0 (or X+1.0.0)
   - Change history shows new entry with red "major" badge
   - Changes summary: "Updated formula"
   - Fields changed: ["formula"]

### Test 4: Patch Change (Tags Update)
1. Edit an existing metric
2. Add or modify tags only
3. Save
4. View metric details
5. **Verify**:
   - Version bumped to x.x.X+1
   - Change history shows new entry with green "patch" badge
   - Changes summary: "Updated tags"
   - Fields changed: ["tags"]

### Test 5: Multiple Field Changes
1. Edit an existing metric
2. Change name, description, and tags
3. Save
4. View metric details
5. **Verify**:
   - Version bumped based on highest severity (minor in this case)
   - Change history shows: "Updated name, description, tags"
   - All changed fields listed

### Test 6: PostgreSQL Storage
1. Configure dashboard to use PostgreSQL
2. Create/edit metrics
3. **Verify**: Same versioning behavior
4. Check database directly:
```sql
SELECT metric_id, name, metadata->>'version' as version, 
       jsonb_array_length(metadata->'change_history') as history_entries
FROM metrics;
```

### Test 7: Change History Timeline
1. Create a metric
2. Make 3-4 different types of changes (major, minor, patch)
3. View metric details
4. **Verify**:
   - All changes shown in reverse chronological order
   - Color coding correct (red/orange/green)
   - Timestamps accurate
   - Latest change highlighted

---

## Files Modified

| File | Changes |
|------|---------|
| `src/models/MetricDefinition.ts` | Added version, timestamps, change_history to MetricMetadata interface |
| `src/storage/MetricStore.ts` | Added versioning functions, updated create/update methods |
| `src/storage/PostgresMetricStore.ts` | Added versioning functions, updated SQL queries, added metadata column handling |
| `src/dashboard/views.ts` | Added version calculation functions, updated form submit handler, enhanced metadata display with change history timeline |
| `src/config/ConfigLoader.ts` | Updated default metric initialization with versioning fields |
| `scripts/db-setup.sql` | Added metadata JSONB column to metrics table |

---

## Benefits

### 1. **Audit Trail**
- Complete history of all changes to every metric
- Know who changed what and when
- Track evolution of critical business metrics

### 2. **Impact Analysis**
- Quickly identify breaking changes (major versions)
- Understand when formulas or key properties changed
- Correlate metric changes with business events

### 3. **Compliance & Governance**
- Regulatory compliance for financial metrics
- Change management documentation
- Version control for certified/approved metrics

### 4. **Rollback Support**
- Historical record enables rollback if needed
- Compare current vs. previous versions
- Understand impact of changes over time

### 5. **Communication**
- Stakeholders see when metrics changed
- Change summaries provide context
- Version numbers enable precise references ("use v2.1.0")

---

## Future Enhancements

### Potential additions:
1. **Version Comparison**: Side-by-side view of two versions
2. **Rollback Feature**: Restore metric to previous version
3. **Change Approval Workflow**: Require approval for major changes
4. **Version Tags**: Tag specific versions as "stable", "certified", "deprecated"
5. **Export History**: Generate change report PDF
6. **User Attribution**: Integrate with authentication system for real user tracking
7. **Change Notifications**: Alert stakeholders when metrics change
8. **Version Locking**: Prevent changes to production metrics without approval

---

## API Integration

### REST Endpoints (Existing, Now with Versioning)

**Create Metric:**
```http
POST /api/metrics
Content-Type: application/json

{
  "name": "Revenue Per Customer",
  "description": "...",
  // ... other fields
}

Response:
{
  "success": true,
  "metric": {
    "metric_id": "METRIC-...",
    "metadata": {
      "version": "1.0.0",
      "created_at": "2025-11-18T...",
      "change_history": [...]
    }
  }
}
```

**Update Metric:**
```http
PUT /api/metrics/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "formula": "New Formula"
}

Response:
{
  "success": true,
  "metric": {
    "metric_id": "METRIC-...",
    "metadata": {
      "version": "2.0.0",  // Bumped due to formula change
      "last_updated": "2025-11-18T...",
      "change_history": [...]
    }
  }
}
```

---

## Compilation Status
✅ TypeScript compilation successful  
✅ All storage methods updated  
✅ Dashboard UI enhanced with change history  
✅ Database schema updated  

---

## Related Documentation
- `BUG_FIXES_STRATEGIC_ALIGNMENT_AND_DROPDOWN.md` - Strategic alignment fixes
- `FORM_IMPROVEMENTS.md` - Form enhancements
- `METRIC_SAVE_VERIFICATION.md` - Storage selection fixes
- `DATABASE_SETUP.md` - PostgreSQL setup guide
