# MDL - Metrics Definition Library

A comprehensive application to store and manage Metric Definitions with support for multiple interfaces (API, CLI, config files), OPA policy generation, and visualization dashboard for transparency and governance.

## Features

- 📊 **Metric Definition Management**: Store and manage metric definitions with rich metadata
- 🔌 **Multiple Interfaces**: 
  - REST API for programmatic access
  - CLI for command-line operations
  - YAML/JSON config file loading
- 🔐 **OPA Policy Integration**: Generate Open Policy Agent policies from metric definitions
- 📈 **Visualization Dashboard**: Web-based dashboard for transparency and governance
- ✅ **Validation Rules**: Define validation rules for metrics (min, max, range, enum, etc.)
- 👥 **Governance Support**: Track owners, teams, approvers, and compliance levels
- 💾 **Persistent Storage**: File-based persistence with in-memory performance

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000` with:
- Dashboard: `http://localhost:3000/dashboard`
- API: `http://localhost:3000/api/metrics`
- Health Check: `http://localhost:3000/health`

### 2. Use the CLI

```bash
# Import sample metrics
npm run cli import examples/sample-metrics.json

# List all metrics
npm run cli list

# Show details of a specific metric
npm run cli show <metric-id>

# Generate OPA policy for a metric
npm run cli policy <metric-id>

# Show statistics
npm run cli stats
```

### 3. Use the API

```bash
# Get all metrics
curl http://localhost:3000/api/metrics

# Get a specific metric
curl http://localhost:3000/api/metrics/<metric-id>

# Create a new metric
curl -X POST http://localhost:3000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Metric",
    "description": "Description of my metric",
    "category": "business",
    "dataType": "number"
  }'

# Get OPA policy for a metric
curl http://localhost:3000/api/metrics/<metric-id>/policy
```

## Metric Definition Schema

A metric definition includes:

```typescript
{
  id: string;                    // Auto-generated unique ID
  name: string;                  // Human-readable name
  description: string;           // Detailed description
  category: string;              // Category (e.g., financial, performance)
  dataType: DataType;           // Type: number, percentage, currency, etc.
  unit?: string;                 // Optional unit (e.g., USD, ms)
  tags?: string[];              // Optional tags for categorization
  validationRules?: ValidationRule[];  // Validation constraints
  governance?: GovernanceInfo;   // Ownership and compliance info
  metadata?: Record<string, any>; // Additional custom metadata
}
```

### Data Types

- `number` - Numeric values
- `percentage` - Percentage values (0-100)
- `currency` - Monetary values
- `count` - Integer counts
- `ratio` - Ratio values
- `duration` - Time duration values
- `boolean` - True/false values
- `string` - Text values

### Validation Rules

- `min` - Minimum value constraint
- `max` - Maximum value constraint
- `range` - Range constraint [min, max]
- `required` - Value must be present
- `pattern` - Regex pattern match
- `enum` - Value must be in specified list

### Governance

Track ownership and compliance:

```typescript
{
  owner: string;                    // Primary owner
  team?: string;                    // Owning team
  approvers?: string[];            // List of approvers
  complianceLevel?: ComplianceLevel; // public, internal, confidential, restricted
  dataClassification?: DataClassification; // Data sensitivity level
  auditRequired?: boolean;         // Whether auditing is required
}
```

## CLI Commands

### Import/Export

```bash
# Import metrics from YAML or JSON file
mdl import <file>

# Export metrics to YAML or JSON file
mdl export <file>
```

### List and View

```bash
# List all metrics
mdl list

# List with filters
mdl list --category financial
mdl list --tags "kpi,revenue"
mdl list --owner finance-team

# Show metric details
mdl show <metric-id>

# Get as JSON
mdl list --json
mdl show <metric-id> --json
```

### Delete

```bash
# Delete a metric
mdl delete <metric-id>
```

### OPA Policies

```bash
# Generate policy for a single metric
mdl policy <metric-id>

# Save policy to file
mdl policy <metric-id> --output policy.rego

# Generate policies for all metrics
mdl policies

# Save all policies to directory
mdl policies --output ./policies
```

### Statistics

```bash
# Show statistics
mdl stats
```

## API Endpoints

### Metrics

- `GET /api/metrics` - List all metrics (supports filtering)
  - Query params: `category`, `dataType`, `owner`, `tags` (comma-separated)
- `GET /api/metrics/:id` - Get a specific metric
- `POST /api/metrics` - Create a new metric
- `PUT /api/metrics/:id` - Update a metric
- `DELETE /api/metrics/:id` - Delete a metric

### Policies

- `GET /api/metrics/:id/policy` - Get OPA policy for a metric
- `GET /api/policies` - Get OPA policies for all metrics

### Statistics

- `GET /api/stats` - Get statistics about metrics

### Health

- `GET /health` - Health check endpoint

## Configuration Files

### JSON Format

```json
{
  "metrics": [
    {
      "name": "Revenue",
      "description": "Total revenue",
      "category": "financial",
      "dataType": "currency",
      "unit": "USD",
      "tags": ["revenue", "kpi"],
      "validationRules": [
        {
          "type": "min",
          "value": 0
        }
      ],
      "governance": {
        "owner": "finance-team",
        "team": "Finance"
      }
    }
  ]
}
```

### YAML Format

```yaml
metrics:
  - name: Revenue
    description: Total revenue
    category: financial
    dataType: currency
    unit: USD
    tags:
      - revenue
      - kpi
    validationRules:
      - type: min
        value: 0
    governance:
      owner: finance-team
      team: Finance
```

## OPA Policy Generation

MDL automatically generates OPA (Open Policy Agent) policies from metric definitions. These policies include:

- **Validation Rules**: Enforce metric value constraints
- **Governance Rules**: Control access based on ownership and approvers
- **Metadata**: Include metric context in policy comments

Example generated policy:

```rego
# OPA Policy for Metric: Revenue
# Category: financial

package metrics.revenue_xyz

import future.keywords.if
import future.keywords.in

default allow = false

# Validation rules
validate_value if {
    input.value >= 0
}

# Governance rules
validate_governance if {
    input.user.id == "finance-team"
} else if {
    input.user.id in ["cfo@example.com"]
}

# Main authorization rule
allow if {
    input.metric_id == "revenue-xyz"
    validate_value
    validate_governance
}
```

## Dashboard

Access the web dashboard at `http://localhost:3000/dashboard` to:

- View all metrics with search and filtering
- See statistics and visualizations
- Monitor governance and compliance
- Track metrics by category, data type, and owner

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Lint
npm run lint

# Format code
npm run format
```

## Examples

See the `examples/` directory for sample metric definitions:

- `examples/sample-metrics.json` - JSON format examples
- `examples/sample-metrics.yaml` - YAML format examples

## Architecture

```
src/
├── models/          # Data models and types
├── storage/         # Storage layer (in-memory with persistence)
├── api/            # REST API server
├── cli/            # Command-line interface
├── config/         # Configuration file loading
├── opa/            # OPA policy generation
├── dashboard/      # Web dashboard
└── index.ts        # Main entry point
```

## Storage

By default, metrics are persisted to `.mdl/metrics.json` in the current working directory. This can be configured via environment variables or programmatically.

## License

MIT
