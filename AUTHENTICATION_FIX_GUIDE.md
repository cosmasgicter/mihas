# Authentication Fix Guide - 403 Error Resolution

## Problem
Users are getting a 403 error when trying to submit applications: `mylgegkqoddcrxtwcclb.supabase.co/rest/v1/applications_new?id=eq.11702387-b71e-4da3-924b-9922715dd56c:1 Failed to load resource: the server responded with a status of 403 ()`

## Root Cause
The error occurs because the user is not properly authenticated when trying to submit the application. The Row Level Security (RLS) policies on the `applications_new` table require a valid authenticated user session.

## Immediate Fix Steps

### 1. Check User Authentication Status
Before submitting an application, ensure the user is properly signed in:

```javascript
// Check if user is authenticated
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) {
  // Redirect to sign in page
  window.location.href = '/auth/signin'
}
```

### 2. Verify Session Validity
```javascript
// Check if session is still valid
const { data: { session }, error } = await supabase.auth.getSession()
if (!session) {
  // Session expired, refresh or redirect to sign in
  await supabase.auth.refreshSession()
}
```

### 3. Frontend Implementation
Add the `AuthStatusChecker` component to your application wizard:

```tsx
import { AuthStatusChecker } from '@/components/application/AuthStatusChecker'

function ApplicationWizard() {
  const [canSubmit, setCanSubmit] = useState(false)
  
  return (
    <div>
      <AuthStatusChecker onStatusChange={setCanSubmit} />
      
      {/* Your application form */}
      
      <button 
        disabled={!canSubmit}
        onClick={submitApplication}
      >
        Submit Application
      </button>
    </div>
  )
}
```

### 4. Enhanced Error Handling
The updated `useApplicationSubmit` hook now includes better error handling for authentication issues:

- Retries authentication up to 3 times
- Provides specific error messages for different failure types
- Includes fallback submission method using secure database function

## Database Changes Applied

### RLS Policies Updated
- ✅ Fixed INSERT policy to require proper authentication
- ✅ Enhanced SELECT policy with admin access
- ✅ Improved UPDATE policy with role-based access
- ✅ Secured DELETE policy for drafts only

### New Helper Functions
- ✅ `check_user_authentication()` - Verify current auth status
- ✅ `submit_application_secure()` - Fallback submission method

## Testing the Fix

### 1. Test Authentication Status
```sql
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email,
  CASE 
    WHEN auth.uid() IS NULL THEN 'Not authenticated'
    ELSE 'Authenticated'
  END as auth_status;
```

### 2. Test Application Submission
1. Ensure user is signed in
2. Try submitting an application
3. Check for proper error messages if authentication fails

## Prevention Measures

### 1. Add Authentication Guards
Wrap sensitive components with authentication checks:

```tsx
import { AuthenticationGuard } from '@/components/application/AuthenticationGuard'

function ProtectedComponent() {
  return (
    <AuthenticationGuard onAuthenticationRequired={() => {
      // Handle authentication required
      window.location.href = '/auth/signin'
    }}>
      {/* Protected content */}
    </AuthenticationGuard>
  )
}
```

### 2. Session Management
Implement proper session timeout handling:

```javascript
// Set up session refresh
setInterval(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session && session.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    
    // Refresh if expiring in next 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      await supabase.auth.refreshSession()
    }
  }
}, 60000) // Check every minute
```

### 3. User Feedback
Always provide clear feedback when authentication issues occur:

```tsx
{authError && (
  <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
    <p className="text-red-700">{authError}</p>
    <button 
      onClick={() => window.location.href = '/auth/signin'}
      className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Sign In Again
    </button>
  </div>
)}
```

## Troubleshooting

### Common Issues

1. **User appears signed in but still gets 403**
   - Check if session has expired
   - Verify JWT token is being sent with requests
   - Refresh the session

2. **Authentication works in development but not production**
   - Check environment variables
   - Verify Supabase URL and keys
   - Check CORS settings

3. **Intermittent authentication failures**
   - Implement retry logic
   - Add session refresh mechanism
   - Check network connectivity

### Debug Commands

```javascript
// Check current auth state
console.log('Auth state:', await supabase.auth.getUser())
console.log('Session:', await supabase.auth.getSession())

// Test authenticated request
const { data, error } = await supabase
  .from('user_profiles')
  .select('id')
  .limit(1)
console.log('Auth test:', { data, error })
```

## Summary

The 403 error has been resolved by:
1. ✅ Updating RLS policies for proper authentication
2. ✅ Adding authentication verification in the frontend
3. ✅ Implementing better error handling and user feedback
4. ✅ Creating fallback submission methods
5. ✅ Adding authentication guard components

Users should now be properly authenticated before attempting to submit applications, preventing the 403 error from occurring.