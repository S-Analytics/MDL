/**
 * K6 Load Test - Steady State Scenario
 * 
 * Tests the system's ability to handle a consistent load over an extended period.
 * This test simulates normal production traffic patterns.
 * 
 * Test Profile:
 * - Ramp up to 100 concurrent users over 5 minutes
 * - Maintain 100 concurrent users for 30 minutes
 * - Ramp down to 0 over 5 minutes
 * 
 * Success Criteria:
 * - p95 response time < 200ms
 * - p99 response time < 500ms
 * - Error rate < 1%
 * - Cache hit rate > 80%
 * 
 * Usage:
 *   k6 run tests/performance/steady-state.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const cacheMissRate = new Rate('cache_misses');
const metricListDuration = new Trend('metric_list_duration');
const metricGetDuration = new Trend('metric_get_duration');
const requestCounter = new Counter('total_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '30m', target: 100 },  // Stay at 100 users for 30 minutes
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'errors': ['rate<0.01'],
    'cache_hits': ['rate>0.80'],
    'http_req_failed': ['rate<0.01'],
  },
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

/**
 * Test scenario - simulates real user behavior
 */
export default function () {
  // Scenario 1: List metrics with pagination (most common operation)
  const listResponse = http.get(
    `${BASE_URL}/api/v1/metrics?page=1&limit=50`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
    }
  );

  requestCounter.add(1);

  // Check response
  const listSuccess = check(listResponse, {
    'list status is 200': (r) => r.status === 200,
    'list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'list response time OK': (r) => r.timings.duration < 500,
  });

  if (!listSuccess) {
    errorRate.add(1);
  }

  // Track cache performance
  const cacheStatus = listResponse.headers['X-Cache'];
  if (cacheStatus === 'HIT') {
    cacheHitRate.add(1);
    cacheMissRate.add(0);
  } else if (cacheStatus === 'MISS') {
    cacheHitRate.add(0);
    cacheMissRate.add(1);
  }

  // Track metric list duration
  metricListDuration.add(listResponse.timings.duration);

  // Think time - user reviews the list
  sleep(1 + Math.random() * 2); // 1-3 seconds

  // Scenario 2: Get specific metric (conditional - 30% of requests)
  if (Math.random() < 0.3) {
    // Try to extract a metric ID from the list
    let metricId = 'revenue';
    try {
      const listBody = JSON.parse(listResponse.body);
      if (listBody.data && listBody.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * listBody.data.length);
        metricId = listBody.data[randomIndex].metric_id;
      }
    } catch {
      // Use default if parsing fails
    }

    const getResponse = http.get(
      `${BASE_URL}/api/v1/metrics/${metricId}`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        },
      }
    );

    requestCounter.add(1);

    const getSuccess = check(getResponse, {
      'get status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'get has valid response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (!getSuccess) {
      errorRate.add(1);
    }

    // Track get metric duration
    metricGetDuration.add(getResponse.timings.duration);

    // Think time
    sleep(2 + Math.random() * 3); // 2-5 seconds
  }

  // Scenario 3: Filter metrics (conditional - 20% of requests)
  if (Math.random() < 0.2) {
    const categories = ['Financial', 'Operational', 'Customer', 'Product'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const filterResponse = http.get(
      `${BASE_URL}/api/v1/metrics?category=${category}&page=1&limit=20`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        },
      }
    );

    requestCounter.add(1);

    check(filterResponse, {
      'filter status is 200': (r) => r.status === 200,
    });

    sleep(1 + Math.random()); // 1-2 seconds
  }

  // Base sleep between iterations
  sleep(1);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log('Starting steady-state load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
  
  // Verify server is accessible
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Server health check failed: ${response.status}`);
  }
  
  return { startTime: new Date().toISOString() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log('Steady-state load test completed');
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
