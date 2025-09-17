# MCP Supabase Configuration

## Overview
Model Context Protocol (MCP) integration for Supabase enables AI assistants to interact directly with your database through a standardized protocol. The MCP client is now server-side only for enhanced security.

## Setup

### 1. Environment Variables
Add the following to your `.env` file:
```env
# Required for MCP server and API endpoints
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Install MCP PostgreSQL Server
```bash
npm run mcp:install
```

### 3. Configure Amazon Q
The `mcp.json` file is ready for Amazon Q to use with your Supabase database.

## Configuration Files

- `mcp.json` - Main MCP configuration
- `api/_lib/mcpClient.ts` - Server-only Supabase MCP client
- `api/mcp/query.js` - Secure API endpoint for MCP queries
- `api/mcp/schema.js` - Secure API endpoint for schema queries
- `scripts/maintenance/mcp-server.js` - MCP server implementation

## API Endpoints

### POST /api/mcp/query
Execute SQL queries (admin access required)
```json
{
  "sql": "SELECT * FROM applications LIMIT 10",
  "params": []
}
```

### GET /api/mcp/schema
Get database schema information (admin access required)
```
/api/mcp/schema - Get all tables
/api/mcp/schema?table=applications - Get specific table info
```

## Usage

The MCP server provides:
- Database schema introspection
- SQL query execution
- Table information retrieval
- Real-time data access

## Security

- **Server-side only**: MCP client never ships to browser
- **Environment variables**: Credentials stored securely
- **Admin authentication**: API endpoints require admin access
- **RLS policies**: Respects existing Supabase security
- **No hardcoded secrets**: All credentials from environment