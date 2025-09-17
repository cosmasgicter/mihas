// Create admin user script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdmin() {
  const email = 'admin@mihas.edu.zm' // Change this to your email
  const password = 'Admin123!' // Change this to your desired password
  
  try {
    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator'
      }
    })
    
    if (authError) {
      console.error('❌ Error creating user:', authError.message)
      return
    }
    
    console.log('✓ User created:', authData.user.email)
    
    // Create profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: 'System Administrator',
        email: email,
        role: 'admin'
      })
    
    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message)
    } else {
      console.log('✓ Profile created')
    }
    
    // Create admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin'],
        is_active: true
      })
    
    if (roleError) {
      console.error('❌ Error creating role:', roleError.message)
    } else {
      console.log('✓ Admin role created')
    }
    
    console.log('\n🎉 Admin user created successfully!')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('\nYou can now sign in with these credentials.')
    
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message)
  }
}

createAdmin()