#!/bin/bash
# Authentication System Test Suite
# Tests all authentication endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_USER="admin"
ADMIN_PASS="Admin123!"
TEST_USER="testuser_$$"
TEST_EMAIL="test$$@example.com"
TEST_PASS="TestPass123!"

echo "🧪 MDL Authentication System Test Suite"
echo "========================================"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local test_name="$1"
    local expected_code="$2"
    local response="$3"
    local actual_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$actual_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} $test_name (HTTP $actual_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name (Expected HTTP $expected_code, got $actual_code)"
        echo "   Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to extract JSON field
extract_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\":\"[^\"]*\"" | cut -d\" -f4 | head -1
}

echo "📝 Test 1: Health Check"
echo "----------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/health")
test_endpoint "Health check endpoint" "200" "$RESPONSE"
echo ""

echo "📝 Test 2: User Registration"
echo "---------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"full_name\":\"Test User\"}")

if test_endpoint "Register new user" "201" "$RESPONSE"; then
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    ACCESS_TOKEN=$(extract_field "$BODY" "access_token")
    REFRESH_TOKEN=$(extract_field "$BODY" "refresh_token")
    echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
    echo "   Refresh Token: ${REFRESH_TOKEN:0:20}..."
fi
echo ""

echo "📝 Test 3: Login with Credentials"
echo "--------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")

if test_endpoint "Login with username/password" "200" "$RESPONSE"; then
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    ACCESS_TOKEN=$(extract_field "$BODY" "access_token")
    REFRESH_TOKEN=$(extract_field "$BODY" "refresh_token")
fi
echo ""

echo "📝 Test 4: Access Protected Endpoint"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
test_endpoint "Get current user info" "200" "$RESPONSE"
echo ""

echo "📝 Test 5: Refresh Access Token"
echo "------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

if test_endpoint "Refresh access token" "200" "$RESPONSE"; then
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    NEW_ACCESS_TOKEN=$(extract_field "$BODY" "access_token")
    NEW_REFRESH_TOKEN=$(extract_field "$BODY" "refresh_token")
    echo "   New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
    ACCESS_TOKEN=$NEW_ACCESS_TOKEN
    REFRESH_TOKEN=$NEW_REFRESH_TOKEN
fi
echo ""

echo "📝 Test 6: Invalid Credentials"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"WrongPassword123!\"}")
test_endpoint "Login with wrong password" "401" "$RESPONSE"
echo ""

echo "📝 Test 7: Access Without Token"
echo "------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/api/auth/me")
test_endpoint "Access protected endpoint without token" "401" "$RESPONSE"
echo ""

echo "📝 Test 8: Validation - Weak Password"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"weakuser\",\"email\":\"weak@example.com\",\"password\":\"weak\",\"full_name\":\"Weak User\"}")
test_endpoint "Register with weak password" "400" "$RESPONSE"
echo ""

echo "📝 Test 9: Validation - Invalid Email"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"badmail\",\"email\":\"not-an-email\",\"password\":\"$TEST_PASS\",\"full_name\":\"Bad Email\"}")
test_endpoint "Register with invalid email" "400" "$RESPONSE"
echo ""

echo "📝 Test 10: Duplicate Username"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"email\":\"different@example.com\",\"password\":\"$TEST_PASS\",\"full_name\":\"Duplicate User\"}")
test_endpoint "Register with duplicate username" "409" "$RESPONSE"
echo ""

echo "📝 Test 11: Create API Key"
echo "-------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Key\",\"description\":\"For testing\",\"scopes\":[\"metrics:read\"]}")

if test_endpoint "Create API key" "201" "$RESPONSE"; then
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    API_KEY=$(extract_field "$BODY" "api_key")
    echo "   API Key: ${API_KEY:0:30}..."
fi
echo ""

echo "📝 Test 12: List API Keys"
echo "-----------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/api/auth/api-keys" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
test_endpoint "List user's API keys" "200" "$RESPONSE"
echo ""

echo "📝 Test 13: Logout"
echo "----------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")
test_endpoint "Logout (revoke refresh token)" "200" "$RESPONSE"
echo ""

echo "📝 Test 14: Use Revoked Refresh Token"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")
test_endpoint "Use revoked refresh token" "401" "$RESPONSE"
echo ""

echo ""
echo "========================================"
echo "📊 Test Results"
echo "========================================"
echo -e "✅ Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Failed: ${RED}$TESTS_FAILED${NC}"
echo "   Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    exit 1
fi
