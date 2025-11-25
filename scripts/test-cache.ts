#!/usr/bin/env ts-node

import { cacheService } from '../src/cache/CacheService';

async function testCache() {
  console.log('Testing cache service...\n');
  
  // Test 1: Health Check
  console.log('1. Health Check:');
  const isHealthy = await cacheService.healthCheck();
  console.log(`   Redis health: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`);
  
  // Test 2: Set and Get
  console.log('2. Set and Get:');
  const testData = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
  await cacheService.set('test:key', testData, 60);
  const retrieved = await cacheService.get('test:key');
  console.log(`   Stored: ${JSON.stringify(testData)}`);
  console.log(`   Retrieved: ${JSON.stringify(retrieved)}`);
  console.log(`   Match: ${JSON.stringify(testData) === JSON.stringify(retrieved) ? '✅' : '❌'}\n`);
  
  // Test 3: Cache miss
  console.log('3. Cache Miss:');
  const missing = await cacheService.get('nonexistent:key');
  console.log(`   Result: ${missing === null ? '✅ NULL (expected)' : '❌ Unexpected value'}\n`);
  
  // Test 4: Delete
  console.log('4. Delete:');
  await cacheService.delete('test:key');
  const afterDelete = await cacheService.get('test:key');
  console.log(`   After delete: ${afterDelete === null ? '✅ NULL (expected)' : '❌ Still exists'}\n`);
  
  // Test 5: Pattern operations
  console.log('5. Pattern Operations:');
  await cacheService.set('metrics:1', { id: 1 }, 60);
  await cacheService.set('metrics:2', { id: 2 }, 60);
  await cacheService.set('metrics:3', { id: 3 }, 60);
  const deleted = await cacheService.deletePattern('mdl:metrics:*');
  console.log(`   Deleted ${deleted} keys matching pattern ✅\n`);
  
  // Test 6: Stats
  console.log('6. Cache Stats:');
  const stats = await cacheService.getStats();
  if (stats) {
    console.log(`   Keys in cache: ${stats.keys}`);
    console.log(`   Connection: ${stats.connected ? '✅ Connected' : '❌ Disconnected'}`);
  }
  
  // Close connection
  await cacheService.close();
  console.log('\n✅ All tests completed!');
  process.exit(0);
}

testCache().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
