# API Route Layout Guide

## Summary
The application now uses dedicated serverless functions for each API route to match Netlify's multi-function deployment model. Authentication, catalog, notification, and MCP endpoints have all been restored to clean REST-style paths (`/api/service/action`) so that each behavior maps to its own file in the `api/` directory.

## Service Overview

### Catalog Service (`api/catalog/*`)
- `GET /api/catalog/programs`
- `GET /api/catalog/intakes`
- `GET /api/catalog/subjects`

Each handler lives in its own file (`api/catalog/programs/index.js`, `api/catalog/intakes/index.js`, `api/catalog/subjects.js`). This keeps read operations isolated and makes future POST/PUT support straightforward.

### Authentication Service (`api/auth/*`)
- `POST /api/auth/login`
- `POST /api/auth/signin`
- `POST /api/auth/register`

Each authentication flow has a dedicated function, re-using the shared helpers under `api/_lib`. Rate limiting, logging, and Supabase interactions continue to be handled centrally.

### Notification Service (`api/notifications/*`)
- `POST /api/notifications/send`
- `POST /api/notifications/application-submitted`
- `POST /api/notifications/preferences`
- `POST /api/notifications/update-consent`

Splitting the notification flows removes the need for query-parameter routing and mirrors how Netlify packages functions.

### MCP Service (`api/mcp/*`)
- `POST /api/mcp/query`
- `GET /api/mcp/schema`
- `GET /api/mcp/schema?table={tableName}`

The new MCP endpoints proxy requests to Supabase using the service role key. They enforce admin authentication and emit audit events for traceability.

## Frontend Integration

Update any remaining code to use the dedicated endpoints:

```typescript
// Catalog
fetch('/api/catalog/programs')
fetch('/api/catalog/intakes')
fetch('/api/catalog/subjects')

// Authentication
fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
fetch('/api/auth/signin', { method: 'POST', body: JSON.stringify(credentials) })
fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(registration) })

// Notifications
fetch('/api/notifications/send', { method: 'POST', body: JSON.stringify(payload) })
fetch('/api/notifications/application-submitted', { method: 'POST', body: JSON.stringify(payload) })

// MCP
fetch('/api/mcp/query', { method: 'POST', body: JSON.stringify({ sql, params }) })
fetch('/api/mcp/schema')
fetch(`/api/mcp/schema?table=${encodeURIComponent(tableName)}`)
```

## Verification Checklist

Run the automated verification script to ensure no consolidated routes remain:

```bash
npm run verify:api-layout
```

The script checks for:
- Required route files inside `api/`
- Removal of deprecated consolidated files (`api/auth.js`, `api/catalog.js`, etc.)
- Frontend services referencing the new endpoints
- Tests and documentation free of query-parameter routing

## Deployment Notes
- Netlify packages each `api/**/index.js` file as an individual function, aligning with the restored layout.
- Supabase Edge Functions are no longer required for MCP access; the serverless routes call Supabase directly with the service role key.
- Update deployment checklists and smoke tests to hit the REST endpoints listed above.
