#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Setting up MCP for Supabase...');

try {
  console.log('Installing MCP SDK...');
  execSync('npm install @modelcontextprotocol/sdk @supabase/supabase-js', { stdio: 'inherit' });
  
  // Create schema info function in Supabase
  console.log('Creating schema info function...');
  const schemaSQL = `
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  data_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    c.column_name::TEXT,
    c.data_type::TEXT
  FROM information_schema.tables t
  JOIN information_schema.columns c ON t.table_name = c.table_name
  WHERE t.table_schema = 'public'
  ORDER BY t.table_name, c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  fs.writeFileSync('schema-setup.sql', schemaSQL);
  console.log('Created schema-setup.sql - run this in Supabase SQL editor');
  
  // Update .env with MCP settings
  const envPath = '.env';
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('MCP_ENABLED')) {
      envContent += '\n# MCP Configuration\nMCP_ENABLED=true\n';
      fs.writeFileSync(envPath, envContent);
    }
  }
  
  console.log('✅ MCP setup complete!');
  console.log('Next steps:');
  console.log('1. Run schema-setup.sql in Supabase');
  console.log('2. Update mcp.json with your Supabase credentials');
  console.log('3. Test with: node mcp-server.js');
  
} catch (error) {
  console.error('Setup failed:', error.message);
}