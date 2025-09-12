# Security Configuration Setup

## Required Manual Configuration Steps

### 1. Enable Leaked Password Protection

**Location:** Supabase Dashboard > Authentication > Settings > Password Protection

**Steps:**
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Settings
3. Scroll to "Password Protection" section
4. Enable "Check for leaked passwords"
5. Save changes

This enables checking against the HaveIBeenPwned database to prevent users from using compromised passwords.

### 2. Verify Database Security

All database security issues have been automatically resolved via migrations:
- ✅ RLS enabled on all public tables
- ✅ Optimized RLS policies (single policies instead of multiple permissive)
- ✅ Function security fixed with proper search_path
- ✅ Essential indexes added for performance
- ✅ Data integrity constraints added

### 3. Environment Variables

Ensure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Best Practices Implemented

1. **Row Level Security (RLS)** - All tables have appropriate RLS policies
2. **Function Security** - All functions use SECURITY DEFINER with fixed search_path
3. **Data Validation** - Check constraints prevent invalid data
4. **Performance Optimization** - Consolidated RLS policies and essential indexes only
5. **Audit Trail** - Application status changes are tracked in history table