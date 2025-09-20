#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAdminUsers() {
  console.log('Checking admin users...')
  
  try {
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(10)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    
    console.log('User profiles found:', profiles?.length || 0)
    profiles?.forEach(profile => {
      console.log(`- ${profile.email} (${profile.role}) - ID: ${profile.user_id}`)
    })
    
    // Get user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('is_active', true)
    
    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return
    }
    
    console.log('\nActive user roles:', roles?.length || 0)
    roles?.forEach(role => {
      console.log(`- User ${role.user_id}: ${role.role}`)
    })
    
  } catch (error) {
    console.error('Check failed:', error.message)
  }
}

checkAdminUsers()