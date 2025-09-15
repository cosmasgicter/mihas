# MCP Supabase Configuration

## Overview
Model Context Protocol (MCP) integration for Supabase enables AI assistants to interact directly with your database through a standardized protocol.

## Setup

### 1. Install MCP PostgreSQL Server
```bash
npm run mcp:install
```

### 2. Get Supabase Connection String
1. Go to your Supabase project settings
2. Navigate to Database → Connection string
3. Copy the PostgreSQL connection string

### 3. Add to Environment
Add to your `.env` file:
```env
POSTGRES_CONNECTION_STRING=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 4. Configure Amazon Q
The `mcp.json` file is ready for Amazon Q to use with your Supabase database.

## Configuration Files

- `mcp.json` - Main MCP configuration
- `src/lib/mcp-supabase.ts` - Supabase MCP client
- `.env.example` - Environment template

## Usage

The MCP server provides:
- Database schema introspection
- SQL query execution
- Table information retrieval
- Real-time data access

## Security

- Uses Supabase RLS policies
- Respects existing authentication
- Maintains data privacy standards