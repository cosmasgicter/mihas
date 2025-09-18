import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAdminAccess() {
  try {
    console.log('🔍 Debugging Admin Access...')
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message)
      return
    }
    
    if (!session) {
      console.log('❌ No active session found')
      return
    }
    
    console.log('✅ Active session found')
    console.log('📧 User email:', session.user.email)
    console.log('🆔 User ID:', session.user.id)
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile error:', profileError.message)
    } else {
      console.log('✅ Profile found')
      console.log('👤 Full name:', profile.full_name)
      console.log('🎭 Role:', profile.role)
    }
    
    // Check user role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()
    
    if (roleError) {
      console.log('⚠️ User role error (might not exist):', roleError.message)
    } else {
      console.log('✅ User role found')
      console.log('🎭 Role:', userRole.role)
      console.log('🔑 Permissions:', userRole.permissions)
    }
    
    // Check admin access
    const adminRoles = ['admin', 'super_admin', 'admissions_officer', 'registrar', 'finance_officer', 'academic_head']
    const isSuperAdmin = session.user.email === 'cosmas@beanola.com'
    const hasAdminRole = userRole && adminRoles.includes(userRole.role)
    const hasAdminProfile = profile && adminRoles.includes(profile.role)
    
    console.log('\n🔐 Admin Access Check:')
    console.log('🦸 Super admin override:', isSuperAdmin)
    console.log('👑 Has admin role:', hasAdminRole)
    console.log('📋 Has admin profile:', hasAdminProfile)
    console.log('✅ Should have admin access:', isSuperAdmin || hasAdminRole || hasAdminProfile)
    
    // Test API access
    console.log('\n🌐 Testing API Access...')
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log('✅ API access successful')
        const data = await response.json()
        console.log('📊 Dashboard data received:', Object.keys(data))
      } else {
        console.log('❌ API access failed:', response.status, response.statusText)
      }
    } catch (apiError) {
      console.error('❌ API request error:', apiError.message)
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message)
  }
}

// Run the debug
debugAdminAccess()