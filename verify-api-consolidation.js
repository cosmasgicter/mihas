#!/usr/bin/env node

/**
 * API Consolidation Verification Script
 * Verifies that all API consolidation changes are properly implemented
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying API Consolidation...\n');

// 1. Check function count
const apiFiles = fs.readdirSync('api', { recursive: true })
  .filter(file => file.endsWith('.js') && !file.includes('_lib'));

console.log(`📊 Function Count: ${apiFiles.length}/12`);
if (apiFiles.length === 12) {
  console.log('✅ Function count is within Vercel Hobby limit\n');
} else {
  console.log('❌ Function count exceeds limit\n');
  process.exit(1);
}

// 2. Check consolidated APIs exist
const consolidatedAPIs = [
  'catalog.js',
  'auth.js', 
  'notifications.js'
];

console.log('🔧 Checking Consolidated APIs:');
consolidatedAPIs.forEach(api => {
  const filePath = path.join('api', api);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for proper query parameter handling
    const hasQueryHandling = content.includes('req.query') && 
      (content.includes('resource') || content.includes('action'));
    
    if (hasQueryHandling) {
      console.log(`✅ ${api} - Properly consolidated`);
    } else {
      console.log(`❌ ${api} - Missing query parameter handling`);
    }
  } else {
    console.log(`❌ ${api} - File not found`);
  }
});

// 3. Check Supabase Edge Function
console.log('\n🌐 Checking Supabase Edge Functions:');
const edgeFunctionPath = 'supabase/functions/mcp-operations/index.ts';
if (fs.existsSync(edgeFunctionPath)) {
  console.log('✅ mcp-operations Edge Function exists');
} else {
  console.log('❌ mcp-operations Edge Function missing');
}

// 4. Check frontend integration
console.log('\n🎨 Checking Frontend Integration:');
const apiClientPath = 'src/services/apiClient.ts';
if (fs.existsSync(apiClientPath)) {
  const content = fs.readFileSync(apiClientPath, 'utf8');
  
  const checks = [
    { name: 'Catalog API', pattern: /\/api\/catalog\?resource=/ },
    { name: 'Auth API', pattern: /\/api\/auth\?action=/ },
    { name: 'Notifications API', pattern: /\/api\/notifications\?action=/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name} - Using consolidated endpoint`);
    } else {
      console.log(`❌ ${check.name} - Not using consolidated endpoint`);
    }
  });
} else {
  console.log('❌ API Client service not found');
}

// 5. Check MCP service
const mcpServicePath = 'src/services/mcpService.ts';
if (fs.existsSync(mcpServicePath)) {
  const content = fs.readFileSync(mcpServicePath, 'utf8');
  if (content.includes('functions/v1/mcp-operations')) {
    console.log('✅ MCP Service - Using Edge Function');
  } else {
    console.log('❌ MCP Service - Not using Edge Function');
  }
} else {
  console.log('❌ MCP Service not found');
}

console.log('\n🎉 API Consolidation Verification Complete!');
console.log('📦 Ready for Vercel deployment with 12 functions');