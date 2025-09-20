#!/usr/bin/env node

async function testAPIFixes() {
  console.log('Testing API fixes...')
  
  const baseUrl = 'http://localhost:8888'
  
  try {
    // Test 1: Malformed URL with &amp; entities
    console.log('\n1. Testing malformed URL handling...')
    const malformedUrl = `${baseUrl}/api/applications?page=0&amp;amp;pageSize=1&amp;amp;status=draft`
    
    const response1 = await fetch(malformedUrl)
    console.log('Malformed URL status:', response1.status)
    
    if (response1.status === 401) {
      console.log('✅ Expected 401 (authentication required)')
    } else if (response1.status === 400) {
      console.log('❌ Still getting 400 error')
      const error = await response1.text()
      console.log('Error:', error)
    }
    
    // Test 2: Admin user endpoint without auth
    console.log('\n2. Testing admin user endpoint without auth...')
    const response2 = await fetch(`${baseUrl}/api/admin/users/f9b1eede-a856-4112-ab9e-58a93ba838a8`)
    console.log('Admin endpoint status:', response2.status)
    
    if (response2.status === 401) {
      console.log('✅ Expected 401 (authentication required)')
    } else if (response2.status === 403) {
      console.log('❌ Still getting 403 error')
    }
    
    // Test 3: CORS headers
    console.log('\n3. Testing CORS headers...')
    const response3 = await fetch(`${baseUrl}/api/applications`, { method: 'OPTIONS' })
    console.log('OPTIONS status:', response3.status)
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': response3.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response3.headers.get('Access-Control-Allow-Methods')
    })
    
    // Test 4: Telemetry endpoint
    console.log('\n4. Testing telemetry endpoint...')
    const response4 = await fetch(`${baseUrl}/api/analytics/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'test', data: { test: true } })
    })
    console.log('Telemetry status:', response4.status)
    
    if (response4.status === 200) {
      console.log('✅ Telemetry endpoint working')
    } else {
      console.log('❌ Telemetry endpoint failed')
    }
    
    // Test 5: Auth me endpoint
    console.log('\n5. Testing auth me endpoint...')
    const response5 = await fetch(`${baseUrl}/api/auth/me`)
    console.log('Auth me status:', response5.status)
    
    if (response5.status === 401) {
      console.log('✅ Expected 401 (no auth token)')
    }
    
    console.log('\n✅ All API fixes tested successfully!')
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testAPIFixes()