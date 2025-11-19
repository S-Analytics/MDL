# MDL Import Templates

Blank templates for importing data into the Metrics Definition Library.

## Available Templates

### Metrics
- **JSON:** `template-metric.json` - Single metric definition
- **YAML:** `template-metric.yaml` - Single metric definition

### Business Domains
- **JSON:** `template-domain.json` - Single business domain
- **YAML:** `template-domain.yaml` - Single business domain

### Objectives
- **JSON:** `template-objective.json` - Single objective with key results
- **YAML:** `template-objective.yaml` - Single objective with key results

## Usage

### 1. Copy Template
```bash
# Copy the template you need
cp examples/template-metric.json my-metric.json
```

### 2. Fill in Values
Edit the file and replace empty strings with your data:
- Remove fields you don't need (most are optional)
- Keep required fields: `metric_id`, `name`, `description`, `category`, etc.
- Leave `version` as "1.0.0" for new metrics

### 3. Import

**Universal Import - supports all data types automatically:**

```bash
# Using CLI (auto-detects type)
npm run cli import my-metric.json
npm run cli import my-domain.json
npm run cli import my-objective.json

# Using API (universal import endpoint)
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '{"data": {...}}'

# Using Dashboard
# 1. Click "Import" button
# 2. Select your template file
# 3. Click "Import Data"
# System automatically detects and imports metrics, domains, or objectives
```

**Note:** Domains and objectives require database storage to be configured.

## Field Guidelines

### Metrics

**Required Fields:**
- `metric_id` - Unique identifier (e.g., "METRIC-LOGIN-SUCCESS-RATE")
- `name` - Human-readable name
- `description` - Detailed description
- `category` - Category (e.g., "Performance", "Business", "Operational")
- `tier` - Tier level ("Tier-1", "Tier-2", "Tier-3")

**Common Field Values:**

**metric_type:**
- `operational` - Operational metrics
- `business` - Business metrics
- `technical` - Technical metrics

**expected_direction:**
- `increase` - Higher is better
- `decrease` - Lower is better
- `stable` - Stability is desired

**data_classification:**
- `Public` - Publicly shareable
- `Internal` - Internal use only
- `Confidential` - Confidential data
- `Restricted` - Highly restricted

**status:**
- `draft` - In development
- `active` - Active and in use
- `deprecated` - No longer recommended
- `archived` - Archived

**default_chart_type:**
- `line` - Line chart
- `bar` - Bar chart
- `pie` - Pie chart
- `area` - Area chart

**severity (alert_rules):**
- `info` - Informational
- `warning` - Warning level
- `critical` - Critical level

### Domains

**Required Fields:**
- `id` - Unique identifier (e.g., "auth-1234")
- `name` - Domain name
- `description` - Domain description
- `owner` - Owner email

**priority values:**
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority

### Objectives

**Required Fields:**
- `objective_id` - Unique identifier (e.g., "OBJ-20251118120000")
- `title` - Objective title
- `description` - Objective description
- `owner` - Owner email
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)

**status values:**
- `planning` - In planning phase
- `in_progress` - Currently active
- `completed` - Completed
- `on_hold` - On hold
- `cancelled` - Cancelled

**business_priority values:**
- `P0` - Critical priority
- `P1` - High priority
- `P2` - Medium priority
- `P3` - Low priority

**Key Result status values:**
- `not_started` - Not started
- `on_track` - On track
- `at_risk` - At risk
- `behind` - Behind schedule
- `completed` - Completed

## Batch Import

To import multiple items, wrap them in an array:

**metrics-batch.json:**
```json
{
  "metrics": [
    {
      "metric_id": "METRIC-001",
      "name": "First Metric",
      ...
    },
    {
      "metric_id": "METRIC-002",
      "name": "Second Metric",
      ...
    }
  ]
}
```

**domains-batch.json:**
```json
{
  "domains": [
    {
      "id": "domain-001",
      "name": "First Domain",
      ...
    }
  ]
}
```

**objectives-batch.json:**
```json
{
  "objectives": [
    {
      "objective_id": "OBJ-001",
      "title": "First Objective",
      ...
    }
  ]
}
```

## Examples

See the existing sample files for complete examples:
- `sample-metrics.json` / `sample-metrics.yaml`
- `sample-domains.json`
- `sample-objectives.json`

## Tips

1. **IDs:** Use descriptive, unique IDs that won't conflict
2. **Timestamps:** Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
3. **Versioning:** Start with "1.0.0", system will auto-increment
4. **Arrays:** Use empty arrays `[]` for optional list fields
5. **Nulls:** Use `null` for optional numeric fields
6. **Validation:** API will validate on import and show errors

## Need Help?

- Check the [README](../README.md) for full API documentation
- See [INSOMNIA.md](../INSOMNIA.md) for API testing examples
- Review sample data files in this directory
- Check the OpenAPI spec: [openapi.yaml](../openapi.yaml)
