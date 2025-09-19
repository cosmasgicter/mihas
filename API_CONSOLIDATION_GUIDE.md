# API Consolidation Guide

## Summary
Reduced from 20 to 12 serverless functions to meet Vercel Hobby plan limits.

## Changes Made

### 1. Consolidated Catalog APIs (3 → 1)
**Old endpoints:**
- `/api/catalog/grade12-subjects`
- `/api/catalog/programs` 
- `/api/catalog/intakes`

**New endpoint:**
- `/api/catalog?resource=subjects` (GET only)
- `/api/catalog?resource=programs` (GET, POST, PUT, DELETE)
- `/api/catalog?resource=intakes` (GET, POST, PUT, DELETE)

### 2. Consolidated Auth APIs (3 → 1)
**Old endpoints:**
- `/api/auth/login`
- `/api/auth/signin`
- `/api/auth/register`

**New endpoint:**
- `/api/auth?action=login` (POST)
- `/api/auth?action=signin` (POST)
- `/api/auth?action=register` (POST)

### 3. Consolidated Notifications (2 → 1)
**Old endpoints:**
- `/api/notifications/send`
- `/api/notifications/application-submitted`

**New endpoint:**
- `/api/notifications?action=send` (POST)
- `/api/notifications?action=application-submitted` (POST)

### 4. Moved to Supabase Edge Functions
**Moved:**
- `/api/mcp/query` → Edge Function: `mcp-operations?action=query`
- `/api/mcp/schema` → Edge Function: `mcp-operations?action=schema`

## Frontend Updates Required

### Update API calls in your React components:

```typescript
// OLD: catalog calls
fetch('/api/catalog/grade12-subjects')
fetch('/api/catalog/programs')
fetch('/api/catalog/intakes')

// NEW: catalog calls
fetch('/api/catalog?resource=subjects')
fetch('/api/catalog?resource=programs')
fetch('/api/catalog?resource=intakes')

// OLD: auth calls
fetch('/api/auth/login', { method: 'POST', ... })
fetch('/api/auth/signin', { method: 'POST', ... })
fetch('/api/auth/register', { method: 'POST', ... })

// NEW: auth calls
fetch('/api/auth?action=login', { method: 'POST', ... })
fetch('/api/auth?action=signin', { method: 'POST', ... })
fetch('/api/auth?action=register', { method: 'POST', ... })

// OLD: notification calls
fetch('/api/notifications/send', { method: 'POST', ... })
fetch('/api/notifications/application-submitted', { method: 'POST', ... })

// NEW: notification calls
fetch('/api/notifications?action=send', { method: 'POST', ... })
fetch('/api/notifications?action=application-submitted', { method: 'POST', ... })

// OLD: MCP calls
fetch('/api/mcp/query', { method: 'POST', ... })
fetch('/api/mcp/schema')

// NEW: MCP calls (via Supabase Edge Functions)
fetch('https://your-project.supabase.co/functions/v1/mcp-operations?action=query', { 
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  ...
})
fetch('https://your-project.supabase.co/functions/v1/mcp-operations?action=schema', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## Remaining Functions (12/12)
1. `/api/catalog.js` (consolidated)
2. `/api/auth.js` (consolidated)
3. `/api/notifications.js` (consolidated)
4. `/api/analytics?action=metrics|predictive-dashboard|telemetry` (router consolidates metrics, predictive dashboard, telemetry)
5. `/api/applications/[id].js`
6. `/api/applications/index.js`
7. `/api/applications/bulk.js`
8. `/api/admin/dashboard.js`
9. `/api/admin/users/[id].js`
10. `/api/admin/users/index.js`
11. `/api/documents/upload.js`
12. `/api/test.js`

## Supabase Edge Functions (5 total)
1. `document-upload` (existing)
2. `turnstile-verify` (existing)
3. `admin-operations` (existing)
4. `create-admin-user` (existing)
5. `mcp-operations` (new - consolidated MCP functions)

## Next Steps
1. Update frontend API calls to use new consolidated endpoints
2. Test all functionality to ensure nothing is broken
3. Deploy to Vercel (should now be under the 12 function limit)
4. Consider moving more functions to Edge Functions if needed in the future
