#!/usr/bin/env node

/**
 * Test script for the new API services
 * Run with: node test-api-services.js
 */

const API_BASE = 'http://localhost:3000'

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add a test auth header - replace with actual token in real testing
        'Authorization': 'Bearer test-token'
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options)
    const data = await response.json()
    
    console.log(`✅ ${method} ${endpoint}:`, response.status, data)
    return { success: response.ok, data, status: response.status }
  } catch (error) {
    console.error(`❌ ${method} ${endpoint}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🧪 Testing API Services...\n')

  // Test Programs API
  console.log('📚 Testing Programs API:')
  await testEndpoint('/api/catalog/programs', 'GET')
  
  // Test Intakes API
  console.log('\n📅 Testing Intakes API:')
  await testEndpoint('/api/catalog/intakes', 'GET')
  
  // Test Admin Dashboard API
  console.log('\n📊 Testing Admin Dashboard API:')
  await testEndpoint('/api/admin?action=dashboard', 'GET')

  console.log('\n✨ API Service tests completed!')
  console.log('\n📝 Note: Admin endpoints require valid authentication tokens')
  console.log('   Use the browser dev tools to get a real token for testing')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { testEndpoint, runTests }