#!/bin/bash

# Quick Performance Test Script
# 
# Runs a shortened version of the steady-state test for quick validation.
# Use this for CI/CD pipelines or quick performance checks.
#
# Usage:
#   ./tests/performance/quick-test.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MDL Quick Performance Test                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Auth: $([ -n "$AUTH_TOKEN" ] && echo "Enabled" || echo "Disabled")"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   https://k6.io/docs/getting-started/installation/"
    echo "  Windows: choco install k6"
    exit 1
fi

# Check if server is running
echo "Checking server health..."
if ! curl -f -s "$BASE_URL/health" > /dev/null; then
    echo "❌ Server is not responding at $BASE_URL"
    echo ""
    echo "Start the server with:"
    echo "  npm run dev"
    exit 1
fi

echo "✅ Server is healthy"
echo ""

# Run quick performance test
echo "Running quick performance test..."
echo "Profile: Ramp to 50 users, hold 5 min, ramp down"
echo ""

k6 run --quiet - <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const responseDuration = new Trend('response_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'errors': ['rate<0.01'],
    'cache_hits': ['rate>0.70'],
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

  sleep(1 + Math.random());
}
EOF

TEST_EXIT_CODE=$?

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Test Results                                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Performance test PASSED"
    echo ""
    echo "All thresholds met:"
    echo "  • p95 response time < 200ms"
    echo "  • p99 response time < 500ms"
    echo "  • Error rate < 1%"
    echo "  • Cache hit rate > 70%"
else
    echo "❌ Performance test FAILED"
    echo ""
    echo "Some thresholds were exceeded. Review the output above."
    echo ""
    echo "Next steps:"
    echo "  1. Check server logs for errors"
    echo "  2. Review performance monitoring: $BASE_URL/api/performance/stats"
    echo "  3. Run full test suite for detailed analysis"
fi

echo ""
exit $TEST_EXIT_CODE
