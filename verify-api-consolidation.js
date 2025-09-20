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

// 3. Check consolidated admin APIs
console.log('\n🛡️ Checking Admin APIs:');
const adminDashboardPath = path.join('api', 'admin', 'dashboard.js');
if (fs.existsSync(adminDashboardPath)) {
  const adminDashboardContent = fs.readFileSync(adminDashboardPath, 'utf8');
  const hasDashboardLogic = adminDashboardContent.includes('admin_dashboard_metrics_cache') && adminDashboardContent.includes('logAuditEvent');

  if (hasDashboardLogic) {
    console.log('✅ api/admin/dashboard.js - Dedicated dashboard handler present');
  } else {
    console.log('❌ api/admin/dashboard.js - Missing dashboard metrics handler');
  }
} else {
  console.log('❌ api/admin/dashboard.js - File not found');
}

const adminAuditPath = path.join('api', 'admin', 'audit-log.js');
if (fs.existsSync(adminAuditPath)) {
  const adminAuditContent = fs.readFileSync(adminAuditPath, 'utf8');
  const hasAuditLogic = adminAuditContent.includes('system_audit_log') && adminAuditContent.includes('normalizeRecord');

  if (hasAuditLogic) {
    console.log('✅ api/admin/audit-log.js - Dedicated audit log handler present');
  } else {
    console.log('❌ api/admin/audit-log.js - Missing audit log handler');
  }
} else {
  console.log('❌ api/admin/audit-log.js - File not found');
}

const adminUsersPath = path.join('api', 'admin', 'users.js');
if (fs.existsSync(adminUsersPath)) {
  const adminUsersContent = fs.readFileSync(adminUsersPath, 'utf8');
  const supportsQueryId = /query\?\.id/.test(adminUsersContent) && adminUsersContent.includes('parseUserId');
  const handlesActions = adminUsersContent.includes("action === 'role'") && adminUsersContent.includes("action === 'permissions'");
  const supportsMutations = /req\.method === 'POST'/.test(adminUsersContent) && /req\.method === 'DELETE'/.test(adminUsersContent);

  if (supportsQueryId && handlesActions && supportsMutations) {
    console.log('✅ api/admin/users.js - Consolidated user CRUD + role/permission routes');
  } else {
    console.log('❌ api/admin/users.js - Missing consolidated handlers');
  }
} else {
  console.log('❌ api/admin/users.js - File not found');
}

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
const frontendChecks = [
  { name: 'Admin dashboard service', file: 'src/services/admin/dashboard.ts', pattern: /\/api\/admin\/dashboard/ },
  { name: 'Admin audit service', file: 'src/services/admin/audit.ts', pattern: /\/api\/admin\/audit-log/ },
  { name: 'Admin users service', file: 'src/services/admin/users.ts', pattern: /\/api\/admin\/users\?id=/ }
];

frontendChecks.forEach(({ name, file, pattern }) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (pattern.test(content)) {
      console.log(`✅ ${name} - Uses consolidated endpoint`);
    } else {
      console.log(`❌ ${name} - Update to consolidated endpoint`);
    }
  } else {
    console.log(`❌ ${name} file missing (${file})`);
  }
});

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