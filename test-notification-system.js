#!/usr/bin/env node

/**
 * Test script to verify notification system functionality
 * Run with: node test-notification-system.js
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNotificationSystem() {
  console.log('🧪 Testing Notification System...\n')

  try {
    // 1. Check if notification tables exist
    console.log('1️⃣ Checking notification tables...')
    const { data: tables, error: tablesError } = await supabase
      .from('in_app_notifications')
      .select('id')
      .limit(1)

    if (tablesError) {
      console.error('❌ Notification tables not found:', tablesError.message)
      return false
    }
    console.log('✅ Notification tables exist')

    // 2. Create a test user (or use existing)
    console.log('\n2️⃣ Setting up test user...')
    const testEmail = 'test-notifications@example.com'
    const testPassword = 'TestPassword123!'

    // Try to sign up (will fail if user exists, which is fine)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    // Sign in to get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError) {
      console.error('❌ Failed to sign in test user:', signInError.message)
      return false
    }

    const userId = signInData.user.id
    const accessToken = signInData.session.access_token
    console.log('✅ Test user authenticated:', userId)

    // 3. Create a test application
    console.log('\n3️⃣ Creating test application...')
    const { data: application, error: appError } = await supabase
      .from('applications_new')
      .insert({
        user_id: userId,
        application_number: 'TEST-2024-001',
        public_tracking_code: 'TRK123TEST',
        full_name: 'Test User',
        email: testEmail,
        phone: '0977123456',
        program: 'Clinical Medicine',
        institution: 'KATC',
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (appError) {
      console.error('❌ Failed to create test application:', appError.message)
      return false
    }
    console.log('✅ Test application created:', application.id)

    // 4. Test notification API endpoint
    console.log('\n4️⃣ Testing notification API...')
    const response = await fetch(`${apiBaseUrl}/api/notifications/application-submitted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        applicationId: application.id,
        userId: userId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Notification API failed:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('✅ Notification API success:', result.success)

    // 5. Verify notification was created
    console.log('\n5️⃣ Verifying notification in database...')
    const { data: notifications, error: notifError } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (notifError || !notifications || notifications.length === 0) {
      console.error('❌ No notifications found:', notifError?.message)
      return false
    }

    const notification = notifications[0]
    console.log('✅ Notification found:')
    console.log('   Title:', notification.title)
    console.log('   Content:', notification.content)
    console.log('   Type:', notification.type)
    console.log('   Read:', notification.read)

    // 6. Test notification bell functionality (simulate)
    console.log('\n6️⃣ Testing notification retrieval...')
    const { data: userNotifications, error: getUserNotifError } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })

    if (getUserNotifError) {
      console.error('❌ Failed to retrieve notifications:', getUserNotifError.message)
      return false
    }

    console.log(`✅ Found ${userNotifications.length} unread notifications`)

    // 7. Cleanup test data
    console.log('\n7️⃣ Cleaning up test data...')
    await supabase.from('in_app_notifications').delete().eq('user_id', userId)
    await supabase.from('applications_new').delete().eq('id', application.id)
    console.log('✅ Test data cleaned up')

    console.log('\n🎉 All notification tests passed!')
    return true

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    return false
  }
}

// Run the test
testNotificationSystem()
  .then(success => {
    if (success) {
      console.log('\n✅ Notification system is working correctly!')
      process.exit(0)
    } else {
      console.log('\n❌ Notification system has issues!')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error)
    process.exit(1)
  })