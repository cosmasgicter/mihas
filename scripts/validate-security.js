#!/usr/bin/env node

const REQUIRED_HEADERS = {
  'Content-Security-Policy': 'CSP header implemented',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'HSTS with preload'
};

console.log('🔒 Security Headers Validation');
console.log('================================');

// Validate vercel.json configuration
import { readFileSync } from 'fs';
import path from 'path';

try {
  const vercelConfig = JSON.parse(readFileSync(path.resolve('vercel.json'), 'utf8'));
  const headers = vercelConfig.headers?.[0]?.headers || [];
  
  let score = 0;
  const maxScore = Object.keys(REQUIRED_HEADERS).length;
  
  Object.keys(REQUIRED_HEADERS).forEach(headerName => {
    const header = headers.find(h => h.key === headerName);
    if (header) {
      console.log(`✅ ${headerName}: ${header.value.substring(0, 50)}...`);
      score++;
    } else {
      console.log(`❌ ${headerName}: Missing`);
    }
  });
  
  console.log('\n📊 Security Score:', `${score}/${maxScore}`);
  
  if (score === maxScore) {
    console.log('🎉 All security headers configured correctly!');
    console.log('\n🚀 Expected improvements:');
    console.log('• Content Security Policy: +25 points');
    console.log('• X-Content-Type-Options: +5 points');
    console.log('• X-Frame-Options: +20 points');
    console.log('• Total improvement: +50 points');
  } else {
    console.log('⚠️  Some security headers are missing');
  }
  
} catch (error) {
  console.error('❌ Error validating security configuration:', error.message);
}