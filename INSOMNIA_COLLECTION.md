# MDL API - Insomnia Collection

This directory contains an Insomnia API testing collection for the Metrics Definition Library (MDL) API.

## 📦 What's Included

The collection (`insomnia-collection.json`) includes:

### Organized Request Groups

1. **Health** - Server health check endpoints
2. **Metrics (File Storage)** - CRUD operations using file-based storage
3. **Policies** - OPA policy generation for metrics
4. **Statistics** - Aggregated metrics statistics
5. **PostgreSQL - Metrics** - Database operations for metrics
6. **PostgreSQL - Domains** - Business domain management
7. **PostgreSQL - Objectives** - Objectives and key results management

### Total Requests: 20+

- ✅ Health check
- ✅ Get all metrics (with and without filters)
- ✅ Get metric by ID
- ✅ Create, update, and delete metrics
- ✅ Generate OPA policies (single and bulk)
- ✅ Get statistics
- ✅ PostgreSQL: Test connection
- ✅ PostgreSQL: Fetch, save, and delete metrics
- ✅ PostgreSQL: Fetch, save, and delete domains
- ✅ PostgreSQL: Fetch, save, and delete objectives

## 🚀 Getting Started

### 1. Import the Collection

1. Open Insomnia
2. Click **Create** → **Import From** → **File**
3. Select `insomnia-collection.json`
4. The collection will be imported with all requests and environment variables

### 2. Configure Environment Variables

The collection includes a base environment with the following variables:

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
  "sample_objective_id": "OBJ-20251115041315"
}
```

**To update environment variables:**

1. Click the environment dropdown (top-left)
2. Select **Manage Environments**
3. Edit the **Base Environment**
4. Update values as needed (especially `db_password` for PostgreSQL operations)

### 3. Start the MDL Server

Make sure the MDL server is running:

```bash
npm start
```

The server should be accessible at `http://localhost:3000`

### 4. Run Requests

You can now execute any request in the collection!

## 📋 Request Examples

### Basic Workflow

#### 1. Health Check
**GET** `/health`
- Verify the server is running
- No authentication required

#### 2. Get All Metrics
**GET** `/api/metrics`
- Retrieve all metrics from file storage
- Returns array of metric definitions

#### 3. Create a Metric
**POST** `/api/metrics`
- Creates a new metric definition
- Uses timestamp in metric_id for uniqueness: `METRIC-TEST-{{ _.timestamp }}`

#### 4. Get Statistics
**GET** `/api/stats`
- View aggregated statistics
- Shows metrics by tier, domain, type, and owner

### PostgreSQL Workflow

#### 1. Test Database Connection
**POST** `/api/database/test`
- Validates PostgreSQL connection
- Update `db_password` in environment first

#### 2. Fetch Metrics from PostgreSQL
**POST** `/api/postgres/metrics`
- Retrieves all metrics from database
- Requires valid database credentials

#### 3. Save Metric to PostgreSQL
**POST** `/api/postgres/metrics/save`
- Creates or updates a metric in the database
- Set `isUpdate: false` for new metrics
- Set `isUpdate: true` for updates

#### 4. Save Domain
**POST** `/api/postgres/domains/save`
- Manages business domains
- Includes stakeholders and metadata

#### 5. Save Objective with Key Results
**POST** `/api/postgres/objectives/save`
- Creates objectives with multiple key results
- Links to metrics via `metric_ids`

## 🔧 Dynamic Variables

The collection uses Insomnia's dynamic variables:

- `{{ _.base_url }}` - Base API URL
- `{{ _.timestamp }}` - Current Unix timestamp (for unique IDs)
- `{{ _.db_host }}`, `{{ _.db_port }}`, etc. - Database credentials
- `{{ _.sample_metric_id }}` - Sample metric ID for testing

## 📝 Request Body Examples

### Create Metric (Minimal)

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
  "alignment": {
    "objectives": [],
    "kpis": [],
    "stakeholders": []
  },
  "definition": {
    "calculation": "count(events)",
    "unit": "count",
    "format": "0"
  },
  "data": {
    "sources": ["Test DB"],
    "refresh_frequency": "Real-time",
    "latency": "< 1s"
  },
  "governance": {
    "owner": "test@example.com",
    "steward": "admin@example.com",
    "approvers": []
  },
  "dimensions": [],
  "targets_and_alerts": {
    "targets": [],
    "alerts": []
  },
  "visualization": {
    "chart_type": "line",
    "default_view": "Last 24h"
  },
  "relationships": {
    "depends_on": [],
    "influences": []
  },
  "operational_usage": {
    "dashboards": [],
    "reports": [],
    "automations": []
  },
  "metadata": {
    "created_date": "2025-11-15T00:00:00Z",
    "last_updated": "2025-11-15T00:00:00Z",
    "version": "1.0",
    "status": "active"
  }
}
```

### PostgreSQL Config

All PostgreSQL requests require a `dbConfig` object:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "mdl",
  "user": "postgres",
  "password": "your_password_here"
}
```

## 🎯 Testing Tips

1. **Start with Health Check** - Verify server connectivity
2. **Test Database Connection** - Before running PostgreSQL operations
3. **Use Filters** - Try the "Get Metrics (Filtered)" request to test query parameters
4. **Check Statistics** - View the stats endpoint to see data distribution
5. **Generate Policies** - Test OPA policy generation for governance
6. **Test CRUD Operations** - Create, read, update, delete in sequence
7. **Validate Relationships** - Test objectives linking to metrics

## 🔐 Security Notes

- The collection uses `http://localhost:3000` by default (no SSL)
- For production use, update `base_url` to use HTTPS
- Store database passwords securely (use environment variables)
- Never commit credentials to version control

## 📚 Additional Resources

- [OpenAPI Specification](./openapi.yaml) - Full API documentation
- [README](./README.md) - Project overview and setup
- [Database Setup](./DATABASE_SETUP.md) - PostgreSQL configuration

## 🐛 Troubleshooting

### Connection Refused
- Ensure the MDL server is running: `npm start`
- Check the port (default: 3000)

### PostgreSQL Errors
- Verify database credentials in environment
- Ensure PostgreSQL is running
- Check database exists: `psql -l`
- Run setup script: `npm run db:setup`

### 404 Not Found
- Verify the endpoint URL
- Check if the resource exists (metric ID, domain ID, etc.)

### 400 Bad Request
- Validate request body against OpenAPI schema
- Ensure all required fields are present
- Check data types (strings, numbers, arrays)

## 💡 Pro Tips

1. **Use Folders** - The collection is organized into logical groups
2. **Duplicate Requests** - Create variations for different test scenarios
3. **Chain Requests** - Use response data from one request in another
4. **Add Tests** - Insomnia supports assertions for automated testing
5. **Export Results** - Save responses for documentation or debugging

## 🤝 Contributing

To update the collection:

1. Make changes in Insomnia
2. Export the collection (JSON format)
3. Replace `insomnia-collection.json`
4. Update this README if needed
5. Submit a pull request

## 📄 License

This collection is part of the MDL project and follows the same license (MIT).

---

**Happy Testing! 🚀**

For questions or issues, please open an issue on the MDL repository.
