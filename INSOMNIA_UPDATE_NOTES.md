# Insomnia Collection Updates - November 18, 2025

## Overview
This document outlines updates to the Insomnia collection to reflect the versioning system and recent bug fixes implemented on November 18, 2025.

## Metadata Structure Changes

### Updated Metric Metadata Format

The `metadata` object in all metric requests should now include the following versioning fields:

```json
"metadata": {
  "notes": "Description of the metric",
  "example_queries": [],
  "version": "1.0.0",
  "created_at": "2025-11-18T00:00:00Z",
  "created_by": "username",
  "last_updated": "2025-11-18T00:00:00Z",
  "last_updated_by": "username",
  "change_history": [
    {
      "version": "1.0.0",
      "timestamp": "2025-11-18T00:00:00Z",
      "changed_by": "username",
      "change_type": "major",
      "changes_summary": "Initial metric creation",
      "fields_changed": []
    }
  ]
}
```

### Change History Entry Structure

Each entry in the `change_history` array contains:
- **version**: Semantic version (MAJOR.MINOR.PATCH)
- **timestamp**: ISO 8601 timestamp
- **changed_by**: Username or identifier
- **change_type**: One of "major", "minor", or "patch"
- **changes_summary**: Human-readable description
- **fields_changed**: Array of field names that were modified

### Version Bumping Logic

- **MAJOR** (X.0.0): Changes to formula, calculation, definition, data sources
- **MINOR** (x.X.0): Changes to targets, alerts, thresholds, dimensions
- **PATCH** (x.x.X): Changes to metadata, tags, visualization, documentation

## Updated Requests

### Create Metric Request

Update the "Create Metric" request body to include the new metadata structure:

```json
{
  "metric_id": "METRIC-TEST-{{ _.timestamp }}",
  "name": "Test Metric",
  "short_name": "test_metric",
  "description": "A test metric for API validation",
  "category": "Testing",
  "tier": "Tier-3",
  "business_domain": "Quality Assurance",
  "metric_type": "operational",
  "tags": ["test", "api"],
  "alignment": {
    "strategic_pillar": "Quality",
    "primary_objective_ids": [],
    "related_okr_ids": [],
    "why_it_matters": "Ensures API quality"
  },
  "definition": {
    "formula": "count(test_passes) / count(total_tests)",
    "formula_detail": "Ratio of passing tests to total tests",
    "numerator": {
      "event_name": "test_pass",
      "filters": []
    },
    "denominator": {
      "event_name": "test_execution",
      "filters": []
    },
    "unit": "ratio",
    "expected_direction": "increase"
  },
  "data": {
    "primary_sources": [
      {
        "system": "test_database",
        "table_or_stream": "test_results",
        "connection_id": "test_db"
      }
    ],
    "data_freshness": "real_time",
    "update_frequency": "on_demand"
  },
  "governance": {
    "data_classification": "Internal",
    "pii_involved": false,
    "owner_team": "QA Team",
    "technical_owner": "qa_tech",
    "business_owner": "qa_manager",
    "version": "1.0.0",
    "status": "active"
  },
  "dimensions": [],
  "targets_and_alerts": {
    "target_value": 0.95,
    "warning_threshold": 0.90,
    "critical_threshold": 0.85,
    "alert_rules": []
  },
  "visualization": {
    "default_chart_type": "line",
    "default_time_range": "last_7_days"
  },
  "relationships": {
    "upstream_metric_ids": [],
    "downstream_metric_ids": []
  },
  "operational_usage": {
    "decision_use_cases": ["Quality monitoring"],
    "review_cadence": "daily"
  },
  "metadata": {
    "notes": "Sample test metric for API validation",
    "example_queries": [],
    "version": "1.0.0",
    "created_at": "2025-11-18T00:00:00Z",
    "created_by": "api_user",
    "last_updated": "2025-11-18T00:00:00Z",
    "last_updated_by": "api_user",
    "change_history": [
      {
        "version": "1.0.0",
        "timestamp": "2025-11-18T00:00:00Z",
        "changed_by": "api_user",
        "change_type": "major",
        "changes_summary": "Initial metric creation",
        "fields_changed": []
      }
    ]
  }
}
```

### Update Metric Request

When updating a metric, the system will automatically:
1. Calculate the appropriate version bump based on changed fields
2. Add a new entry to `change_history`
3. Update `last_updated` and `last_updated_by`

Example update request:

```json
{
  "metric_id": "METRIC-LOGIN-SUCCESS-RATE",
  "name": "Login Success Rate (Updated)",
  "description": "Updated: Percentage of successful login attempts",
  // ... other fields ...
  "targets_and_alerts": {
    "target_value": 0.98,  // Changed from 0.95 - will trigger MINOR version bump
    "warning_threshold": 0.95,
    "critical_threshold": 0.90
  }
}
```

