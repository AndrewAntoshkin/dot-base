#!/usr/bin/env node

/**
 * Generate random secret for NEXTAUTH_SECRET
 * Usage: node scripts/generate-secret.js
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('base64');

console.log('='.repeat(60));
console.log('Generated NEXTAUTH_SECRET:');
console.log('='.repeat(60));
console.log(secret);
console.log('='.repeat(60));
console.log('\nAdd this to your .env.local:');
console.log(`NEXTAUTH_SECRET=${secret}`);
console.log('='.repeat(60));










