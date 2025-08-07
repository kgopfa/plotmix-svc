#!/usr/bin/env node

/**
 * Generate a secure internal API key
 * Run with: node scripts/generate-api-key.js
 */

const crypto = require('crypto');

function generateSecureApiKey(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function main() {
  console.log('🔑 Generating secure internal API key...\n');
  
  const apiKey = generateSecureApiKey(64); // 128 character hex string
  
  console.log('Generated API Key:');
  console.log(`INTERNAL_API_KEY=${apiKey}\n`);
  
  console.log('📝 Add this to your .env file:');
  console.log(`INTERNAL_API_KEY=${apiKey}\n`);
  
  console.log('⚠️  Security Notes:');
  console.log('- Keep this key secure and never commit it to version control');
  console.log('- Use different keys for development, staging, and production');
  console.log('- Rotate keys regularly in production environments');
  console.log('- The key should be at least 32 characters long (this one is 128)');
}

if (require.main === module) {
  main();
}
