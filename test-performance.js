#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { performance } from 'perf_hooks'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const apiBaseUrl = process.env.VITE_API_BASE_URL

console.log('🚀 Performance Testing Suite\n')

// Test 1: Supabase Connection Speed
async function testSupabaseConnection() {
  console.log('1. Testing Supabase Connection Speed...')
  const start = performance.now()
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getSession()
    const end = performance.now()
    
    console.log(`   ✅ Supabase connection: ${(end - start).toFixed(2)}ms`)
    return end - start
  } catch (error) {
    console.log(`   ❌ Supabase connection failed: ${error.message}`)
    return null
  }
}

// Test 2: Authentication Speed
async function testAuthSpeed() {
  console.log('\n2. Testing Authentication Speed...')
  const start = performance.now()
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alexisstar8@gmail.com',
      password: 'Beanola2025'
    })
    const end = performance.now()
    
    if (error) {
      console.log(`   ⚠️  Auth test: ${error.message} (${(end - start).toFixed(2)}ms)`)
    } else {
      console.log(`   ✅ Authentication: ${(end - start).toFixed(2)}ms`)
      
      // Test profile loading
      const profileStart = performance.now()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      const profileEnd = performance.now()
      
      console.log(`   ✅ Profile loading: ${(profileEnd - profileStart).toFixed(2)}ms`)
      
      // Sign out
      await supabase.auth.signOut()
    }
    
    return end - start
  } catch (error) {
    console.log(`   ❌ Auth test failed: ${error.message}`)
    return null
  }
}

// Test 3: API Endpoints Speed
async function testApiEndpoints() {
  console.log('\n3. Testing API Endpoints Speed...')
  
  const endpoints = [
    '/api/auth',
    '/api/applications',
    '/api/notifications'
  ]
  
  for (const endpoint of endpoints) {
    const start = performance.now()
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const end = performance.now()
      
      console.log(`   ${response.ok ? '✅' : '⚠️'} ${endpoint}: ${response.status} (${(end - start).toFixed(2)}ms)`)
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Connection failed`)
    }
  }
}

// Test 4: Database Query Performance
async function testDatabasePerformance() {
  console.log('\n4. Testing Database Query Performance...')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test simple query
    const start1 = performance.now()
    const { data: institutions } = await supabase
      .from('institutions')
      .select('*')
      .limit(10)
    const end1 = performance.now()
    console.log(`   ✅ Institutions query: ${(end1 - start1).toFixed(2)}ms`)
    
    // Test complex query
    const start2 = performance.now()
    const { data: applications } = await supabase
      .from('applications')
      .select('*, user_profiles(*)')
      .limit(5)
    const end2 = performance.now()
    console.log(`   ✅ Applications with profiles: ${(end2 - start2).toFixed(2)}ms`)
    
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}`)
  }
}

// Test 5: Bundle Size Analysis
async function testBundleSize() {
  console.log('\n5. Bundle Size Analysis...')
  
  try {
    const response = await fetch(`${apiBaseUrl}/`)
    const html = await response.text()
    const jsMatches = html.match(/src="[^"]*\.js"/g) || []
    const cssMatches = html.match(/href="[^"]*\.css"/g) || []
    
    console.log(`   📦 JavaScript files: ${jsMatches.length}`)
    console.log(`   🎨 CSS files: ${cssMatches.length}`)
    console.log(`   📄 HTML size: ${(html.length / 1024).toFixed(2)}KB`)
  } catch (error) {
    console.log(`   ❌ Bundle analysis failed: ${error.message}`)
  }
}

// Run all tests
async function runPerformanceTests() {
  const results = {}
  
  results.supabaseConnection = await testSupabaseConnection()
  results.authSpeed = await testAuthSpeed()
  await testApiEndpoints()
  await testDatabasePerformance()
  await testBundleSize()
  
  console.log('\n📊 Performance Summary:')
  console.log('========================')
  
  if (results.supabaseConnection) {
    console.log(`Supabase Connection: ${results.supabaseConnection.toFixed(2)}ms`)
  }
  
  if (results.authSpeed) {
    console.log(`Authentication: ${results.authSpeed.toFixed(2)}ms`)
  }
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:')
  console.log('================================')
  
  if (results.supabaseConnection > 1000) {
    console.log('⚠️  Supabase connection is slow (>1s) - check network or region')
  }
  
  if (results.authSpeed > 2000) {
    console.log('⚠️  Authentication is slow (>2s) - optimize auth flow')
  } else if (results.authSpeed < 500) {
    console.log('✅ Authentication is fast (<500ms)')
  }
  
  console.log('\n🎯 Next Steps:')
  console.log('- Run `npm run dev` to test locally')
  console.log('- Check browser DevTools Network tab for bottlenecks')
  console.log('- Monitor Core Web Vitals in production')
}

// Run the tests
runPerformanceTests().catch(console.error)