// Clear authentication and storage
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearAuth() {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut()
    console.log('✓ Signed out from Supabase')
    
    // Clear localStorage
    localStorage.clear()
    console.log('✓ Cleared localStorage')
    
    // Clear sessionStorage
    sessionStorage.clear()
    console.log('✓ Cleared sessionStorage')
    
    console.log('\n🔄 Please refresh the page and sign in again')
    
  } catch (error) {
    console.error('Error clearing auth:', error.message)
  }
}

clearAuth()