The response will include:
```json
{
  "metadata": {
    "version": "1.1.0",  // Automatically bumped from 1.0.0
    "last_updated": "2025-11-18T10:30:00Z",
    "last_updated_by": "dashboard_user",
    "change_history": [
      {
        "version": "1.0.0",
        "timestamp": "2025-11-18T00:00:00Z",
        "changed_by": "api_user",
        "change_type": "major",
        "changes_summary": "Initial metric creation",
        "fields_changed": []
      },
      {
        "version": "1.1.0",
        "timestamp": "2025-11-18T10:30:00Z",
        "changed_by": "dashboard_user",
        "change_type": "minor",
        "changes_summary": "Updated targets_and_alerts",
        "fields_changed": ["targets_and_alerts"]
      }
    ]
  }
}
```

## Bug Fixes Addressed

### 1. Race Condition with allObjectives
**Issue**: Clicking metrics before objectives loaded caused "Cannot read properties of undefined (reading 'forEach')" error.

**Fix**: Added safety check in `calculateMetricAlignment()` function:
```javascript
if (!allObjectives || !Array.isArray(allObjectives)) {
  return alignments;
}
```

### 2. Undefined notification_channels
**Issue**: Alert rules with missing `notification_channels` caused "Cannot read properties of undefined (reading 'join')" error.

**Fix**: Added null-safe handling:
```javascript
(rule.notification_channels || rule.notify_channels || []).join(', ') || 'N/A'
```

### 3. Cache-Busting
**Issue**: Browser cached old JavaScript causing stale data display.

**Fix**: Added timestamp query parameters to all fetch requests and cache-control headers.

## Testing Updates

### Required Test Coverage

1. **Versioning Tests** (tests/storage/MetricStore.test.ts):
   - Test automatic version initialization to 1.0.0
   - Test version bumping logic (major, minor, patch)
   - Test change history tracking
   - Test determineChangeType function

2. **PostgreSQL Metadata Tests** (tests/storage/PostgresMetricStore.test.ts):
   - Test metadata column storage/retrieval
   - Test version history persistence
   - Test JSONB query operations

3. **Bug Fix Tests**:
   - Test metric detail display with undefined objectives
   - Test alert rules with missing notification_channels
   - Test cache-busting behavior

## API Endpoint Updates

No new endpoints were added, but existing endpoints now return enhanced metadata:

- **GET /api/metrics**: Returns metrics with full version history
- **GET /api/metrics/:id**: Returns single metric with version history
- **POST /api/metrics**: Creates metric with version 1.0.0
- **PUT /api/metrics/:id**: Updates metric and bumps version
- **POST /api/postgres/metrics**: Returns PostgreSQL metrics with metadata
- **POST /api/postgres/metrics/save**: Saves metric with versioning

## Report Export Updates

### Objective Report Changes

The generated markdown reports now include:

1. **Version information** in metric details
2. **Last updated timestamp** for each metric
3. **Version History section** showing recent changes (last 3 versions) for all metrics associated with the objective

Example output:
```markdown
## 📝 Metric Version History

### Login Success Rate (v1.2.1)

- **v1.2.1** (11/18/2025)
  - Type: PATCH
  - Summary: Updated visualization settings
  - Changed by: dashboard_user
  - Fields: visualization

- **v1.2.0** (11/17/2025)
  - Type: MINOR
  - Summary: Added new alert thresholds
  - Changed by: ops_team
  - Fields: targets_and_alerts

- **v1.1.0** (11/16/2025)
  - Type: MINOR
  - Summary: Updated dimensions
  - Changed by: data_team
  - Fields: dimensions
```

## Environment Variables

Update your Insomnia environment to test versioning:

```json
{
  "base_url": "http://localhost:3000",
  "db_host": "localhost",
  "db_port": "5432",
  "db_name": "mdl",
  "db_user": "postgres",
  "db_password": "",
  "sample_metric_id": "METRIC-LOGIN-SUCCESS-RATE",
  "sample_domain_id": "auth-5678",
  "sample_objective_id": "OBJ-20251115041315",
  "test_user": "api_test_user"
}
```

## Migration Notes

Existing metrics in the database/file storage will:
- Automatically receive version "1.0.0" if not present
- Have empty `change_history` arrays initialized on first load
- Start tracking changes on next update

No manual migration required - versioning is backward compatible.

## Summary of Changes

✅ **Semantic versioning** (MAJOR.MINOR.PATCH) for all metrics
✅ **Change history tracking** with full audit trail
✅ **PostgreSQL metadata column** storing version info as JSONB
✅ **Enhanced report exports** with version history
✅ **Bug fixes** for race conditions and undefined properties
✅ **Cache-busting** for real-time updates
✅ **Backward compatibility** with existing data

---

*Last Updated: November 18, 2025*
