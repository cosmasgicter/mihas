#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listAuthUsers() {
  console.log('Listing auth users...')
  
  try {
    // Get admin users from profiles
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
    
    if (profilesError) {
      console.error('Error fetching admin profiles:', profilesError)
      return
    }
    
    console.log('Admin profiles found:', adminProfiles?.length || 0)
    
    for (const profile of adminProfiles || []) {
      console.log(`\n--- Admin User ---`)
      console.log('Profile ID:', profile.id)
      console.log('User ID:', profile.user_id)
      console.log('Email:', profile.email)
      console.log('Full Name:', profile.full_name)
      console.log('Role:', profile.role)
      
      // Get auth user details
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.user_id)
        
        if (authError) {
          console.log('Auth Error:', authError.message)
        } else if (authUser?.user) {
          console.log('Auth Email:', authUser.user.email)
          console.log('Email Confirmed:', authUser.user.email_confirmed_at ? 'Yes' : 'No')
          console.log('Created:', authUser.user.created_at)
          console.log('App Metadata:', authUser.user.app_metadata)
        }
      } catch (error) {
        console.log('Error fetching auth user:', error.message)
      }
    }
    
  } catch (error) {
    console.error('List failed:', error.message)
  }
}

listAuthUsers()