#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const server = new Server({
  name: 'supabase-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    resources: {},
    tools: {}
  }
});

server.setRequestHandler('resources/list', async () => {
  const { data: tables } = await supabase.rpc('get_schema_info');
  return {
    resources: tables?.map(table => ({
      uri: `supabase://table/${table.table_name}`,
      name: table.table_name,
      mimeType: 'application/json'
    })) || []
  };
});

server.setRequestHandler('resources/read', async (request) => {
  const uri = request.params.uri;
  const tableName = uri.replace('supabase://table/', '');
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(100);
    
  if (error) throw new Error(error.message);
  
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2)
    }]
  };
});

const transport = new StdioServerTransport();
server.connect(transport);
console.error('Supabase MCP server running');