#!/usr/bin/env ts-node

import 'dotenv/config';
import { cacheService } from '../src/cache/CacheService';

async function quickTest() {
  // Set a value
  await cacheService.set('manual:test', { foo: 'bar', timestamp: Date.now() }, 300);
  console.log('✅ Value set in cache');
  
  // Get it back
  const value = await cacheService.get('manual:test');
  console.log('Retrieved value:', value);
  
  // Check stats
  const stats = await cacheService.getStats();
  console.log('Cache stats:', stats);
  
  console.log('\n✅ Manual test complete - check Redis with: redis-cli KEYS "mdl:*"');
  process.exit(0);
}

quickTest().catch(console.error);
