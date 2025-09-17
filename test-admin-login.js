#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAdminLogin() {
  console.log('🔍 Testing admin login...')
  
  try {
    // Test with the super admin email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'admin123' // You'll need to provide the correct password
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      return
    }
    
    console.log('✅ Login successful!')
    console.log('User ID:', data.user.id)
    console.log('Email:', data.user.email)
    
    // Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single()
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message)
    } else {
      console.log('✅ Profile found:', profile)
    }
    
    // Check user role
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single()
    
    if (roleError) {
      console.error('❌ Role fetch failed:', roleError.message)
    } else {
      console.log('✅ Role found:', role)
    }
    
    // Test API access
    console.log('\n🔍 Testing API access...')
    const response = await fetch('http://localhost:5173/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const apiData = await response.json()
      console.log('✅ API access successful:', apiData)
    } else {
      console.error('❌ API access failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAdminLogin()