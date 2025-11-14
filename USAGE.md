# MDL Usage Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Start the Server

```bash
npm start
```

The server will start on port 3000 with:
- Dashboard: http://localhost:3000/dashboard
- API: http://localhost:3000/api/metrics
- Health Check: http://localhost:3000/health

## Working with Metrics

### Import Sample Metrics

```bash
# Import from JSON
npm run cli import examples/sample-metrics.json

# Import from YAML
npm run cli import examples/sample-metrics.yaml
```

### List Metrics

```bash
# List all metrics
npm run cli list

# List with filters
npm run cli list --category financial
npm run cli list --tags "kpi,revenue"
npm run cli list --owner finance-team

# Get JSON output
npm run cli list --json
```

### View Metric Details

```bash
npm run cli show <metric-id>
npm run cli show <metric-id> --json
```

### Export Metrics

```bash
# Export to JSON
npm run cli export my-metrics.json

# Export to YAML
npm run cli export my-metrics.yaml
```

### Delete Metrics

```bash
npm run cli delete <metric-id>
```

### View Statistics

```bash
npm run cli stats
```

## OPA Policy Generation

### Generate Policy for Single Metric

```bash
# Print to console
npm run cli policy <metric-id>

# Save to file
npm run cli policy <metric-id> --output policy.rego
```

### Generate Policies for All Metrics

```bash
# Print to console
npm run cli policies

# Save to directory
npm run cli policies --output ./policies
```

## REST API Usage

### Get All Metrics

```bash
curl http://localhost:3000/api/metrics
```

With filters:
```bash
curl "http://localhost:3000/api/metrics?category=financial"
curl "http://localhost:3000/api/metrics?tags=kpi,revenue"
curl "http://localhost:3000/api/metrics?owner=finance-team"
```

### Get Specific Metric

```bash
curl http://localhost:3000/api/metrics/<metric-id>
```

### Create New Metric

```bash
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Metric",
    "description": "Description of my metric",
    "category": "business",
    "dataType": "number",
    "unit": "count",
    "tags": ["important", "kpi"],
    "validationRules": [
      {
        "type": "min",
        "value": 0,
        "message": "Value must be non-negative"
      }
    ],
    "governance": {
      "owner": "my-team",
      "team": "Engineering",
      "complianceLevel": "internal"
    }
  }'
```

### Update Metric

```bash
curl -X PUT http://localhost:3000/api/metrics/<metric-id> \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### Delete Metric

```bash
curl -X DELETE http://localhost:3000/api/metrics/<metric-id>
```

### Get OPA Policy

```bash
# Get policy for specific metric
curl http://localhost:3000/api/metrics/<metric-id>/policy

# Get all policies
curl http://localhost:3000/api/policies
```

### Get Statistics

```bash
curl http://localhost:3000/api/stats
```

## Web Dashboard

Access the dashboard at http://localhost:3000/dashboard

Features:
- **Overview Statistics**: Total metrics, categories, data types, and owners
- **Visual Charts**: Bar charts showing distribution by category and data type
- **Search & Filter**: Search metrics by name/description, filter by category
- **Metric Details**: View all metric information including governance and compliance
- **Real-time Updates**: Click "Refresh" to see latest changes

## Development

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch
```

### Lint Code

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Format Code

```bash
npm run format
```

### Development Mode

```bash
# Run server with auto-reload
npm run dev
```

## Configuration Files

### JSON Format

```json
{
  "metrics": [
    {
      "name": "Metric Name",
      "description": "Metric description",
      "category": "category-name",
      "dataType": "number",
      "unit": "count",
      "tags": ["tag1", "tag2"],
      "validationRules": [
        {
          "type": "min",
          "value": 0
        }
      ],
      "governance": {
        "owner": "team-name",
        "team": "Team Name"
      }
    }
  ]
}
```

### YAML Format

```yaml
metrics:
  - name: Metric Name
    description: Metric description
    category: category-name
    dataType: number
    unit: count
    tags:
      - tag1
      - tag2
    validationRules:
      - type: min
        value: 0
    governance:
      owner: team-name
      team: Team Name
```

## Data Types

- `number` - Numeric values
- `percentage` - Percentage (0-100)
- `currency` - Monetary values
- `count` - Integer counts
- `ratio` - Ratio values
- `duration` - Time duration
- `boolean` - True/false
- `string` - Text values

## Validation Rules

- `min` - Minimum value
- `max` - Maximum value
- `range` - Range [min, max]
- `required` - Value required
- `pattern` - Regex pattern
- `enum` - Allowed values list

## Governance Levels

### Compliance Levels
- `public` - Public information
- `internal` - Internal use only
- `confidential` - Confidential data
- `restricted` - Highly restricted

### Data Classification
- `public` - Public data
- `internal` - Internal data
- `sensitive` - Sensitive information
- `highly_sensitive` - Highly sensitive data

## Storage

Metrics are stored in `.mdl/metrics.json` by default. This file is created automatically and persists across server restarts.

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

Example:
```bash
PORT=8080 npm start
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Try a different port: `PORT=8080 npm start`

### Metrics not loading
- Ensure `.mdl/metrics.json` exists and is valid JSON
- Check server logs for errors
- Restart the server

### CLI commands not working
- Ensure you've run `npm install` and `npm run build`
- Check that the CLI binary is executable

### Tests failing
- Run `npm install` to ensure all dependencies are installed
- Check that no test files are open in watch mode
- Clear test cache: `npm test -- --clearCache`
