#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('SUPABASE_URL environment variable is required')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const server = new Server(
  {
    name: 'mihas-supabase-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_applications',
        description: 'Get applications with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status' },
            program: { type: 'string', description: 'Filter by program' },
            limit: { type: 'number', description: 'Limit results' }
          }
        },
      },
      {
        name: 'get_stats',
        description: 'Get application statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_profile',
        description: 'Get user profile information',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID' }
          },
          required: ['user_id']
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_applications':
      try {
        let query = supabase.from('applications_new').select('*');
        
        if (args.status) query = query.eq('status', args.status);
        if (args.program) query = query.eq('program', args.program);
        if (args.limit) query = query.limit(args.limit);
        
        const { data, error } = await query;
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }

    case 'get_stats':
      try {
        const { data: applications } = await supabase
          .from('applications_new')
          .select('status, program, created_at');
        
        const stats = {
          total: applications?.length || 0,
          by_status: {},
          by_program: {},
        };
        
        applications?.forEach(app => {
          stats.by_status[app.status] = (stats.by_status[app.status] || 0) + 1;
          stats.by_program[app.program] = (stats.by_program[app.program] || 0) + 1;
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }

    case 'get_user_profile':
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', args.user_id)
          .single();
        
        if (error) throw error;
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('applications_new').select('count').limit(1);
    if (error) {
      console.error('Supabase connection failed:', error.message);
    } else {
      console.error('Supabase connection successful');
    }
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MIHAS Supabase MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}