/**
 * K6 Load Test - Stress Test Scenario
 * 
 * Tests the system's breaking point and behavior under extreme load.
 * Gradually increases load until the system shows signs of stress.
 * 
 * Test Profile:
 * - Start with 100 users
 * - Gradually increase to 1500 users over 20 minutes
 * - Hold at 1500 for 5 minutes
 * - Ramp down to 0
 * 
 * Usage:
 *   k6 run tests/performance/stress-test.js
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const successRate = new Rate('success');
const responseDuration = new Trend('response_duration');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Baseline
    { duration: '5m', target: 500 },   // Ramp to 500
    { duration: '5m', target: 1000 },  // Ramp to 1000
    { duration: '5m', target: 1200 },  // Push to 1200
    { duration: '3m', target: 1500 },  // Push to 1500
    { duration: '5m', target: 1500 },  // Hold at peak
    { duration: '3m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'errors': ['rate<0.10'], // Allow up to 10% errors under stress
    'http_req_failed': ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const endpoints = [
    `${BASE_URL}/api/v1/metrics?page=1&limit=50`,
    `${BASE_URL}/api/v1/metrics?page=2&limit=50`,
    `${BASE_URL}/api/v1/metrics?category=Financial`,
    `${BASE_URL}/health`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const response = http.get(
    endpoint,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
      timeout: '30s', // Longer timeout for stress test
    }
  );

  const success = check(response, {
    'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
    'response time acceptable': (r) => r.timings.duration < 3000,
  });

  if (success) {
    successRate.add(1);
    errorRate.add(0);
  } else {
    successRate.add(0);
    errorRate.add(1);
    failedRequests.add(1);
  }

  responseDuration.add(response.timings.duration);

  sleep(0.3 + Math.random() * 0.5); // Short sleep for stress test
}

export function setup() {
  console.log('Starting stress test - finding breaking point...');
  console.log('WARNING: This test will push the system to its limits');
  return { startTime: new Date() };
}

export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000 / 60;
  console.log(`Stress test completed in ${duration.toFixed(1)} minutes`);
  console.log('Check metrics for system breaking point');
}
