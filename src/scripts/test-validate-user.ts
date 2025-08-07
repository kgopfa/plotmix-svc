#!/usr/bin/env ts-node

/**
 * Test script for the validate-user endpoint
 * Run with: pnpm ts-node src/scripts/test-validate-user.ts
 */

import { config } from '../config';

const API_BASE_URL = process.env['API_BASE_URL'] || 'http://localhost:8000';
const INTERNAL_API_KEY = config.internal.apiKey;

interface ValidateUserResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

async function testValidateUser(userId: string, expectedStatus: number, description: string): Promise<void> {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   URL: ${API_BASE_URL}/api/auth/validate-user/${userId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/validate-user/${userId}`, {
      method: 'GET',
      headers: {
        'X-Internal-Key': INTERNAL_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as ValidateUserResponse;
    
    console.log(`   Status: ${response.status} (expected: ${expectedStatus})`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === expectedStatus) {
      console.log(`   ✅ PASS`);
    } else {
      console.log(`   ❌ FAIL - Expected status ${expectedStatus}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testWithoutApiKey(userId: string): Promise<void> {
  console.log(`\n🧪 Testing: Request without API key`);
  console.log(`   URL: ${API_BASE_URL}/api/auth/validate-user/${userId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/validate-user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log(`   Status: ${response.status} (expected: 401)`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log(`   ✅ PASS - Properly rejected without API key`);
    } else {
      console.log(`   ❌ FAIL - Should have been rejected without API key`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Testing validate-user endpoint');
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   Internal API Key: ${INTERNAL_API_KEY ? '***configured***' : '***NOT CONFIGURED***'}`);
  
  if (!INTERNAL_API_KEY || INTERNAL_API_KEY === 'fallback-internal-api-key') {
    console.log('\n⚠️  WARNING: INTERNAL_API_KEY not properly configured!');
    console.log('   Please set INTERNAL_API_KEY in your .env file');
    return;
  }

  // Test with a valid user ID (you'll need to replace with an actual user ID from your database)
  await testValidateUser('valid-user-id-here', 200, 'Valid user validation');
  
  // Test with an invalid user ID
  await testValidateUser('invalid-user-id-12345', 404, 'Invalid user validation');
  
  // Test without API key
  await testWithoutApiKey('valid-user-id-here');
  
  // Test with empty user ID
  await testValidateUser('', 400, 'Empty user ID validation');
  
  console.log('\n✨ Test completed!');
}

if (require.main === module) {
  main().catch(console.error);
}
