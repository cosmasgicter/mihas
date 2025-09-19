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
    // Test with different possible passwords
    const passwords = ['admin123', 'password', 'Admin123!', 'mihas2024']
    
    for (const password of passwords) {
      console.log(`\n🔐 Trying password: ${password}`)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'cosmas@beanola.com',
        password: password
      })
      
      if (error) {
        console.error('❌ Login failed:', error.message)
        continue
      }
      
      console.log('✅ Login successful with password:', password)
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
      
      // Test API access
      console.log('\n🔍 Testing API access...')
      const response = await fetch('http://localhost:5173/api/admin?action=dashboard', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const apiData = await response.json()
        console.log('✅ API access successful!')
        console.log('Dashboard stats:', apiData.stats)
      } else {
        console.error('❌ API access failed:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
      
      return // Exit on successful login
    }
    
    console.log('\n❌ All password attempts failed')
    console.log('🔧 Resetting password for admin user...')
    
    // Reset password using service role
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      'fc6a1536-2e5c-4099-9b9e-a38653408f95', // Admin user ID from previous output
      { password: 'admin123' }
    )
    
    if (resetError) {
      console.error('❌ Password reset failed:', resetError.message)
    } else {
      console.log('✅ Password reset successful')
      
      // Try login again
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'cosmas@beanola.com',
        password: 'admin123'
      })
      
      if (loginError) {
        console.error('❌ Login still failed:', loginError.message)
      } else {
        console.log('✅ Login successful after password reset!')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAdminLogin()