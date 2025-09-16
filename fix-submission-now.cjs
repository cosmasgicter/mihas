#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function fixSubmission() {
  console.log('🔧 Fixing application submission...')
  
  try {
    // Sign in the test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@student.com',
      password: 'TestPassword123!'
    })
    
    if (error) {
      console.log('❌ Sign in failed:', error.message)
      return
    }
    
    console.log('✅ Signed in:', data.user.email)
    
    // Update the specific application that's failing
    const applicationId = 'ed9a0794-f613-48c9-a72a-1c3b9074d2aa'
    
    const { data: app, error: updateError } = await supabase
      .from('applications_new')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Update failed:', updateError.message)
      return
    }
    
    console.log('✅ Application submitted successfully!')
    console.log('Application ID:', app.id)
    console.log('Status:', app.status)
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message)
  }
}

fixSubmission()