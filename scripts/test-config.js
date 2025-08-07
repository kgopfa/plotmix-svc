#!/usr/bin/env node

/**
 * Test script to verify configuration error handling
 * Run with: node scripts/test-config.js
 */

console.log('🧪 Testing configuration error handling...\n');

// Test 1: Missing JWT_SECRET
console.log('Test 1: Missing JWT_SECRET');
try {
  // Temporarily remove JWT_SECRET
  const originalJwtSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  
  // This should throw an error
  require('../dist/config/index.js');
  console.log('❌ FAIL: Should have thrown error for missing JWT_SECRET');
} catch (error) {
  if (error.message.includes('Missing required environment variable: JWT_SECRET')) {
    console.log('✅ PASS: Properly threw error for missing JWT_SECRET');
  } else {
    console.log('❌ FAIL: Wrong error message:', error.message);
  }
} finally {
  // Restore the environment variable
  if (typeof originalJwtSecret !== 'undefined') {
    process.env.JWT_SECRET = originalJwtSecret;
  }
}

// Test 2: Missing NEXTAUTH_SECRET
console.log('\nTest 2: Missing NEXTAUTH_SECRET');
try {
  // Temporarily remove NEXTAUTH_SECRET
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  
  // This should throw an error
  require('../dist/config/index.js');
  console.log('❌ FAIL: Should have thrown error for missing NEXTAUTH_SECRET');
} catch (error) {
  if (error.message.includes('Missing required environment variable: NEXTAUTH_SECRET')) {
    console.log('✅ PASS: Properly threw error for missing NEXTAUTH_SECRET');
  } else {
    console.log('❌ FAIL: Wrong error message:', error.message);
  }
} finally {
  // Restore the environment variable
  if (typeof originalNextAuthSecret !== 'undefined') {
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
  }
}

// Test 3: Missing INTERNAL_API_KEY
console.log('\nTest 3: Missing INTERNAL_API_KEY');
try {
  // Temporarily remove INTERNAL_API_KEY
  const originalInternalApiKey = process.env.INTERNAL_API_KEY;
  delete process.env.INTERNAL_API_KEY;
  
  // This should throw an error
  require('../dist/config/index.js');
  console.log('❌ FAIL: Should have thrown error for missing INTERNAL_API_KEY');
} catch (error) {
  if (error.message.includes('Missing required environment variable: INTERNAL_API_KEY')) {
    console.log('✅ PASS: Properly threw error for missing INTERNAL_API_KEY');
  } else {
    console.log('❌ FAIL: Wrong error message:', error.message);
  }
} finally {
  // Restore the environment variable
  if (typeof originalInternalApiKey !== 'undefined') {
    process.env.INTERNAL_API_KEY = originalInternalApiKey;
  }
}

// Test 4: All required values present
console.log('\nTest 4: All required values present');
try {
  // Ensure all required values are set
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret';
  process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-api-key';
  
  // This should work
  const config = require('../dist/config/index.js');
  console.log('✅ PASS: Configuration loaded successfully with all required values');
  console.log('   JWT Secret configured:', !!config.config.jwt.secret);
  console.log('   NextAuth Secret configured:', !!config.config.nextAuth.secret);
  console.log('   Internal API Key configured:', !!config.config.internal.apiKey);
} catch (error) {
  console.log('❌ FAIL: Should have loaded successfully:', error.message);
}

console.log('\n✨ Configuration error handling test completed!');
