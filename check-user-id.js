#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserId() {
  const targetUserId = 'f9b1eede-a856-4112-ab9e-58a93ba838a8'
  
  console.log('Checking user ID:', targetUserId)
  
  try {
    // Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()
    
    if (profileError) {
      console.error('Error checking profile:', profileError)
      return
    }
    
    if (profile) {
      console.log('✅ User profile found:', profile)
    } else {
      console.log('❌ User profile not found')
    }
    
    // Check if user exists in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(targetUserId)
    
    if (authError) {
      console.error('Error checking auth user:', authError)
    } else if (authUser?.user) {
      console.log('✅ Auth user found:', { id: authUser.user.id, email: authUser.user.email })
    } else {
      console.log('❌ Auth user not found')
    }
    
  } catch (error) {
    console.error('Check failed:', error.message)
  }
}

checkUserId()