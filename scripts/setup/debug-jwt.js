// JWT Token Debug Utility
// Run this in browser console to check JWT token status

async function debugJWTToken() {
  console.log('=== JWT Token Debug ===')
  
  // Check if supabase is available
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase client not found on window object')
    return
  }
  
  try {
    // Get current session
    const { data: { session }, error } = await window.supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error)
      return
    }
    
    if (!session) {
      console.error('No active session found')
      return
    }
    
    console.log('✅ Session found')
    console.log('User ID:', session.user?.id)
    console.log('Email:', session.user?.email)
    console.log('JWT Token (first 50 chars):', session.access_token?.substring(0, 50) + '...')
    console.log('Token expires at:', new Date(session.expires_at * 1000))
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at < now) {
      console.warn('⚠️ Token is expired!')
    } else {
      console.log('✅ Token is valid')
    }
    
    // Test API call with JWT
    console.log('\n=== Testing API Call ===')
    const { data, error: apiError } = await window.supabase
      .from('user_engagement_metrics')
      .select('count(*)')
      .limit(1)
    
    if (apiError) {
      console.error('❌ API call failed:', apiError)
      console.log('Error code:', apiError.code)
      console.log('Error message:', apiError.message)
    } else {
      console.log('✅ API call successful:', data)
    }
    
    // Check user role
    console.log('\n=== Checking User Role ===')
    const { data: roleData, error: roleError } = await window.supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
    
    if (roleError) {
      console.error('❌ Role check failed:', roleError)
    } else {
      console.log('✅ User roles:', roleData)
    }
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  debugJWTToken()
}