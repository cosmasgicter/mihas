// Check user role script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndFixUserRole() {
  const email = 'mweembahelen@gmail.com'
  
  try {
    // Get user
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found')
      return
    }
    
    // Check current profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    console.log('Current profile:', profile)
    
    // Force update to admin
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('user_id', user.id)
      .select()
    
    if (error) {
      console.error('❌ Update error:', error)
    } else {
      console.log('✓ Updated profile:', data)
    }
    
    // Also check if user_roles table exists and update it
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin']
      })
      .select()
    
    if (!roleError) {
      console.log('✓ Updated user_roles:', roleData)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAndFixUserRole()