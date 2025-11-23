/**
 * K6 Load Test - Soak Test Scenario
 * 
 * Tests the system's stability over an extended period.
 * Identifies memory leaks, resource exhaustion, and degradation over time.
 * 
 * Test Profile:
 * - Ramp up to 200 users over 10 minutes
 * - Maintain 200 users for 2 hours
 * - Ramp down to 0 over 10 minutes
 * 
 * Monitor for:
 * - Memory leaks (increasing heap usage)
 * - Performance degradation over time
 * - Connection pool exhaustion
 * - Cache effectiveness
 * 
 * Usage:
 *   k6 run tests/performance/soak-test.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const responseDuration = new Trend('response_duration');

export const options = {
  stages: [
    { duration: '10m', target: 200 },  // Ramp up to 200 users
    { duration: '2h', target: 200 },   // Stay at 200 for 2 hours
    { duration: '10m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'errors': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
    'cache_hits': ['rate>0.75'], // Cache should stay effective
  },
  noConnectionReuse: false,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  // Mix of operations to simulate real usage
  const operations = [
    // List metrics (60% of traffic)
    () => http.get(`${BASE_URL}/api/v1/metrics?page=${Math.ceil(Math.random() * 5)}&limit=50`, getHeaders()),
    
    // Get specific metric (20% of traffic)
    () => http.get(`${BASE_URL}/api/v1/metrics/revenue`, getHeaders()),
    
    // Filter metrics (15% of traffic)
    () => {
      const categories = ['Financial', 'Operational', 'Customer', 'Product'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      return http.get(`${BASE_URL}/api/v1/metrics?category=${category}`, getHeaders());
    },
    
    // Health check (5% of traffic)
    () => http.get(`${BASE_URL}/health`, getHeaders()),
  ];

  // Select operation based on probability
  const rand = Math.random();
  let operation;
  if (rand < 0.6) operation = operations[0];
  else if (rand < 0.8) operation = operations[1];
  else if (rand < 0.95) operation = operations[2];
  else operation = operations[3];

  const response = operation();

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000,
    'has valid body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  // Track cache performance
  if (response.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  }

  responseDuration.add(response.timings.duration);

  // Realistic think time
  sleep(2 + Math.random() * 3); // 2-5 seconds
}

function getHeaders() {
  return {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
    },
  };
}

export function setup() {
  console.log('Starting soak test - 2 hour duration');
  console.log('Monitor memory usage and performance degradation');
  console.log(`Base URL: ${BASE_URL}`);
  
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error('Server health check failed');
  }
  
  return { 
    startTime: new Date(),
    startMemory: null, // Will be populated from server metrics if available
  };
}

export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000 / 60;
  console.log(`Soak test completed after ${duration.toFixed(0)} minutes`);
  console.log('Review logs for memory leaks and performance degradation');
}
