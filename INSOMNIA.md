# MDL API - Insomnia Collection Guide

Complete guide for testing the MDL API using Insomnia REST client.

## 📦 Collection Overview

**File:** `insomnia-collection.json`  
**Total Requests:** 20+  
**API Version:** 1.1.0 (with versioning support)  
**Organized Groups:** 8

---

## 🚀 Quick Start

### 1. Import the Collection

1. Open Insomnia
2. Click **Create** → **Import From** → **File**
3. Select `insomnia-collection.json`
4. The collection will be imported with all requests and environment variables

### 2. Configure Environment Variables

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

**To update:** Click environment dropdown → **Manage Environments** → Edit **Base Environment**

### 3. Start the Server

```bash
npm start
```

Server will be available at `http://localhost:3000`

---

## 🗂️ Available Requests

### 1. Health (1 request)
- **GET** `/health` - Server health check

### 2. Metrics - File Storage (6 requests)
- **GET** `/api/metrics` - Get all metrics
- **GET** `/api/metrics?business_domain=X&tier=Y` - Get filtered metrics
- **GET** `/api/metrics/:id` - Get specific metric
- **POST** `/api/metrics` - Create metric (initializes version to 1.0.0)
- **PUT** `/api/metrics/:id` - Update metric (auto version bump)
- **DELETE** `/api/metrics/:id` - Delete metric

### 3. Policies (2 requests)
- **GET** `/api/metrics/:id/policy` - Get OPA policy for metric
- **GET** `/api/policies` - Get all policies

### 4. Statistics (1 request)
- **GET** `/api/stats` - Get aggregated statistics

### 5. PostgreSQL - Metrics (4 requests)
- **POST** `/api/database/test` - Test connection
- **POST** `/api/postgres/metrics` - Fetch metrics from DB
- **POST** `/api/postgres/metrics/save` - Create/update metric
- **POST** `/api/postgres/metrics/delete` - Delete metric

### 6. PostgreSQL - Domains (3 requests)
- **POST** `/api/postgres/domains` - Fetch domains
- **POST** `/api/postgres/domains/save` - Create/update domain
- **POST** `/api/postgres/domains/delete` - Delete domain

### 7. PostgreSQL - Objectives (3 requests)
- **POST** `/api/postgres/objectives` - Fetch objectives
- **POST** `/api/postgres/objectives/save` - Create/update objective
- **POST** `/api/postgres/objectives/delete` - Delete objective (CASCADE)

---

## 📋 Versioning System (v1.1.0+)

### Metadata Structure

All metrics now include versioning fields in the `metadata` object:

