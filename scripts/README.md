# MDL Scripts

Utility scripts for managing the Metrics Definition Library.

## Available Scripts

### load-sample-metrics.js

Loads the comprehensive sample metrics from `examples/sample-metrics.json` into the metrics store (`.mdl/metrics.json`).

### load-sample-metrics.js

**Usage:**
```bash
npm run load:samples
# or
node scripts/load-sample-metrics.js
```

**What it does:**
- Reads the sample metrics catalog
- Extracts the metrics array
- Writes directly to the store file
- Preserves all comprehensive metric definitions (alignment, governance, targets, etc.)

**Note:** This script directly replaces the metrics store, so any existing metrics will be overwritten. The previous store is backed up as `.mdl/metrics.json.backup`.

## Sample Metrics Included

The sample metrics cover different business domains and metric types:

1. **Login Success Rate** (Tier-1, KPI)
   - Business Domain: Digital Experience
   - Type: Leading indicator
   - Measures authentication success

2. **API Response Time P95** (Tier-1, Performance)
   - Business Domain: Platform
   - Type: Operational
   - Measures API performance

3. **Annual Recurring Revenue (ARR)** (Tier-1, Finance)
   - Business Domain: Revenue
   - Type: Lagging indicator
   - Measures business growth

4. **Customer Churn Rate** (Tier-1, Retention)
   - Business Domain: Customer Success
   - Type: Lagging indicator
   - Measures customer retention

5. **Deployment Frequency** (Tier-2, Engineering)
   - Business Domain: Platform
   - Type: Operational
   - Measures DevOps maturity (DORA metric)

Each metric includes:
- Complete metadata (tier, domain, type, tags)
- Strategic alignment (objectives, key results)
- Detailed definitions (formula, data sources)
- Governance information (owners, classification)
- Targets and alert rules
- Visualization preferences
- Operational usage guidelines
