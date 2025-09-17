#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createTestUser() {
  console.log('👤 Creating test user for application submission...')
  
  const testEmail = 'test@student.com'
  const testPassword = 'TestPassword123!'
  
  try {
    // Sign up test user
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Student',
          sex: 'Male'
        }
      }
    })
    
    if (error) {
      console.log('❌ Signup failed:', error.message)
      
      // Try signing in if user already exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })
      
      if (signInError) {
        console.log('❌ Sign in also failed:', signInError.message)
        return
      }
      
      console.log('✅ Signed in existing user:', testEmail)
    } else {
      console.log('✅ Test user created:', testEmail)
    }
    
    console.log('📝 Test credentials:')
    console.log('   Email:', testEmail)
    console.log('   Password:', testPassword)
    console.log('🚀 You can now test application submission!')
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message)
  }
}

createTestUser()