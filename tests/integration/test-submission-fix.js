#!/usr/bin/env node

/**
 * Test Application Submission Fix
 * 
 * This script tests the application submission functionality
 * to ensure it works properly after the fixes.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSubmissionFix() {
  console.log('🧪 Testing Application Submission Fix...\n')

  try {
    // 1. Test authentication
    console.log('1. Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user found. Please sign in first.')
      console.log('   You can test this by signing in through the web app first.')
      return
    }
    
    console.log('✅ User authenticated:', user.email)

    // 2. Test RLS policies
    console.log('\n2. Testing RLS policies...')
    
    // Try to select from applications_new
    const { data: apps, error: selectError } = await supabase
      .from('applications_new')
      .select('id, status, user_id')
      .eq('user_id', user.id)
      .limit(1)
    
    if (selectError) {
      console.log('❌ RLS policy issue:', selectError.message)
      console.log('   Run the fix-submission-rls.sql script to fix this.')
      return
    }
    
    console.log('✅ RLS policies working, found', apps?.length || 0, 'applications')

    // 3. Test creating a draft application
    console.log('\n3. Testing draft application creation...')
    
    const testApp = {
      application_number: `TEST${Date.now()}`,
      public_tracking_code: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      user_id: user.id,
      full_name: 'Test User',
      date_of_birth: '1990-01-01',
      sex: 'Male',
      phone: '0977123456',
      email: user.email,
      residence_town: 'Lusaka',
      program: 'Clinical Medicine',
      intake: 'January 2026',
      institution: 'KATC',
      status: 'draft'
    }
    
    const { data: newApp, error: insertError } = await supabase
      .from('applications_new')
      .insert(testApp)
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message)
      return
    }
    
    console.log('✅ Draft application created:', newApp.id)

    // 4. Test updating to submitted status
    console.log('\n4. Testing submission update...')
    
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications_new')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        payment_method: 'MTN Money',
        amount: 150
      })
      .eq('id', newApp.id)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Update error:', updateError.message)
      return
    }
    
    console.log('✅ Application submitted successfully:', updatedApp.id)

    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...')
    
    const { error: deleteError } = await supabase
      .from('applications_new')
      .delete()
      .eq('id', newApp.id)
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.log('⚠️  Could not clean up test data:', deleteError.message)
    } else {
      console.log('✅ Test data cleaned up')
    }

    console.log('\n🎉 All tests passed! Application submission should work now.')
    console.log('\n📋 Summary:')
    console.log('- Authentication: Working')
    console.log('- RLS Policies: Working')
    console.log('- Draft Creation: Working')
    console.log('- Submission Update: Working')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testSubmissionFix()