// Test admin access and permissions
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAdminAccess() {
  try {
    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ No user logged in')
      return
    }
    
    console.log('👤 Current user:', user.email)
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile error:', profileError.message)
    } else {
      console.log('👤 Profile role:', profile?.role)
    }
    
    // Check user roles
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (roleError) {
      console.error('❌ Role error:', roleError.message)
    } else {
      console.log('🔑 User role:', userRole?.role)
      console.log('🔑 Permissions:', userRole?.permissions)
    }
    
    // Test admin table access
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('count')
      .limit(1)
    
    if (appError) {
      console.error('❌ Applications access error:', appError.message)
    } else {
      console.log('✓ Applications table accessible')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAdminAccess()