#!/usr/bin/env node

import { mcpSupabase } from '../../api/_lib/mcpClient.ts';
import dotenv from 'dotenv';

dotenv.config();

async function testMCPConnection() {
  console.log('Testing MCP Supabase connection...');
  
  try {
    // Test schema query
    console.log('Testing schema query...');
    const schema = await mcpSupabase.getSchema();
    console.log(`✅ Schema query successful - found ${schema?.length || 0} tables`);
    
    // Test table info query
    console.log('Testing table info query...');
    const tableInfo = await mcpSupabase.getTableInfo('applications');
    console.log(`✅ Table info query successful - found ${tableInfo?.length || 0} columns`);
    
    // Test SQL query
    console.log('Testing SQL query...');
    const result = await mcpSupabase.query('SELECT COUNT(*) as total FROM applications');
    console.log(`✅ SQL query successful - found ${result?.[0]?.total || 0} applications`);
    
    return true;
  } catch (error) {
    console.error('❌ MCP test failed:', error.message);
    return false;
  }
}

testMCPConnection().then(success => {
  process.exit(success ? 0 : 1);
});