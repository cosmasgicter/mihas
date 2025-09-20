#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugAuthState() {
  console.log('Debugging authentication state...')
  
  try {
    // Try to get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return
    }
    
    if (session) {
      console.log('Current session found:')
      console.log('- User ID:', session.user.id)
      console.log('- Email:', session.user.email)
      console.log('- App metadata:', session.user.app_metadata)
      console.log('- User metadata:', session.user.user_metadata)
    } else {
      console.log('No active session found')
    }
    
    // Test login with known admin
    console.log('\nTesting admin login...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'password123'
    })
    
    if (authError) {
      console.error('Login failed:', authError.message)
      
      // Try alternative admin
      console.log('Trying alternative admin...')
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'admin@mihas.edu.zm',
        password: 'admin123'
      })
      
      if (authError2) {
        console.error('Alternative login failed:', authError2.message)
      } else {
        console.log('✅ Alternative admin login successful:', authData2.user.email)
      }
    } else {
      console.log('✅ Admin login successful:', authData.user.email)
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message)
  }
}

debugAuthState()