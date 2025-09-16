// Quick authentication debug script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAuth() {
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Current session:', session ? 'Active' : 'None')
    
    if (sessionError) {
      console.error('Session error:', sessionError.message)
      return
    }

    // Check user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', user ? user.email : 'None')
    
    if (userError) {
      console.error('User error:', userError.message)
      return
    }

    // Test database access
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (error) {
      console.error('Database access error:', error.message)
      console.log('This suggests RLS policy or permission issues')
    } else {
      console.log('Database access: OK')
    }

  } catch (error) {
    console.error('Auth check failed:', error.message)
  }
}

checkAuth()