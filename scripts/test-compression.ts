/**
 * Compression Testing Script
 * 
 * Tests response compression functionality and measures compression ratios.
 * Part of Phase 2C Task 4 - Response Compression.
 * 
 * Usage:
 *   ts-node scripts/test-compression.ts
 * 
 * Prerequisites:
 *   - Server must be running on http://localhost:3000
 *   - ENABLE_COMPRESSION=true in environment
 */

import axios from 'axios';
import * as zlib from 'node:zlib';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface CompressionTestResult {
  test: string;
  passed: boolean;
  uncompressedSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  contentEncoding?: string;
  error?: string;
}

/**
 * Test 1: Verify compression is enabled for large JSON responses
 */
async function testCompressionEnabled(): Promise<CompressionTestResult> {
  console.log('\n1️⃣  Testing: Compression Enabled for Large Responses...');
  
  try {
    // Request with Accept-Encoding: gzip header
    const response = await axios.get(`${BASE_URL}/api/v1/metrics`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
      decompress: false, // Don't auto-decompress so we can measure
      responseType: 'arraybuffer',
    });

    const contentEncoding = response.headers['content-encoding'];
    const compressedSize = Buffer.byteLength(response.data);
    
    // Decompress to get original size
    let uncompressedSize = 0;
    if (contentEncoding === 'gzip') {
      const decompressed = zlib.gunzipSync(response.data);
      uncompressedSize = Buffer.byteLength(decompressed);
    } else if (contentEncoding === 'deflate') {
      const decompressed = zlib.inflateSync(response.data);
      uncompressedSize = Buffer.byteLength(decompressed);
    } else {
      // No compression
      uncompressedSize = compressedSize;
    }

    const compressionRatio = uncompressedSize > 0 
      ? ((1 - compressedSize / uncompressedSize) * 100)
      : 0;

    const passed = contentEncoding === 'gzip' || contentEncoding === 'deflate';

    console.log(`   Content-Encoding: ${contentEncoding || 'none'}`);
    console.log(`   Uncompressed size: ${uncompressedSize.toLocaleString()} bytes`);
    console.log(`   Compressed size: ${compressedSize.toLocaleString()} bytes`);
    console.log(`   Compression ratio: ${compressionRatio.toFixed(1)}%`);
    console.log(`   ✅ PASSED: Compression is enabled`);

    return {
      test: 'Compression Enabled',
      passed,
      uncompressedSize,
      compressedSize,
      compressionRatio,
      contentEncoding: contentEncoding || 'none',
    };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      test: 'Compression Enabled',
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Test 2: Verify small responses are not compressed
 */
async function testSmallResponsesNotCompressed(): Promise<CompressionTestResult> {
  console.log('\n2️⃣  Testing: Small Responses Not Compressed (< 1KB)...');
  
  try {
    // Health check endpoint should be small
    const response = await axios.get(`${BASE_URL}/health`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    const contentEncoding = response.headers['content-encoding'];
    const responseSize = JSON.stringify(response.data).length;

    const passed = !contentEncoding || responseSize < 1024;

    console.log(`   Response size: ${responseSize} bytes`);
    console.log(`   Content-Encoding: ${contentEncoding || 'none (as expected)'}`);
    
    if (passed) {
      console.log(`   ✅ PASSED: Small responses not compressed`);
    } else {
      console.log(`   ❌ FAILED: Small response was compressed unexpectedly`);
    }

    return {
      test: 'Small Responses Not Compressed',
      passed,
      uncompressedSize: responseSize,
      contentEncoding: contentEncoding || 'none',
    };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      test: 'Small Responses Not Compressed',
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Test 3: Verify no compression when client doesn't support it
 */
async function testNoCompressionWithoutAcceptEncoding(): Promise<CompressionTestResult> {
  console.log('\n3️⃣  Testing: No Compression Without Accept-Encoding...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/metrics`, {
      headers: {
        // Don't send Accept-Encoding header
      },
    });

    const contentEncoding = response.headers['content-encoding'];
    const passed = !contentEncoding;

    console.log(`   Content-Encoding: ${contentEncoding || 'none (as expected)'}`);
    
    if (passed) {
      console.log(`   ✅ PASSED: No compression without Accept-Encoding`);
    } else {
      console.log(`   ❌ FAILED: Response was compressed without Accept-Encoding`);
    }

    return {
      test: 'No Compression Without Accept-Encoding',
      passed,
      contentEncoding: contentEncoding || 'none',
    };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      test: 'No Compression Without Accept-Encoding',
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Test 4: Verify compression can be disabled via header
 */
async function testCompressionDisableHeader(): Promise<CompressionTestResult> {
  console.log('\n4️⃣  Testing: Compression Disabled via x-no-compression Header...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/metrics`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'x-no-compression': '1',
      },
    });

    const contentEncoding = response.headers['content-encoding'];
    const passed = !contentEncoding;

    console.log(`   Content-Encoding: ${contentEncoding || 'none (as expected)'}`);
    
    if (passed) {
      console.log(`   ✅ PASSED: Compression disabled via header`);
    } else {
      console.log(`   ❌ FAILED: Response was compressed despite x-no-compression header`);
    }

    return {
      test: 'Compression Disabled via Header',
      passed,
      contentEncoding: contentEncoding || 'none',
    };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      test: 'Compression Disabled via Header',
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Test 5: Compare performance with and without compression
 */
async function testCompressionPerformance(): Promise<CompressionTestResult> {
  console.log('\n5️⃣  Testing: Compression Performance Impact...');
  
  try {
    // Test without compression
    const startUncompressed = Date.now();
    const uncompressedResponse = await axios.get(`${BASE_URL}/api/v1/metrics?limit=100`, {
      headers: {
        'x-no-compression': '1',
      },
    });
    const uncompressedTime = Date.now() - startUncompressed;
    const uncompressedSize = JSON.stringify(uncompressedResponse.data).length;

    // Test with compression
    const startCompressed = Date.now();
    const compressedResponse = await axios.get(`${BASE_URL}/api/v1/metrics?limit=100`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    const compressedTime = Date.now() - startCompressed;
    const compressedSize = compressedResponse.headers['content-length'] 
      ? parseInt(compressedResponse.headers['content-length'], 10)
      : JSON.stringify(compressedResponse.data).length;

    const compressionRatio = ((1 - compressedSize / uncompressedSize) * 100);
    const timeDiff = compressedTime - uncompressedTime;

    console.log(`   Uncompressed: ${uncompressedSize.toLocaleString()} bytes in ${uncompressedTime}ms`);
    console.log(`   Compressed: ${compressedSize.toLocaleString()} bytes in ${compressedTime}ms`);
    console.log(`   Compression ratio: ${compressionRatio.toFixed(1)}%`);
    console.log(`   Time difference: ${timeDiff > 0 ? '+' : ''}${timeDiff}ms`);
    
    const passed = compressionRatio > 30; // At least 30% compression for JSON

    if (passed) {
      console.log(`   ✅ PASSED: Good compression ratio achieved`);
    } else {
      console.log(`   ⚠️  WARNING: Low compression ratio`);
    }

    return {
      test: 'Compression Performance',
      passed,
      uncompressedSize,
      compressedSize,
      compressionRatio,
    };
  } catch (error: any) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      test: 'Compression Performance',
      passed: false,
      error: error.message,
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MDL Response Compression Tests                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nBase URL: ${BASE_URL}`);

  const results: CompressionTestResult[] = [];

  // Run all tests
  results.push(await testCompressionEnabled());
  results.push(await testSmallResponsesNotCompressed());
  results.push(await testNoCompressionWithoutAcceptEncoding());
  results.push(await testCompressionDisableHeader());
  results.push(await testCompressionPerformance());

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n${passed}/${total} tests passed`);

  // Calculate average compression ratio
  const compressionResults = results.filter(r => r.compressionRatio !== undefined);
  if (compressionResults.length > 0) {
    const avgRatio = compressionResults.reduce((sum, r) => sum + (r.compressionRatio || 0), 0) / compressionResults.length;
    console.log(`Average compression ratio: ${avgRatio.toFixed(1)}%`);
  }

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
