#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const testUser = {
  email: 'test@mihas.edu.zm',
  password: 'TestPassword123!',
  full_name: 'Test Student'
}

console.log('Creating test user for development...')

try {
  // Try to sign up the test user
  const { data, error } = await supabase.auth.signUp({
    email: testUser.email,
    password: testUser.password,
    options: {
      data: {
        full_name: testUser.full_name
      }
    }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('✅ Test user already exists')
      
      // Try to sign in to verify credentials work
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message)
      } else {
        console.log('✅ Test user sign in successful')
        console.log('User ID:', signInData.user?.id)
        
        // Sign out
        await supabase.auth.signOut()
      }
    } else {
      console.error('❌ Error creating test user:', error.message)
    }
  } else {
    console.log('✅ Test user created successfully')
    console.log('User ID:', data.user?.id)
  }
  
  console.log('\nTest credentials:')
  console.log('Email:', testUser.email)
  console.log('Password:', testUser.password)
  
} catch (error) {
  console.error('❌ Test user creation failed:', error.message)
}