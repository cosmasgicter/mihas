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
  console.log('🔍 Testing admin login with correct password...')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'Beanola2025'
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      return
    }
    
    console.log('✅ Login successful!')
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
    
    console.log('API Response Status:', response.status)
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const apiData = await response.json()
      console.log('✅ API access successful!')
      console.log('Dashboard stats:', JSON.stringify(apiData.stats, null, 2))
    } else {
      console.error('❌ API access failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
    }
    
    // Test frontend access
    console.log('\n🔍 Testing frontend admin route...')
    const frontendResponse = await fetch('http://localhost:5173/admin', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })
    
    console.log('Frontend Response Status:', frontendResponse.status)
    if (frontendResponse.ok) {
      console.log('✅ Frontend admin route accessible')
    } else {
      console.error('❌ Frontend admin route failed:', frontendResponse.status, frontendResponse.statusText)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAdminLogin()