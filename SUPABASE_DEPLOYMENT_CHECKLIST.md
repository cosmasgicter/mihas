# Supabase Deployment Checklist

## 📋 Overview
This checklist contains all local database changes and edge functions that have not been applied to your Supabase production environment yet.

**Last Updated:** January 2025  
**Status:** 🔴 Multiple pending deployments required

---

## 🗄️ Database Migrations - PENDING

### ✅ Already Applied (Latest Migration: 20250917120031_20240606_application_stats)
- All migrations up to `20250917120031` are already deployed

### 🔴 NEW MIGRATIONS TO APPLY

#### 1. **Supabase Migrations Directory** - 6 NEW MIGRATIONS
```bash
# These migrations are in supabase/migrations/ but NOT applied yet:

📁 supabase/migrations/
├── ✅ 20250117000000_get_admin_dashboard_overview.sql
├── ✅ 20250221000000_admin_dashboard_metrics_cache.sql  
├── ✅ 20250315000000_notification_consent_audit.sql
├── ✅ 20250401000000_system_audit_log.sql
├── ✅ 20250401001000_user_consents.sql
└── ✅ 20250415000000_user_permissions.sql
```

**Action Required:**
```bash
# Apply these migrations in order:
supabase db push
```

#### 2. **SQL Directory Schemas** - 8 MAJOR SCHEMA UPDATES

##### 🔴 Analytics Schema (`analytics_schema.sql`)
- **Tables:** `application_statistics`, `user_engagement_metrics`, `program_analytics`, `eligibility_analytics`, `automated_reports`, `system_performance_metrics`
- **Functions:** `update_daily_application_statistics()`, `update_program_analytics()`
- **Impact:** Analytics dashboard, reporting features
- **Priority:** HIGH

##### 🔴 Microservices Schema (`microservices_schema.sql`)
- **Tables:** `notifications` with RLS policies
- **Functions:** `update_updated_at_column()`
- **Impact:** Notification system
- **Priority:** HIGH

##### 🔴 Monitoring Schema (`monitoring_schema.sql`)
- **Tables:** `performance_metrics`, `api_telemetry`, `system_alerts`, `error_logs`, `user_feedback`, `maintenance_logs`, `scheduled_updates`, `application_drafts`
- **Functions:** `cleanup_old_metrics()`
- **Impact:** System monitoring, performance tracking
- **Priority:** MEDIUM

##### 🔴 Device Sessions Schema (`device_sessions_schema.sql`)
- **Tables:** `device_sessions` with multi-device support
- **Functions:** `cleanup_old_device_sessions()`
- **Impact:** Multi-device session management
- **Priority:** MEDIUM

##### 🔴 Enhanced Features Schema (`enhanced_features_schema.sql`)
- **Tables:** `user_notification_preferences`, `in_app_notifications`, `notification_logs`, `document_analysis`, `prediction_results`, `workflow_execution_logs`, `application_assignments`, `application_escalations`, `ai_conversations`, `system_analytics`
- **Functions:** `record_system_metric()`, `get_user_notification_preferences()`, `create_notification()`, `get_predictive_insights()`
- **Impact:** AI features, predictive analytics, workflow automation
- **Priority:** HIGH

##### 🔴 Error Handling Schema (`error_handling_schema.sql`)
- **Tables:** `error_logs` with comprehensive error tracking
- **Functions:** `validate_email()`, `validate_zambian_phone()`, `validate_nrc()`, `create_application_safe()`, `check_data_integrity()`, `attempt_error_recovery()`, `get_error_statistics()`
- **Constraints:** Email, phone, NRC validation on applications
- **Impact:** Error handling, data validation, recovery
- **Priority:** CRITICAL

##### 🔴 Application Documents Update (`add_system_generated_to_application_documents.sql`)
- **Changes:** Add `system_generated` column to `application_documents`
- **Impact:** Document management system
- **Priority:** LOW

##### 🔴 Additional SQL Files (Review Required)
- `application_improvements.sql`
- `database_updates.sql`
- `performance_optimization.sql`
- `security_fixes.sql`
- `supabase_optimization.sql`
- `fix_zambian_grading_system.sql`
- `fix_application_number_generation.sql`

---

## 🔧 Edge Functions - DEPLOYMENT STATUS

