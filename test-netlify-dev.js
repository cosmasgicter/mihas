#!/usr/bin/env node

const http = require('http')

const DEV_URL = 'http://localhost:8888'

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 8888,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 5000
    }

    const req = http.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => reject(new Error('Timeout')))
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testAuth(email, password, type) {
  console.log(`\n🔐 Testing ${type} Login: ${email}`)
  
  try {
    const response = await makeRequest(`${DEV_URL}/.netlify/functions/auth-login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    if (response.status === 200 && (response.data.access_token || response.data.session?.access_token)) {
      console.log('✅ Login successful')
      return response.data.access_token || response.data.session.access_token
    } else {
      console.log('❌ Login failed:', response.status, response.data)
      return null
    }
  } catch (error) {
    console.log('❌ Login error:', error.message)
    return null
  }
}

async function testCreateApplication(token) {
  console.log('\n📝 Testing Application Creation')
  
  try {
    const appData = {
      full_name: 'Test Workflow User',
      email: 'cosmaskanchepa8@gmail.com',
      phone: '+260977123456',
      program: 'Clinical Medicine',
      intake: 'January 2025',
      institution: 'KATC',
      status: 'draft'
    }

    const response = await makeRequest(`${DEV_URL}/.netlify/functions/applications`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(appData)
    })

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Application created:', response.data.id)
      return response.data.id
    } else {
      console.log('❌ Creation failed:', response.status, response.data)
      return null
    }
  } catch (error) {
    console.log('❌ Creation error:', error.message)
    return null
  }
}

async function testApplicationUpdate(token, appId, adminToken) {
  console.log('\n📋 Testing Application Updates')
  
  // Submit application
  try {
    let response = await makeRequest(`${DEV_URL}/.netlify/functions/applications-id?id=${appId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'submitted', submitted_at: new Date().toISOString() })
    })

    if (response.status === 200) {
      console.log('✅ Application submitted')
    } else {
      console.log('❌ Submit failed:', response.status)
      return false
    }

    // Admin update payment status
    response = await makeRequest(`${DEV_URL}/.netlify/functions/applications-id?id=${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'update_payment_status',
        paymentStatus: 'verified'
      })
    })

    if (response.status === 200) {
      console.log('✅ Payment verified')
    } else {
      console.log('❌ Payment update failed:', response.status)
    }

    // Admin approve application
    response = await makeRequest(`${DEV_URL}/.netlify/functions/applications-id?id=${appId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'update_status',
        status: 'approved',
        notes: 'Approved during dev test'
      })
    })

    if (response.status === 200) {
      console.log('✅ Application approved')
      return true
    } else {
      console.log('❌ Approval failed:', response.status)
      return false
    }

  } catch (error) {
    console.log('❌ Update error:', error.message)
    return false
  }
}

async function runDevTest() {
  console.log('🚀 MIHAS Netlify Dev Test')
  console.log('=========================')
  console.log('Testing local development server at localhost:8888\n')

  // Test credentials
  const studentCreds = { email: 'cosmaskanchepa8@gmail.com', password: 'Beanola2025' }
  const adminCreds = { email: 'cosmas@beanola.com', password: 'Beanola2025' }

  let results = {
    studentAuth: false,
    adminAuth: false,
    createApp: false,
    updateApp: false
  }

  // Test student login
  const studentToken = await testAuth(studentCreds.email, studentCreds.password, 'Student')
  results.studentAuth = !!studentToken

  // Test admin login
  const adminToken = await testAuth(adminCreds.email, adminCreds.password, 'Admin')
  results.adminAuth = !!adminToken

  if (studentToken) {
    // Test application creation
    const appId = await testCreateApplication(studentToken)
    results.createApp = !!appId

    if (appId && adminToken) {
      // Test application workflow
      results.updateApp = await testApplicationUpdate(studentToken, appId, adminToken)
    }
  }

  // Summary
  console.log('\n📊 Test Results')
  console.log('================')
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  Object.entries(results).forEach(([test, success]) => {
    console.log(`${success ? '✅' : '❌'} ${test}`)
  })

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`)

  if (passed === total) {
    console.log('\n🎉 All dev tests passed! System working correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Check Netlify dev server logs.')
  }

  return results
}

if (require.main === module) {
  runDevTest().catch(console.error)
}

module.exports = { runDevTest }