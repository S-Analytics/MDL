#!/usr/bin/env ts-node

import Redis from 'ioredis';

async function testWithPrefix() {
  console.log('Testing Redis with keyPrefix...\n');
  
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    keyPrefix: 'mdl:',
  });
  
  // Wait for connection
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Redis status: ${redis.status}`);
  
  // Test SET with prefix
  console.log('\nTesting SET with keyPrefix...');
  const setResult = await redis.set('test:key', JSON.stringify({ foo: 'bar' }), 'EX', 60);
  console.log(`SET result: ${setResult}`);
  
  // Test GET
  console.log('\nTesting GET...');
  const getValue = await redis.get('test:key');
  console.log(`GET result: ${getValue}`);
  
  // Check all keys (including prefix)
  console.log('\nAll keys with prefix:');
  const prefixedKeys = await redis.keys('*');
  console.log('Via redis.keys("*"):', prefixedKeys);
  
  await redis.quit();
  
  console.log('\n✅ Test complete!');
  process.exit(0);
}

testWithPrefix().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
