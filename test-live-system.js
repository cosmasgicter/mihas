#!/usr/bin/env node

/**
 * Live System Test for MIHAS Application
 * Tests basic connectivity and API endpoints
 */

const https = require('https')

const BASE_URL = 'https://mihas-katc.netlify.app'

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'MIHAS-Test/1.0',
        ...options.headers
      },
      timeout: 10000
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data: data,
          size: data.length
        })
      })
    })

    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Request timeout')))
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const start = Date.now()
    const response = await makeRequest(url)
    const duration = Date.now() - start
    
    const success = response.status === expectedStatus
    console.log(`${success ? '✅' : '❌'} ${name}`)
    console.log(`   Status: ${response.status} | Time: ${duration}ms | Size: ${response.size} bytes`)
    
    if (!success) {
      console.log(`   Expected: ${expectedStatus}, Got: ${response.status}`)
    }
    
    return success
  } catch (error) {
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error.message}`)
    return false
  }
}

async function runLiveSystemTest() {
  console.log('🚀 MIHAS Live System Test')
  console.log('=========================')
  console.log(`Testing: ${BASE_URL}`)
  console.log('')

  const tests = [
    ['Main Site', `${BASE_URL}/`],
    ['Student Login Page', `${BASE_URL}/auth/login`],
    ['Admin Login Page', `${BASE_URL}/admin/login`],
    ['Public Tracker', `${BASE_URL}/track`],
    ['API Test Endpoint', `${BASE_URL}/.netlify/functions/test`],
    ['Applications API', `${BASE_URL}/.netlify/functions/applications`, 401], // Expect 401 without auth
    ['Auth Login API', `${BASE_URL}/.netlify/functions/auth-login`, 405], // Expect 405 for GET
  ]

  let passed = 0
  let total = tests.length

  console.log('🔍 Testing Endpoints...\n')

  for (const [name, url, expectedStatus] of tests) {
    const success = await testEndpoint(name, url, expectedStatus)
    if (success) passed++
    console.log('')
  }

  console.log('📊 Test Summary')
  console.log('===============')
  console.log(`Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`)
  
  if (passed === total) {
    console.log('🎉 All endpoints are accessible!')
  } else {
    console.log('⚠️ Some endpoints failed - check network or deployment')
  }

  console.log('\n📋 Manual Test Instructions')
  console.log('============================')
  console.log('1. Open test-workflow-browser.html in your browser')
  console.log('2. Follow the step-by-step manual test process')
  console.log('3. Use these credentials:')
  console.log('   Student: cosmaskanchepa8@gmail.com / Beanola2025')
  console.log('   Admin: cosmas@beanola.com / Beanola2025')
  console.log('')
  console.log('🔗 Quick Links:')
  console.log(`   Student Portal: ${BASE_URL}/auth/login`)
  console.log(`   Admin Portal: ${BASE_URL}/admin/login`)
  console.log(`   Public Tracker: ${BASE_URL}/track`)

  return { passed, total }
}

if (require.main === module) {
  runLiveSystemTest().catch(console.error)
}

module.exports = { runLiveSystemTest }