#!/usr/bin/env ts-node
/**
 * Pagination Testing Script
 * 
 * Tests the pagination implementation for the MDL API.
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const API_URL = `${API_BASE}/api/v1/metrics`;

interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedResponse {
  success: boolean;
  data: unknown[];
  pagination: PaginationMetadata;
}

/**
 * Test pagination with default parameters
 */
async function testDefaultPagination(): Promise<void> {
  console.log('\n🧪 Test 1: Default Pagination (page=1, limit=50)');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(API_URL);
    const data = response.data as PaginatedResponse;

    console.log('✅ Status:', response.status);
    console.log('📊 Pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('📝 Items returned:', data.data.length);
    console.log('🔗 Link header:', response.headers.link || 'None');
    console.log('📌 X-Total-Count:', response.headers['x-total-count']);
    console.log('📌 X-Page:', response.headers['x-page']);
    console.log('📌 X-Per-Page:', response.headers['x-per-page']);
    console.log('📌 X-Total-Pages:', response.headers['x-total-pages']);

    if (data.pagination.page !== 1) {
      console.error('❌ Expected page 1, got', data.pagination.page);
    }
    if (data.pagination.limit !== 50) {
      console.error('❌ Expected limit 50, got', data.pagination.limit);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

/**
 * Test pagination with custom page size
 */
async function testCustomPageSize(): Promise<void> {
  console.log('\n🧪 Test 2: Custom Page Size (page=1, limit=10)');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(`${API_URL}?page=1&limit=10`);
    const data = response.data as PaginatedResponse;

    console.log('✅ Status:', response.status);
    console.log('📊 Pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('📝 Items returned:', data.data.length);
    console.log('🔗 Link header:', response.headers.link || 'None');

    if (data.pagination.limit !== 10) {
      console.error('❌ Expected limit 10, got', data.pagination.limit);
    }
    if (data.data.length > 10) {
      console.error('❌ Returned more than 10 items:', data.data.length);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

/**
 * Test pagination with page 2
 */
async function testSecondPage(): Promise<void> {
  console.log('\n🧪 Test 3: Second Page (page=2, limit=10)');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(`${API_URL}?page=2&limit=10`);
    const data = response.data as PaginatedResponse;

    console.log('✅ Status:', response.status);
    console.log('📊 Pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('📝 Items returned:', data.data.length);
    console.log('🔗 Link header:', response.headers.link || 'None');

    if (data.pagination.page !== 2) {
      console.error('❌ Expected page 2, got', data.pagination.page);
    }
    if (!data.pagination.hasPrev) {
      console.error('❌ Expected hasPrev to be true');
    }

    // Parse Link header
    const linkHeader = response.headers.link;
    if (linkHeader) {
      console.log('\n📎 Link Header Relations:');
      const links = linkHeader.split(', ');
      links.forEach((link: string) => {
        const match = link.match(/<(.+?)>;\s*rel="(.+?)"/);
        if (match) {
          console.log(`  - ${match[2]}: ${match[1]}`);
        }
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

/**
 * Test max limit enforcement
 */
async function testMaxLimit(): Promise<void> {
  console.log('\n🧪 Test 4: Max Limit Enforcement (limit=200, should cap at 100)');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(`${API_URL}?page=1&limit=200`);
    const data = response.data as PaginatedResponse;

    console.log('✅ Status:', response.status);
    console.log('📊 Pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('📝 Items returned:', data.data.length);

    if (data.pagination.limit !== 100) {
      console.error('❌ Expected limit to be capped at 100, got', data.pagination.limit);
    } else {
      console.log('✅ Limit correctly capped at 100');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

/**
 * Test pagination with filters
 */
async function testPaginationWithFilters(): Promise<void> {
  console.log('\n🧪 Test 5: Pagination with Filters (category=operational, limit=5)');
  console.log('=' .repeat(60));

  try {
    const response = await axios.get(`${API_URL}?category=operational&page=1&limit=5`);
    const data = response.data as PaginatedResponse;

    console.log('✅ Status:', response.status);
    console.log('📊 Pagination:', JSON.stringify(data.pagination, null, 2));
    console.log('📝 Items returned:', data.data.length);
    console.log('🔗 Link header:', response.headers.link || 'None');

    // Check that Link header preserves filter params
    const linkHeader = response.headers.link;
    if (linkHeader && !linkHeader.includes('category=operational')) {
      console.error('❌ Link header should preserve category filter');
    } else if (linkHeader) {
      console.log('✅ Link header preserves filter parameters');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed:', error.response?.status, error.response?.data);
    } else {
      console.error('❌ Error:', error);
    }
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('\n🚀 MDL API Pagination Testing');
  console.log('=' .repeat(60));
  console.log('API Base:', API_BASE);
  console.log('API URL:', API_URL);

  try {
    await testDefaultPagination();
    await testCustomPageSize();
    await testSecondPage();
    await testMaxLimit();
    await testPaginationWithFilters();

    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed!');
    console.log('=' .repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