### ✅ Currently Deployed Functions
1. **document-upload** (v3) - ✅ Active
2. **turnstile-verify** (v3) - ✅ Active  
3. **admin-operations** (v3) - ✅ Active
4. **create-admin-user** (v4) - ✅ Active
5. **mcp-operations** (v1) - ✅ Active

### 🔴 Local Functions - NEED DEPLOYMENT

#### 1. **send-email** Function - 🔴 MISSING
- **Location:** `supabase/functions/send-email/index.ts`
- **Purpose:** Email notification system with multiple providers (Resend, SMTP)
- **Templates:** `admin-new-application`, `application-receipt`, `application-slip`
- **Priority:** CRITICAL
- **Action:** Deploy immediately

```bash
supabase functions deploy send-email
```

#### 2. **Database Functions** - 🔴 MISSING
- **Location:** `supabase/functions/get_admin_dashboard_overview.sql`
- **Location:** `supabase/functions/refresh_admin_dashboard_metrics_cache.sql`
- **Purpose:** Admin dashboard metrics caching
- **Priority:** HIGH

---

## 🚀 Deployment Action Plan

### Phase 1: Critical Infrastructure (Deploy First)
```bash
# 1. Apply new migrations
supabase db push

# 2. Deploy missing edge function
supabase functions deploy send-email

# 3. Apply error handling schema (CRITICAL)
supabase db reset --linked
# Then apply: error_handling_schema.sql
```

### Phase 2: Core Features
```bash
# Apply in this order:
1. analytics_schema.sql
2. enhanced_features_schema.sql  
3. microservices_schema.sql
4. add_system_generated_to_application_documents.sql
```

### Phase 3: Monitoring & Optimization
```bash
# Apply monitoring and performance schemas:
1. monitoring_schema.sql
2. device_sessions_schema.sql
3. performance_optimization.sql
4. supabase_optimization.sql
```

### Phase 4: Additional Improvements (Review First)
```bash
# Review and apply if needed:
1. application_improvements.sql
2. database_updates.sql
3. security_fixes.sql
4. fix_zambian_grading_system.sql
```

---

## ⚠️ Pre-Deployment Checklist

### Environment Variables Required
- [ ] `EMAIL_PROVIDER` (resend/smtp/log)
- [ ] `RESEND_API_KEY` (if using Resend)
- [ ] `RESEND_FROM_EMAIL` or `EMAIL_FROM`
- [ ] `SMTP_*` variables (if using SMTP)

### Database Backup
- [ ] Create database backup before major schema changes
- [ ] Test migrations on staging environment first
- [ ] Verify RLS policies are working correctly

### Function Dependencies
- [ ] Verify all referenced tables exist before deploying functions
- [ ] Check function permissions and RLS policies
- [ ] Test email templates and providers

---

## 🔍 Verification Commands

After deployment, run these to verify:

```sql
-- Check if new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'application_statistics', 'user_engagement_metrics', 
  'device_sessions', 'error_logs', 'system_analytics'
);

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'validate_email', 'create_application_safe', 
  'check_data_integrity', 'cleanup_old_metrics'
);

-- Test edge functions
curl -X POST 'https://your-project.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

---

## 📊 Impact Assessment

### High Impact Changes
- **Error Handling Schema:** Critical for production stability
- **Enhanced Features Schema:** Enables AI and predictive features  
- **Analytics Schema:** Powers admin dashboard metrics
- **Send-Email Function:** Essential for notifications

### Medium Impact Changes
- **Monitoring Schema:** Improves system observability
- **Device Sessions:** Enhances user experience
- **Microservices Schema:** Supports notification system

### Low Impact Changes
- **Application Documents Update:** Minor feature enhancement
- **Performance Optimizations:** Gradual improvements

---

## 🎯 Success Criteria

- [ ] All migrations applied without errors
- [ ] All edge functions deployed and responding
- [ ] RLS policies working correctly
- [ ] Email notifications functioning
- [ ] Admin dashboard loading with metrics
- [ ] No breaking changes to existing functionality
- [ ] Performance improvements measurable

---

**Next Steps:** Start with Phase 1 (Critical Infrastructure) and proceed systematically through each phase, testing thoroughly at each step.