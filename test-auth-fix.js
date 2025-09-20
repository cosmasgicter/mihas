#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  console.log('Testing authentication fix...')
  
  try {
    // Test login with admin credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'password123'
    })
    
    if (authError) {
      console.error('Auth error:', authError.message)
      return
    }
    
    console.log('✅ Authentication successful')
    console.log('User ID:', authData.user.id)
    console.log('Email:', authData.user.email)
    
    // Get the access token
    const token = authData.session.access_token
    console.log('Access token length:', token.length)
    
    // Test API call to admin users
    const response = await fetch('http://localhost:8888/api/admin/users/fc6a1536-2e5c-4099-9b9e-a38653408f95', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('API Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API call successful:', data)
    } else {
      const error = await response.text()
      console.error('❌ API call failed:', error)
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testAuth()