#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuthFix() {
  console.log('🧪 Testing Authentication Fix...\n')

  // Test 1: Check RLS policies
  console.log('1. Testing RLS policies...')
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', { 
      sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'applications_new'` 
    })
    .catch(() => ({ data: null, error: null }))

  if (policies) {
    console.log('✅ RLS policies found:', policies.length)
  } else {
    console.log('⚠️  Could not check policies directly')
  }

  // Test 2: Check current auth status
  console.log('\n2. Testing current authentication...')
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  console.log('Auth Status:', {
    hasUser: !!user,
    hasSession: !!session,
    userError: userError?.message || 'none',
    sessionError: sessionError?.message || 'none'
  })

  // Test 3: Test unauthenticated application submission (should fail)
  console.log('\n3. Testing unauthenticated submission (should fail)...')
  const { data: unauthData, error: unauthError } = await supabase
    .from('applications_new')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      application_number: 'TEST123',
      status: 'draft'
    })

  if (unauthError) {
    console.log('✅ Unauthenticated submission properly blocked:', unauthError.message)
  } else {
    console.log('❌ Security issue: Unauthenticated submission succeeded')
  }

  // Test 4: Create test user and test authenticated submission
  console.log('\n4. Testing with authenticated user...')
  
  const testEmail = 'test@example.com'
  const testPassword = 'testpassword123'

  // Try to sign up test user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { full_name: 'Test User' }
    }
  })

  if (signUpError && !signUpError.message.includes('already registered')) {
    console.log('⚠️  Could not create test user:', signUpError.message)
  }

  // Try to sign in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (signInError) {
    console.log('⚠️  Could not sign in test user:', signInError.message)
    console.log('📝 Manual test required: Sign in and try submitting an application')
    return
  }

  console.log('✅ Test user signed in successfully')

  // Test authenticated submission
  const { data: authData, error: authError } = await supabase
    .from('applications_new')
    .insert({
      user_id: signInData.user.id,
      application_number: 'TEST' + Date.now(),
      public_tracking_code: 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      status: 'draft',
      program_id: '00000000-0000-0000-0000-000000000001', // dummy ID
      intake_id: '00000000-0000-0000-0000-000000000001'   // dummy ID
    })
    .select()

  if (authError) {
    console.log('❌ Authenticated submission failed:', authError.message)
  } else {
    console.log('✅ Authenticated submission succeeded')
    
    // Clean up test record
    if (authData?.[0]?.id) {
      await supabase
        .from('applications_new')
        .delete()
        .eq('id', authData[0].id)
      console.log('🧹 Test record cleaned up')
    }
  }

  // Sign out test user
  await supabase.auth.signOut()
  console.log('🚪 Test user signed out')

  console.log('\n✅ Authentication fix test completed!')
}

testAuthFix().catch(console.error)