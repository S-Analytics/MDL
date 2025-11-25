#!/bin/bash

# Test the database connection endpoint
# This tests if the fixed endpoint works correctly

echo "Testing PostgreSQL Connection Endpoint..."
echo "=========================================="
echo ""

# Database configuration from .env
DB_CONFIG='{
  "host": "localhost",
  "port": 5432,
  "database": "mdl_test",
  "user": "postgres",
  "password": ""
}'

echo "Database Config:"
echo "$DB_CONFIG" | jq .
echo ""

# Test the endpoint (assumes server is running on port 3000)
echo "Sending test request to http://localhost:3000/api/database/test..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/database/test \
  -H "Content-Type: application/json" \
  -d "$DB_CONFIG")

echo ""
echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Check if successful
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅ Test PASSED - Connection successful!"
  exit 0
else
  echo "❌ Test FAILED - Connection failed"
  echo "Error: $(echo "$RESPONSE" | jq -r '.error // "Unknown error"')"
  exit 1
fi
