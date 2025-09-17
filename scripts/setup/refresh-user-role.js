// Refresh user role script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function refreshUserRole() {
  const email = 'mweembahelen@gmail.com'
  
  try {
    // Get user
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found')
      return
    }
    
    // Update user metadata to include admin role
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: 'admin',
        updated_at: new Date().toISOString()
      }
    })
    
    if (error) {
      console.error('❌ Error updating user metadata:', error.message)
    } else {
      console.log('✓ User metadata updated')
      console.log('📧 Email:', email)
      console.log('🔄 Role should refresh on next page load')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

refreshUserRole()