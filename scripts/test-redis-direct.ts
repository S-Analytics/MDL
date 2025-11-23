#!/usr/bin/env ts-node

import Redis from 'ioredis';

async function testRedis() {
  console.log('Testing Redis connection directly...\n');
  
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });
  
  redis.on('connect', () => console.log('Event: connect'));
  redis.on('ready', () => console.log('Event: ready'));
  redis.on('error', (err) => console.log('Event: error', err));
  
  // Wait a bit for connection
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`\nRedis status: ${redis.status}`);
  
  // Test PING
  const pong = await redis.ping();
  console.log(`PING response: ${pong}`);
  
  // Test SET
  console.log('\nTesting SET...');
  const setResult = await redis.set('test-key', 'test-value', 'EX', 60);
  console.log(`SET result: ${setResult}`);
  
  // Test GET
  console.log('\nTesting GET...');
  const getValue = await redis.get('test-key');
  console.log(`GET result: ${getValue}`);
  
  // Check all keys
  console.log('\nAll keys:');
  const keys = await redis.keys('*');
  console.log(keys);
  
  // Cleanup
  await redis.del('test-key');
  await redis.quit();
  
  console.log('\n✅ Test complete!');
  process.exit(0); // Explicit exit
}

testRedis().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
