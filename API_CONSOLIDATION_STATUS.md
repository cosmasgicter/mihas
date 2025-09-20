# API Route Status - Multi-function Layout ✅

## Summary
The API now uses standalone route files for each action so the project deploys cleanly to Netlify (and other providers that package one function per file). All query-parameter handlers have been removed. Authentication, catalog, notifications, and MCP routes each live in their own file under `api/`.

## Current API Structure

### Catalog Service (`api/catalog/*`)
- `/api/catalog/programs` (GET)
- `/api/catalog/intakes` (GET)
- `/api/catalog/subjects` (GET)

### Authentication Service (`api/auth/*`)
- `/api/auth/login` (POST)
- `/api/auth/signin` (POST)
- `/api/auth/register` (POST)

### Notification Service (`api/notifications/*`)
- `/api/notifications/send` (POST)
- `/api/notifications/application-submitted` (POST)
- `/api/notifications/preferences` (POST)
- `/api/notifications/update-consent` (POST)

### Applications & Admin
- `/api/applications` (GET, POST)
- `/api/applications/bulk` (POST)
- `/api/applications/[id]` (GET, PUT)
- `/api/admin/dashboard` (GET)
- `/api/admin/audit-log` (GET)
- `/api/admin/users` (GET, POST)
- `/api/admin/users/[id]` (GET, PUT, DELETE)
- `/api/admin/users/[id]/role` (GET)
- `/api/admin/users/[id]/permissions` (GET, PUT)

### Analytics & Documents
- `/api/analytics/metrics` (GET)
- `/api/analytics/predictive-dashboard` (GET)
- `/api/analytics/telemetry` (GET, POST)
- `/api/documents/upload` (POST)
- `/api/user-consents` (GET, POST)
- `/api/test` (GET)

### MCP API
- `/api/mcp/query` (POST)
- `/api/mcp/schema` (GET)
- `/api/mcp/schema?table={tableName}` (GET)

## Supabase Integration
- Supabase service role key is used directly inside the new MCP handlers.
- The `mcp-operations` edge function is no longer required for application features.

## Frontend Integration Status ✅

Key services reference the dedicated routes:

```typescript
// src/services/auth.ts
apiClient.request('/api/auth/login', { method: 'POST', body: ... })
apiClient.request('/api/auth/register', { method: 'POST', body: ... })
apiClient.request('/api/auth/signin', { method: 'POST', body: ... })

// src/services/mcpService.ts
MCPService.query('/api/mcp/query')
MCPService.getSchema('/api/mcp/schema')
MCPService.getTableInfo('/api/mcp/schema?table=applications')
```

## Verification

Run the health check script to confirm the layout:

```bash
npm run verify:api-layout
```

It ensures:
- Required `api/` files exist
- Consolidated files are removed
- Tests and docs do not use query-parameter routes
- MCP service points to `/api/mcp/*`

## Deployment Notes
- Update smoke tests to call `/api/auth/login`, `/api/catalog/programs`, etc.
- Netlify deploys each `api/**` file individually with no custom rewrites.
- Supabase Edge Functions are optional; the API routes cover MCP access directly.

**Status**: ✅ COMPLETE – Multi-function API layout verified
**Last Updated**: 2025-09-19
