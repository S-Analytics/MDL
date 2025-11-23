/**
 * K6 Load Test - Spike Test Scenario
 * 
 * Tests the system's ability to handle sudden traffic spikes.
 * This simulates scenarios like marketing campaigns or sudden viral traffic.
 * 
 * Test Profile:
 * - Start with 10 users
 * - Spike to 500 users instantly
 * - Hold for 5 minutes
 * - Drop back to 10 users
 * - Repeat spike to 1000 users
 * - Hold for 3 minutes
 * - Ramp down to 0
 * 
 * Usage:
 *   k6 run tests/performance/spike-test.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const responseDuration = new Trend('response_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '10s', target: 500 },  // Spike to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '10s', target: 10 },   // Drop back
    { duration: '2m', target: 10 },    // Recover
    { duration: '10s', target: 1000 }, // Spike to 1000
    { duration: '3m', target: 1000 },  // Stay at 1000
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // More relaxed during spikes
    'errors': ['rate<0.05'], // Allow up to 5% errors during spike
    'http_req_failed': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const response = http.get(
    `${BASE_URL}/api/v1/metrics?page=1&limit=50`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
    }
  );

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => {
      try {
        return JSON.parse(r.body).data !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  if (response.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  }

  responseDuration.add(response.timings.duration);

  sleep(0.5 + Math.random()); // Shorter sleep during spike test
}

export function setup() {
  console.log('Starting spike test...');
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error('Server health check failed');
  }
  return { startTime: new Date() };
}

export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000;
  console.log(`Spike test completed in ${duration.toFixed(0)} seconds`);
}
