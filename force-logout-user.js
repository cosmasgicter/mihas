// Force logout user script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function forceLogoutUser() {
  const email = 'mweembahelen@gmail.com'
  
  try {
    // Get user
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found')
      return
    }
    
    // Sign out all sessions for this user
    const { error } = await supabase.auth.admin.signOut(user.id)
    
    if (error) {
      console.error('❌ Error signing out user:', error.message)
    } else {
      console.log('✓ User sessions cleared')
      console.log('📧 Email:', email)
      console.log('🔄 User must log in again to see admin role')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

forceLogoutUser()