```json
"metadata": {
  "notes": "Description",
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

### Version Bumping Logic

**MAJOR** (X.0.0) - Breaking changes:
- `formula`, `unit`, `metric_id`, `category`, `definition` changes

**MINOR** (x.X.0) - Feature changes:
- `name`, `description`, `tier`, `business_domain`, `targets_and_alerts` changes

**PATCH** (x.x.X) - Minor updates:
- `tags`, `metadata`, `visualization`, `governance` changes

### Testing Versioning

1. **Create Metric** - Version initialized to `1.0.0`
2. **Update Name** - Version bumps to `1.1.0` (minor)
3. **Update Formula** - Version bumps to `2.0.0` (major)
4. **Update Tags** - Version bumps to `2.0.1` (patch)

Each update adds an entry to `change_history` array.

---

## 📝 Request Examples

### Create Metric with Versioning

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
    "alert_rules": [
      {
        "name": "Test Failure Alert",
        "condition": "value < 0.90",
        "severity": "warning",
        "notification_channels": ["email", "slack"]
      }
    ]
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

### Update Metric (Auto Version Bump)

```json
{
  "metric_id": "METRIC-LOGIN-SUCCESS-RATE",
  "name": "Login Success Rate (Updated)",
  "targets_and_alerts": {
    "target_value": 0.98,  // Changed - will trigger MINOR bump
    "warning_threshold": 0.95,
    "critical_threshold": 0.90
  }
}
```

**Response:**
```json
{
  "metadata": {
    "version": "1.1.0",  // Automatically bumped
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

### PostgreSQL Config

All PostgreSQL requests require `dbConfig`:

```json
{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "mdl",
    "user": "postgres",
    "password": "your_password"
  },
  "metric": { /* metric object */ },
  "isUpdate": false
}
```

---

## 🎯 Testing Workflows

### Basic File Storage Workflow
1. **Health Check** → Verify server
2. **Get All Metrics** → View existing
3. **Create Metric** → Add new (v1.0.0)
4. **Update Metric** → Modify (version bump)
5. **Get Statistics** → View aggregates
6. **Generate Policy** → OPA policies

### PostgreSQL Workflow
1. **Test Connection** → Validate credentials
2. **Fetch Metrics** → Load from DB
3. **Save Metric** → Create/update with versioning
4. **Fetch Domains** → Get business domains
5. **Save Objective** → Create with key results

### Versioning Test Workflow
1. **Create** → `POST /api/metrics` (v1.0.0)
2. **Update Name** → `PUT /api/metrics/:id` (v1.1.0)
3. **Update Formula** → `PUT /api/metrics/:id` (v2.0.0)
4. **Update Tags** → `PUT /api/metrics/:id` (v2.0.1)
5. **Get Metric** → Verify `change_history` array

---

## 💡 Pro Tips

1. **Dynamic Variables** - Use `{{ _.timestamp }}` for unique IDs
2. **Environment Setup** - Set `db_password` before PostgreSQL requests
3. **Test Connection** - Always test DB connection first
4. **Version Tracking** - Check `change_history` after updates
5. **Filters** - Try filtered requests: `?business_domain=X&tier=Y`
6. **Alert Rules** - Use `notification_channels` (not `notify_channels`)
7. **Chain Requests** - Copy IDs from responses for next requests

---

## 🐛 Troubleshooting

### Connection Refused
- Ensure server is running: `npm start`
- Check port: default 3000

### PostgreSQL Errors
- Verify credentials in environment
- Check PostgreSQL is running: `psql -l`
- Run setup: `npm run db:setup`

### 404 Not Found
- Verify endpoint URL
- Check resource exists (metric ID)

### 400 Bad Request
- Validate against OpenAPI schema
- Check required fields present
- Verify data types correct

### Versioning Issues
- Existing metrics auto-upgrade to v1.0.0
- Empty `change_history` initialized on first load
- No manual migration needed

---

## 🔧 Recent Bug Fixes

### Race Condition Fix
**Issue:** Clicking metrics before objectives loaded caused undefined error.  
**Fix:** Added safety check for `allObjectives` array.

### notification_channels Fix
**Issue:** Missing `notification_channels` caused join() error.  
**Fix:** Fallback to `notify_channels` or empty array.

### Cache-Busting
**Issue:** Stale JavaScript cached by browser.  
**Fix:** Added cache-control headers and timestamp params.

---

## 🔐 Security Notes

- Default: `http://localhost:3000` (no SSL)
- Production: Update to HTTPS
- Store passwords securely (environment variables)
- Never commit credentials

---

## 📚 Additional Resources

- **OpenAPI Spec:** [openapi.yaml](./openapi.yaml) - Full API v1.1.0 documentation
- **README:** [README.md](./README.md) - Project overview
- **CHANGELOG:** [CHANGELOG.md](./CHANGELOG.md) - Version history
- **Scripts:** [scripts/README.md](./scripts/README.md) - Database utilities

---

## 📊 Response Examples

### Success Response
```json
{
  "success": true,
  "data": { /* ... */ },
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Statistics Response
```json
{
  "success": true,
  "data": {
    "total": 25,
    "byTier": { "Tier-1": 5, "Tier-2": 15, "Tier-3": 5 },
    "byBusinessDomain": { "Authentication": 5 },
    "byMetricType": { "operational": 10 },
    "byOwner": { "john@example.com": 10 }
  }
}
```

---

**Happy Testing! 🚀**

*Last Updated: November 18, 2025 - API Version 1.1.0*
