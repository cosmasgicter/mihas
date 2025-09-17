# 🚀 Deployment Checklist - API Consolidation Complete

## ✅ Pre-Deployment Verification

### API Consolidation Status
- [x] **12 Vercel Functions** (within Hobby plan limit)
- [x] **1 Supabase Edge Function** (mcp-operations)
- [x] **Frontend Updated** to use consolidated endpoints
- [x] **No Breaking Changes** - all functionality preserved

### Function Count Verification
```bash
npm run verify:api-consolidation
```
Expected output: `✅ Function count is within Vercel Hobby limit`

### Current API Structure
```
api/
├── catalog.js           # Consolidated: subjects, programs, intakes
├── auth.js             # Consolidated: login, signin, register  
├── notifications.js    # Consolidated: send, application-submitted
├── analytics/metrics.js
├── applications/[id].js
├── applications/index.js
├── applications/bulk.js
├── admin/dashboard.js
├── admin/users/[id].js
├── admin/users/index.js
├── documents/upload.js
└── test.js
```

## 🔧 Deployment Steps

### 1. Environment Variables
Ensure these are set in Vercel:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
VITE_APP_BASE_URL=https://your-domain.com
```

### 2. Build Verification
```bash
npm run build:prod
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

### 4. Deploy Supabase Edge Function
```bash
supabase functions deploy mcp-operations
```

## 🧪 Post-Deployment Testing

### API Endpoint Tests
Test each consolidated endpoint:

#### Catalog API
```bash
# Test subjects
curl "https://your-app.vercel.app/api/catalog?resource=subjects"

# Test programs  
curl "https://your-app.vercel.app/api/catalog?resource=programs"

# Test intakes
curl "https://your-app.vercel.app/api/catalog?resource=intakes"
```

#### Auth API
```bash
# Test registration
curl -X POST "https://your-app.vercel.app/api/auth?action=register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","fullName":"Test User"}'

# Test login
curl -X POST "https://your-app.vercel.app/api/auth?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### Notifications API
```bash
# Test notification send (requires admin auth)
curl -X POST "https://your-app.vercel.app/api/notifications?action=send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId":"user-id","title":"Test","message":"Test message"}'
```

#### MCP Edge Function
```bash
# Test schema endpoint
curl "https://your-project.supabase.co/functions/v1/mcp-operations?action=schema" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend Integration Tests
1. **Application Wizard** - Test complete flow
2. **Admin Dashboard** - Test all admin functions
3. **Authentication** - Test login/register/logout
4. **File Uploads** - Test document uploads
5. **Notifications** - Test in-app notifications

## 📊 Monitoring & Verification

### Function Usage Monitoring
Monitor Vercel dashboard for:
- Function execution count
- Response times
- Error rates
- Memory usage

### Performance Benchmarks
- **API Response Time**: < 2 seconds
- **Page Load Time**: < 3 seconds  
- **Function Cold Start**: < 1 second
- **Error Rate**: < 1%

### Health Checks
```bash
# Test API health
curl "https://your-app.vercel.app/api/test"

# Test Edge Function health  
curl "https://your-project.supabase.co/functions/v1/mcp-operations?action=schema" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Rollback Plan

If issues occur:

1. **Revert Vercel Deployment**
   ```bash
   vercel rollback
   ```

2. **Check Function Logs**
   ```bash
   vercel logs
   ```

3. **Monitor Error Rates**
   - Check Vercel dashboard
   - Check Supabase logs
   - Check browser console

## ✅ Success Criteria

- [ ] All 12 functions deploy successfully
- [ ] No 404 errors on API endpoints
- [ ] Frontend loads without errors
- [ ] Authentication works correctly
- [ ] Application submission works
- [ ] Admin dashboard functions properly
- [ ] File uploads work
- [ ] Notifications are sent
- [ ] MCP operations function correctly

## 📞 Support Contacts

- **Technical Issues**: Check logs and error messages
- **Vercel Issues**: Check Vercel dashboard and documentation
- **Supabase Issues**: Check Supabase dashboard and logs

---

**Status**: ✅ Ready for Production Deployment  
**Last Updated**: $(date)  
**API Functions**: 12 Vercel + 1 Supabase Edge Function