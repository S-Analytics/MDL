#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from './config';
import { MetricDefinitionInput } from './models';
import { PolicyGenerator } from './opa';
import { InMemoryMetricStore } from './storage';

const program = new Command();
const DEFAULT_STORAGE_PATH = path.join(process.cwd(), '.mdl', 'metrics.json');

// Initialize store
const store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);

program
  .name('mdl')
  .description('Metrics Definition Library - Manage metric definitions with OPA policies')
  .version('1.0.0');

// List metrics command
program
  .command('list')
  .description('List all metric definitions')
  .option('-d, --business-domain <domain>', 'Filter by business domain')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('--tier <tier>', 'Filter by tier')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const filters = {
        business_domain: options.businessDomain,
        tags: options.tags ? options.tags.split(',') : undefined,
        tier: options.tier,
      };

      const metrics = await store.findAll(
        Object.keys(filters).some((k) => filters[k as keyof typeof filters])
          ? filters
          : undefined
      );

      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        if (metrics.length === 0) {
          console.log('No metrics found.');
        } else {
          console.log(`\nFound ${metrics.length} metric(s):\n`);
          metrics.forEach((metric) => {
            console.log(`ID: ${metric.metric_id}`);
            console.log(`Name: ${metric.name}`);
            console.log(`Category: ${metric.category}`);
            console.log(`Type: ${metric.metric_type}`);
            console.log(`Business Domain: ${metric.business_domain}`);
            console.log(`Tier: ${metric.tier}`);
            console.log(`Description: ${metric.description}`);
            if (metric.governance?.technical_owner) {
              console.log(`Owner: ${metric.governance.technical_owner}`);
            }
            console.log('---');
          });
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Show metric command
program
  .command('show <id>')
  .description('Show details of a specific metric')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const metric = await store.findById(id);
      if (!metric) {
        console.error(`Metric with ID "${id}" not found.`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(metric, null, 2));
      } else {
        console.log('\nMetric Details:');
        console.log('===============');
        Object.entries(metric).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            console.log(`${key}:`, JSON.stringify(value, null, 2));
          } else {
            console.log(`${key}:`, value);
          }
        });
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Import metrics from config file
program
  .command('import <file>')
  .description('Import metrics from a YAML or JSON configuration file')
  .action(async (file) => {
    try {
      console.log(`Loading metrics from ${file}...`);
      const metrics = ConfigLoader.loadFromFile(file);
      
      console.log(`Found ${metrics.length} metric(s) to import.`);
      
      for (const metric of metrics) {
        // Store.create accepts MetricDefinitionInput and will handle conversion
        const created = await store.create(metric as unknown as MetricDefinitionInput);
        console.log(`✓ Imported: ${created.name} (${created.metric_id})`);
      }
      
      console.log(`\nSuccessfully imported ${metrics.length} metric(s).`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Export metrics to config file
program
  .command('export <file>')
  .description('Export all metrics to a YAML or JSON file')
  .action(async (file) => {
    try {
      const metrics = await store.findAll();
      
      if (metrics.length === 0) {
        console.log('No metrics to export.');
        return;
      }

      ConfigLoader.saveToFile(file, metrics as unknown as MetricDefinitionInput[]);
      console.log(`Exported ${metrics.length} metric(s) to ${file}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Delete metric command
program
  .command('delete <id>')
  .description('Delete a metric definition')
  .action(async (id) => {
    try {
      const deleted = await store.delete(id);
      if (!deleted) {
        console.error(`Metric with ID "${id}" not found.`);
        process.exit(1);
      }
      console.log(`Successfully deleted metric: ${id}`);
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Generate OPA policy command
program
  .command('policy <id>')
  .description('Generate OPA policy for a metric')
  .option('-o, --output <file>', 'Save policy to file')
  .action(async (id, options) => {
    try {
      const metric = await store.findById(id);
      if (!metric) {
        console.error(`Metric with ID "${id}" not found.`);
        process.exit(1);
      }

      const policy = PolicyGenerator.generatePolicy(metric);

      if (options.output) {
        const dir = path.dirname(options.output);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(options.output, policy, 'utf8');
        console.log(`Policy saved to ${options.output}`);
      } else {
        console.log(policy);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Generate all OPA policies command
program
  .command('policies')
  .description('Generate OPA policies for all metrics')
  .option('-o, --output <directory>', 'Save policies to directory')
  .action(async (options) => {
    try {
      const metrics = await store.findAll();
      
      if (metrics.length === 0) {
        console.log('No metrics found.');
        return;
      }

      const policies = PolicyGenerator.generatePolicyBundle(metrics);

      if (options.output) {
        if (!fs.existsSync(options.output)) {
          fs.mkdirSync(options.output, { recursive: true });
        }

        policies.forEach((policy, fileName) => {
          const filePath = path.join(options.output, fileName);
          fs.writeFileSync(filePath, policy, 'utf8');
          console.log(`✓ Generated: ${fileName}`);
        });

        console.log(`\nGenerated ${policies.size} policy file(s) in ${options.output}`);
      } else {
        policies.forEach((policy, fileName) => {
          console.log(`\n=== ${fileName} ===\n`);
          console.log(policy);
        });
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show statistics about metrics')
  .action(async () => {
    try {
      const metrics = await store.findAll();
      
      const stats = {
        total: metrics.length,
        byCategory: {} as Record<string, number>,
        byTier: {} as Record<string, number>,
        byMetricType: {} as Record<string, number>,
        byBusinessDomain: {} as Record<string, number>,
        byOwner: {} as Record<string, number>,
      };

      metrics.forEach((metric) => {
        stats.byCategory[metric.category] = (stats.byCategory[metric.category] || 0) + 1;
        if (metric.tier) {
          stats.byTier[metric.tier] = (stats.byTier[metric.tier] || 0) + 1;
        }
        if (metric.metric_type) {
          stats.byMetricType[metric.metric_type] = (stats.byMetricType[metric.metric_type] || 0) + 1;
        }
        if (metric.business_domain) {
          stats.byBusinessDomain[metric.business_domain] = (stats.byBusinessDomain[metric.business_domain] || 0) + 1;
        }
        if (metric.governance?.technical_owner) {
          stats.byOwner[metric.governance.technical_owner] = (stats.byOwner[metric.governance.technical_owner] || 0) + 1;
        }
      });

      console.log('\nMetrics Statistics:');
      console.log('===================');
      console.log(`Total metrics: ${stats.total}`);
      
      if (Object.keys(stats.byCategory).length > 0) {
        console.log('\nBy Category:');
        Object.entries(stats.byCategory).forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count}`);
        });
      }

      if (Object.keys(stats.byTier).length > 0) {
        console.log('\nBy Tier:');
        Object.entries(stats.byTier).forEach(([tier, count]) => {
          console.log(`  ${tier}: ${count}`);
        });
      }

      if (Object.keys(stats.byMetricType).length > 0) {
        console.log('\nBy Metric Type:');
        Object.entries(stats.byMetricType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });
      }

      if (Object.keys(stats.byBusinessDomain).length > 0) {
        console.log('\nBy Business Domain:');
        Object.entries(stats.byBusinessDomain).forEach(([domain, count]) => {
          console.log(`  ${domain}: ${count}`);
        });
      }

      if (Object.keys(stats.byOwner).length > 0) {
        console.log('\nBy Owner:');
        Object.entries(stats.byOwner).forEach(([owner, count]) => {
          console.log(`  ${owner}: ${count}`);
        });
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
