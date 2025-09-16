import { supabase } from '@/lib/supabase'

export async function debugAuthState() {
  try {
    console.log('=== AUTH DEBUG START ===')
    
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', user?.email, user?.id)
    console.log('User error:', userError)
    
    if (!user) {
      console.log('No authenticated user')
      return
    }
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    console.log('User profile:', profile)
    console.log('Profile error:', profileError)
    
    // Check user role
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    
    console.log('User role:', role)
    console.log('Role error:', roleError)
    
    console.log('=== AUTH DEBUG END ===')
    
    return {
      user,
      profile,
      role,
      errors: {
        userError,
        profileError,
        roleError
      }
    }
  } catch (error) {
    console.error('Debug auth state error:', error)
    return null
  }
}

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuthState
}