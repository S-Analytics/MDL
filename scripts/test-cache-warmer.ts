#!/usr/bin/env ts-node

/**
 * Test cache warmer functionality
 * 
 * This script tests the cache warmer in isolation without starting the server.
 */

import 'dotenv/config';
import { cacheService } from '../src/cache/CacheService';
import { CacheWarmer } from '../src/cache/warmer';
import { InMemoryMetricStore } from '../src/storage';

async function testCacheWarmer() {
  console.log('🧪 Testing Cache Warmer\n');

  // Create a test store with some sample data
  const store = new InMemoryMetricStore();
  
  // Add sample metrics
  const sampleMetrics = [
    {
      metric_id: 'test-001',
      name: 'Revenue Growth',
      category: 'operational',
      tier: 'tier1',
      business_domain: 'finance',
      description: 'Test metric 1',
      metric_type: 'percentage'
    },
    {
      metric_id: 'test-002',
      name: 'Customer Satisfaction',
      category: 'strategic',
      tier: 'tier1',
      business_domain: 'customer',
      description: 'Test metric 2',
      metric_type: 'percentage'
    },
    {
      metric_id: 'test-003',
      name: 'Operational Efficiency',
      category: 'tactical',
      tier: 'tier2',
      business_domain: 'operations',
      description: 'Test metric 3',
      metric_type: 'ratio'
    }
  ];

  for (const metric of sampleMetrics) {
    await store.create(metric);
  }

  console.log(`✅ Created ${sampleMetrics.length} test metrics\n`);

  // Create cache warmer
  const warmer = new CacheWarmer(store, {
    enabled: true,
    warmOnStartup: false, // Don't auto-warm on construction
    scheduledInterval: 0, // Disable scheduling for test
    maxMetricsToWarm: 10
  });

  console.log('🔥 Running cache warmer...\n');

  // Clear cache first
  await cacheService.clear();
  console.log('✅ Cache cleared\n');

  // Get initial stats
  const statsBefore = await cacheService.getStats();
  console.log(`📊 Cache keys before warming: ${statsBefore?.keys || 0}\n`);

  // Warm the cache
  await warmer.warmCache();

  // Get stats after warming
  const statsAfter = await cacheService.getStats();
  console.log(`\n📊 Cache keys after warming: ${statsAfter?.keys || 0}`);

  // Verify cached entries
  console.log('\n🔍 Verifying cached entries:\n');

  // Check full list
  const fullListKey = '/api/v1/metrics:anonymous:{}';
  const fullList = await cacheService.get(fullListKey);
  console.log(`   ✓ Full metrics list: ${fullList ? '✅ CACHED' : '❌ NOT CACHED'}`);

  // Check category queries
  const categories = ['operational', 'strategic', 'tactical'];
  for (const category of categories) {
    const key = `/api/v1/metrics:anonymous:{"category":"${category}"}`;
    const data = await cacheService.get(key);
    console.log(`   ✓ Category "${category}": ${data ? '✅ CACHED' : '❌ NOT CACHED'}`);
  }

  // Check tier queries
  const tiers = ['tier1', 'tier2', 'tier3'];
  for (const tier of tiers) {
    const key = `/api/v1/metrics:anonymous:{"tier":"${tier}"}`;
    const data = await cacheService.get(key);
    console.log(`   ✓ Tier "${tier}": ${data ? '✅ CACHED' : '❌ NOT CACHED'}`);
  }

  // Check individual metrics
  for (const metric of sampleMetrics) {
    const key = `/api/v1/metrics/${metric.metric_id}:anonymous:{}`;
    const data = await cacheService.get(key);
    console.log(`   ✓ Metric "${metric.metric_id}": ${data ? '✅ CACHED' : '❌ NOT CACHED'}`);
  }

  // Test warmer status
  console.log('\n📋 Warmer Status:');
  const status = warmer.getStatus();
  console.log(`   Enabled: ${status.enabled}`);
  console.log(`   Is Warming: ${status.isWarming}`);
  console.log(`   Scheduled: ${status.scheduled}`);

  // List all cached keys
  console.log('\n📦 All cached keys:');
  const allKeys = await cacheService.getAllKeys();
  if (allKeys && allKeys.length > 0) {
    allKeys.forEach(key => console.log(`   - ${key}`));
  } else {
    console.log('   (none)');
  }

  // Clean up
  await cacheService.close();
  console.log('\n✅ Test completed!\n');
  process.exit(0);
}

// Add getAllKeys method if it doesn't exist
async function getAllKeys(): Promise<string[]> {
  // This is a workaround - in production you'd use SCAN
  return [];
}

testCacheWarmer().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
