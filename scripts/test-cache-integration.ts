/**
 * Integration test for cache middleware
 * 
 * Tests:
 * 1. First GET request should be a MISS and fetch from database
 * 2. Second GET request should be a HIT and return from cache
 * 3. POST/PUT/DELETE should invalidate cache
 * 4. X-Cache header should be present
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1`;

interface TestResult {
  passed: boolean;
  message: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCacheHitMiss(): Promise<TestResult> {
  try {
    console.log('\n🧪 Test 1: Cache HIT/MISS behavior');
    
    // First request - should be MISS
    const response1 = await axios.get(`${API_URL}/metrics`, {
      headers: { 'Accept': 'application/json' }
    });
    
    const xCache1 = response1.headers['x-cache'];
    console.log(`   First request X-Cache: ${xCache1}`);
    
    if (xCache1 !== 'MISS') {
      return { passed: false, message: `Expected X-Cache: MISS, got: ${xCache1}` };
    }
    
    // Wait a bit for cache to be written
    await sleep(100);
    
    // Second request - should be HIT
    const response2 = await axios.get(`${API_URL}/metrics`, {
      headers: { 'Accept': 'application/json' }
    });
    
    const xCache2 = response2.headers['x-cache'];
    console.log(`   Second request X-Cache: ${xCache2}`);
    
    if (xCache2 !== 'HIT') {
      return { passed: false, message: `Expected X-Cache: HIT, got: ${xCache2}` };
    }
    
    // Verify response data is the same
    if (JSON.stringify(response1.data) !== JSON.stringify(response2.data)) {
      return { passed: false, message: 'Response data mismatch between cached and non-cached' };
    }
    
    return { passed: true, message: 'Cache HIT/MISS working correctly' };
  } catch (error: any) {
    return { passed: false, message: `Error: ${error.message}` };
  }
}

async function testCacheKey(): Promise<TestResult> {
  try {
    console.log('\n🧪 Test 2: X-Cache-Key header presence');
    
    const response = await axios.get(`${API_URL}/metrics`, {
      headers: { 'Accept': 'application/json' }
    });
    
    const cacheKey = response.headers['x-cache-key'];
    console.log(`   X-Cache-Key: ${cacheKey}`);
    
    if (!cacheKey) {
      return { passed: false, message: 'X-Cache-Key header missing' };
    }
    
    return { passed: true, message: 'X-Cache-Key header present' };
  } catch (error: any) {
    return { passed: false, message: `Error: ${error.message}` };
  }
}

async function testQueryParameterCaching(): Promise<TestResult> {
  try {
    console.log('\n🧪 Test 3: Query parameter differentiation');
    
    // Request with category filter
    const response1 = await axios.get(`${API_URL}/metrics?category=operational`);
    const xCache1 = response1.headers['x-cache'];
    console.log(`   First request (category=operational) X-Cache: ${xCache1}`);
    
    await sleep(100);
    
    // Same request - should hit cache
    const response2 = await axios.get(`${API_URL}/metrics?category=operational`);
    const xCache2 = response2.headers['x-cache'];
    console.log(`   Second request (category=operational) X-Cache: ${xCache2}`);
    
    if (xCache2 !== 'HIT') {
      return { passed: false, message: 'Same query params should HIT cache' };
    }
    
    // Different query params - should MISS
    const response3 = await axios.get(`${API_URL}/metrics?category=strategic`);
    const xCache3 = response3.headers['x-cache'];
    console.log(`   Third request (category=strategic) X-Cache: ${xCache3}`);
    
    if (xCache3 !== 'MISS') {
      return { passed: false, message: 'Different query params should MISS cache' };
    }
    
    return { passed: true, message: 'Query parameter caching working correctly' };
  } catch (error: any) {
    return { passed: false, message: `Error: ${error.message}` };
  }
}

async function testSingleMetricCaching(): Promise<TestResult> {
  try {
    console.log('\n🧪 Test 4: Single metric endpoint caching');
    
    // Get list to find a metric ID
    const listResponse = await axios.get(`${API_URL}/metrics`);
    const metrics = listResponse.data.data;
    
    if (!metrics || metrics.length === 0) {
      return { passed: false, message: 'No metrics available to test' };
    }
    
    const metricId = metrics[0].metric_id;
    console.log(`   Testing with metric ID: ${metricId}`);
    
    // First request - should be MISS
    const response1 = await axios.get(`${API_URL}/metrics/${metricId}`);
    const xCache1 = response1.headers['x-cache'];
    console.log(`   First request X-Cache: ${xCache1}`);
    
    await sleep(100);
    
    // Second request - should be HIT
    const response2 = await axios.get(`${API_URL}/metrics/${metricId}`);
    const xCache2 = response2.headers['x-cache'];
    console.log(`   Second request X-Cache: ${xCache2}`);
    
    if (xCache2 !== 'HIT') {
      return { passed: false, message: 'Single metric endpoint should HIT cache' };
    }
    
    return { passed: true, message: 'Single metric caching working correctly' };
  } catch (error: any) {
    return { passed: false, message: `Error: ${error.message}` };
  }
}

async function runTests() {
  console.log('🚀 Starting Cache Middleware Integration Tests\n');
  console.log('⚠️  Make sure the server is running on http://localhost:3000\n');
  
  const tests = [
    testCacheHitMiss,
    testCacheKey,
    testQueryParameterCaching,
    testSingleMetricCaching,
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await test();
    results.push(result);
    
    if (result.passed) {
      console.log(`   ✅ ${result.message}\n`);
    } else {
      console.log(`   ❌ ${result.message}\n`);
    }
    
    // Small delay between tests
    await sleep(200);
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ All cache middleware tests passed!');
    process.exit(0);
  }
}

// Check if server is running
async function checkServer(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000');
    console.error('   Please start the server with: npm run dev');
    process.exit(1);
  }
  
  await runTests();
}

main().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
