# Quick Fix Instructions for Admin Dashboard

## 🚨 The setup script failed because it tried to use a non-existent RPC function. Here's the manual fix:

### Step 1: Apply Database Fixes
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `apply-database-fixes.sql`
5. Click **Run** to execute all the SQL commands

### Step 2: Verify Storage Bucket
The storage bucket already exists, so this is working correctly.

### Step 3: Test Admin Access
1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Login with your admin account (`cosmas@beanola.com`)

3. Navigate to the admin dashboard

### Step 4: Verify Functionality
Check that these features work:
- ✅ Dashboard loads without errors
- ✅ Applications list displays data
- ✅ Filtering and search work
- ✅ Status updates work
- ✅ Bulk operations work

## 🔧 If You Still Have Issues:

### Check User Role
Run this in Supabase SQL Editor to verify your admin role:
```sql
SELECT * FROM user_profiles WHERE email = 'cosmas@beanola.com';
```

### Test RPC Functions
```sql
-- Test dashboard stats
SELECT * FROM get_admin_dashboard_stats();

-- Test bulk update (replace with actual application IDs)
SELECT rpc_bulk_update_status(ARRAY['some-uuid'], 'under_review');
```

### Check Applications Access
```sql
-- This should return applications if RLS is working
SELECT id, full_name, status FROM applications_new LIMIT 5;
```

## 🎯 What Was Fixed:
1. **RLS Policies** - Admin can now access all data
2. **Missing Tables** - Created application_documents, notifications, etc.
3. **RPC Functions** - Created bulk operations and stats functions
4. **Indexes** - Added for better performance
5. **Admin Profile** - Ensured your account has super_admin role

The admin dashboard should now work properly!