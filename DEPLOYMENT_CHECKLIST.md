# 🚀 Deployment Checklist - Multi-function API Layout

## ✅ Pre-Deployment Verification

### API Layout Status
- [x] **Multi-function routes deployed** (one file per endpoint)
- [x] **Supabase credentials configured**
- [x] **Frontend updated** to use REST-style endpoints
- [x] **Smoke tests prepared** for new routes

### Health Check Script
```bash
npm run verify:api-layout
```
Expected output: `✅ API layout matches multi-function Netlify deployment`

### Current API Structure
```
api/
├── auth/              # login.js | signin.js | register.js
├── catalog/           # programs/index.js | intakes/index.js | subjects.js
├── applications/      # index.js | [id].js | bulk.js
├── admin/             # dashboard.js | audit-log.js | users/*.js
├── documents/         # upload.js
├── notifications/     # send.js | application-submitted.js | preferences.js | update-consent.js
├── analytics/         # metrics.js | predictive-dashboard.js | telemetry/index.js
├── mcp/               # query.js | schema.js
├── user-consents.js
└── test.js
```

## 🔧 Deployment Steps

### 1. Environment Variables
Ensure these are set (Vercel, Netlify, or your platform of choice):
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_API_BASE_URL=https://your-app.netlify.app
VITE_APP_BASE_URL=https://your-domain.com
VITE_ANALYTICS_BASE_URL=https://analytics.your-domain.com
VITE_ANALYTICS_SITE_ID=your_umami_site_id
VITE_ANALYTICS_SHARE_TOKEN=your_umami_share_token
```

### 2. Build Verification
```bash
npm run build:prod
```

### 3. Deploy Application
```bash
# Netlify example
netlify deploy --prod

# or Vercel
vercel --prod
```

### 4. Optional Supabase Edge Functions
MCP access is handled by `/api/mcp/*`. Deploy any optional functions (for example transactional email) if used:
```bash
supabase functions deploy send-email
```

## 🧪 Post-Deployment Testing

### API Endpoint Tests
Run quick cURL checks against the deployed API:

#### Catalog API
```bash
curl "https://your-app.netlify.app/api/catalog/subjects"
curl "https://your-app.netlify.app/api/catalog/programs"
curl "https://your-app.netlify.app/api/catalog/intakes"
```

#### Auth API
```bash
curl -X POST "https://your-app.netlify.app/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","fullName":"Test User"}'

curl -X POST "https://your-app.netlify.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### Notifications API
```bash
curl -X POST "https://your-app.netlify.app/api/notifications/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId":"user-id","title":"Test","message":"Test message"}'
```

#### MCP API
```bash
curl "https://your-app.netlify.app/api/mcp/schema" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X POST "https://your-app.netlify.app/api/mcp/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"sql":"select 1"}'
```

### Analytics Share Endpoint
```bash
curl -H "x-umami-share-token: $VITE_ANALYTICS_SHARE_TOKEN" \
  "$VITE_ANALYTICS_BASE_URL/api/share/$VITE_ANALYTICS_SITE_ID/active"
```

### Frontend Smoke Tests
1. **Application Wizard** – run through submission flow
2. **Admin Dashboard** – verify metrics, audit log, and user management
3. **Authentication** – register, login, logout
4. **File Uploads** – test `/api/documents/upload`
5. **Notifications** – trigger send/application-submitted flows

## 📊 Monitoring & Verification

### Function Monitoring
Track your platform dashboard for:
- Execution count
- Response times
- Error rates
- Memory usage

### Health Checks
```bash
curl "https://your-app.netlify.app/api/test"
curl "https://your-app.netlify.app/api/mcp/schema" -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Rollback Plan

1. Revert deployment (`netlify rollback` / `vercel rollback`)
2. Inspect logs (`netlify logs` / `vercel logs`)
3. Monitor Supabase logs for auth or database errors

## ✅ Success Criteria

- [ ] All API routes respond with expected status codes
- [ ] Authentication flows succeed
- [ ] Applications can be submitted and retrieved
- [ ] Admin dashboard loads metrics and audit data
- [ ] Document uploads succeed
- [ ] MCP schema/query endpoints respond for authorized admins
