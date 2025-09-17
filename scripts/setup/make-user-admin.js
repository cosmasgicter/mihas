// Make user admin script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function makeUserAdmin() {
  const email = 'mweembahelen@gmail.com'
  
  try {
    // First, check if user exists
    const { data: user, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error fetching users:', userError.message)
      return
    }
    
    const targetUser = user.users.find(u => u.email === email)
    
    if (!targetUser) {
      console.error('❌ User not found:', email)
      return
    }
    
    console.log('✓ User found:', targetUser.email)
    
    // Update user profile to admin role
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: targetUser.id,
        email: email,
        full_name: targetUser.user_metadata?.full_name || 'Admin User',
        role: 'admin'
      })
      .select()
    
    if (error) {
      console.error('❌ Error updating profile:', error.message)
    } else {
      console.log('✓ User profile updated to admin')
      console.log('📧 Email:', email)
      console.log('🔑 Role: admin')
      console.log('\n🎉 User is now an admin!')
    }
    
  } catch (error) {
    console.error('❌ Failed to make user admin:', error.message)
  }
}

makeUserAdmin()