#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function fixAuthAccess() {
  console.log('🔧 Fixing authentication access issues...')
  
  try {
    // Check current auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ No authenticated user found')
      console.log('📝 Please sign in first:')
      console.log('   1. Go to /auth/signin')
      console.log('   2. Sign in with your credentials')
      console.log('   3. Try submitting the application again')
      return
    }
    
    console.log('✅ User authenticated:', user.email)
    
    // Check user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (profileError) {
      console.log('❌ Profile check failed:', profileError.message)
      return
    }
    
    if (!profile) {
      console.log('⚠️  No user profile found, creating one...')
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          role: 'student'
        })
        .select()
        .single()
      
      if (createError) {
        console.log('❌ Failed to create profile:', createError.message)
        return
      }
      
      console.log('✅ Profile created successfully')
    } else {
      console.log('✅ User profile exists:', profile.full_name)
    }
    
    // Test application access
    const { data: apps, error: appsError } = await supabase
      .from('applications_new')
      .select('id, status')
      .eq('user_id', user.id)
      .limit(1)
    
    if (appsError) {
      console.log('❌ Application access test failed:', appsError.message)
      console.log('🔧 This indicates an RLS policy issue')
      return
    }
    
    console.log('✅ Application access working')
    console.log('✅ Authentication fix complete!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message)
  }
}

fixAuthAccess()