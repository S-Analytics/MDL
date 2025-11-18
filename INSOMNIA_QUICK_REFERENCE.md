# Insomnia Collection - Quick Reference

## 📦 Collection Overview

**Name:** MDL - Metrics Definition Library API  
**Format:** Insomnia v4 Export  
**Total Requests:** 20  
**Organized Groups:** 8

---

## 🗂️ Request Groups

### 1️⃣ Health (1 request)
- ✅ **GET** Health Check - `/health`

### 2️⃣ Metrics - File Storage (6 requests)
- ✅ **GET** Get All Metrics - `/api/metrics`
- ✅ **GET** Get Metrics (Filtered) - `/api/metrics?business_domain=...&tier=...`
- ✅ **GET** Get Metric by ID - `/api/metrics/{id}`
- ✅ **POST** Create Metric - `/api/metrics`
- ✅ **PUT** Update Metric - `/api/metrics/{id}`
- ✅ **DELETE** Delete Metric - `/api/metrics/{id}`

### 3️⃣ Policies (2 requests)
- ✅ **GET** Get Metric Policy - `/api/metrics/{id}/policy`
- ✅ **GET** Get All Policies - `/api/policies`

### 4️⃣ Statistics (1 request)
- ✅ **GET** Get Statistics - `/api/stats`

### 5️⃣ PostgreSQL - Metrics (4 requests)
- ✅ **POST** Test Database Connection - `/api/database/test`
- ✅ **POST** Fetch Metrics from PostgreSQL - `/api/postgres/metrics`
- ✅ **POST** Save Metric to PostgreSQL - `/api/postgres/metrics/save`
- ✅ **POST** Delete Metric from PostgreSQL - `/api/postgres/metrics/delete`

### 6️⃣ PostgreSQL - Domains (3 requests)
- ✅ **POST** Fetch Domains from PostgreSQL - `/api/postgres/domains`
- ✅ **POST** Save Domain to PostgreSQL - `/api/postgres/domains/save`
- ✅ **POST** Delete Domain from PostgreSQL - `/api/postgres/domains/delete`

### 7️⃣ PostgreSQL - Objectives (3 requests)
- ✅ **POST** Fetch Objectives from PostgreSQL - `/api/postgres/objectives`
- ✅ **POST** Save Objective to PostgreSQL - `/api/postgres/objectives/save`
- ✅ **POST** Delete Objective from PostgreSQL - `/api/postgres/objectives/delete`

---

## 🔧 Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:3000` | API server base URL |
| `db_host` | `localhost` | PostgreSQL host |
| `db_port` | `5432` | PostgreSQL port |
| `db_name` | `mdl` | Database name |
| `db_user` | `postgres` | Database user |
| `db_password` | `""` | Database password (update this!) |
| `sample_metric_id` | `METRIC-LOGIN-SUCCESS-RATE` | Sample metric for testing |
| `sample_domain_id` | `auth-5678` | Sample domain for testing |
| `sample_objective_id` | `OBJ-20251115041315` | Sample objective for testing |

---

## 🚀 Quick Start Workflows

### Basic File Storage Workflow
1. **Health Check** → Verify server is running
2. **Get All Metrics** → See existing metrics
3. **Create Metric** → Add a new metric
4. **Get Statistics** → View aggregated data
5. **Generate Policies** → Create OPA policies

### PostgreSQL Workflow
1. **Test Database Connection** → Validate credentials
2. **Fetch Metrics from PostgreSQL** → Load from DB
3. **Save Metric to PostgreSQL** → Create/update
4. **Fetch Domains** → Get business domains
5. **Save Objective** → Create objectives with KRs

---

## 📋 Sample Request Bodies

### Create Metric (File Storage)
```json
{
  "metric_id": "METRIC-TEST-001",
  "name": "Test Metric",
  "short_name": "test_metric",
  "description": "A test metric",
  "category": "Testing",
  "tier": "Tier-3",
  "business_domain": "QA",
  "metric_type": "operational",
  "tags": ["test"],
  // ... (full schema in requests)
}
```

### PostgreSQL Save Metric
```json
{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "mdl",
    "user": "postgres",
    "password": "your_password"
  },
  "metric": {
    // ... (metric object)
  },
  "isUpdate": false
}
```

### Save Business Domain
```json
{
  "dbConfig": { /* ... */ },
  "domain": {
    "id": "test-domain-001",
    "name": "Test Domain",
    "description": "A test domain",
    "owner": "owner@example.com",
    "stakeholders": ["user1@example.com"],
    "objectives": ["Validate operations"],
    "key_metrics": ["METRIC-1", "METRIC-2"],
    "metadata": {
      "industry": "Technology",
      "priority": "high"
    }
  },
  "isUpdate": false
}
```

### Save Objective with Key Results
```json
{
  "dbConfig": { /* ... */ },
  "objective": {
    "objective_id": "OBJ-TEST-001",
    "title": "Test Objective",
    "description": "A test objective",
    "owner": "owner@example.com",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "status": "in_progress",
    "business_domain": "Test Domain",
    "metric_ids": ["METRIC-1", "METRIC-2"],
    "key_results": [
      {
        "kr_id": "KR-001",
        "description": "Achieve 95% success rate",
        "target_value": 95,
        "current_value": 85,
        "unit": "percentage",
        "metric_id": "METRIC-1",
        "status": "on_track"
      }
    ]
  },
  "isUpdate": false
}
```

---

## 💡 Pro Tips

1. **Use Dynamic Timestamps** - Requests use `{{ _.timestamp }}` for unique IDs
2. **Update Password** - Set `db_password` in environment before PostgreSQL requests
3. **Test Connection First** - Always run "Test Database Connection" before other DB operations
4. **Check Responses** - Verify `"success": true` in response bodies
5. **Use Filters** - Try the filtered metrics request to test query parameters
6. **Chain Requests** - Copy IDs from responses to use in subsequent requests

---

## 📚 Documentation Links

- **Full Guide:** [INSOMNIA_COLLECTION.md](./INSOMNIA_COLLECTION.md)
- **API Spec:** [openapi.yaml](./openapi.yaml)
- **Database Setup:** [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- **Main README:** [README.md](./README.md)

---

## 🎯 Response Examples

### Successful Response
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
  "error": "Error message here"
}
```

### Statistics Response
```json
{
  "success": true,
  "data": {
    "total": 25,
    "byTier": { "Tier-1": 5, "Tier-2": 15, "Tier-3": 5 },
    "byBusinessDomain": { "Authentication": 5, "Performance": 8 },
    "byMetricType": { "operational": 10, "business": 8 },
    "byOwner": { "john@example.com": 10 }
  }
}
```

---

**Ready to test? Import `insomnia-collection.json` and start exploring! 🚀**
