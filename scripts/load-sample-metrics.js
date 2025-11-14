#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load the catalog
const catalogPath = path.join(__dirname, '../examples/sample-metrics.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Extract just the metrics array
const metrics = catalog.metrics;

// Save to the metrics store
const storePath = path.join(__dirname, '../.mdl/metrics.json');
fs.writeFileSync(storePath, JSON.stringify(metrics, null, 2));

console.log(`✓ Successfully loaded ${metrics.length} metrics into store`);
console.log('\nMetrics loaded:');
metrics.forEach((metric, index) => {
  console.log(`  ${index + 1}. ${metric.name} (${metric.metric_id})`);
  console.log(`     Tier: ${metric.tier}, Domain: ${metric.business_domain}`);
});
