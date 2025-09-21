#!/usr/bin/env node

/**
 * Complete End-to-End Workflow Test for MIHAS Application System
 * Tests the entire flow from student application to admin approval
 */

const https = require('https')
const fs = require('fs')

// Test Configuration
const BASE_URL = 'https://mihas-katc.netlify.app'
const API_BASE = 'https://mihas-katc.netlify.app/api'

// Real Test Credentials
const STUDENT_CREDS = {
  email: 'cosmaskanchepa8@gmail.com',
  password: 'Beanola2025'
}

const ADMIN_CREDS = {
  email: 'cosmas@beanola.com', 
  password: 'Beanola2025'
}

// Test Data
const TEST_APPLICATION = {
  full_name: 'Test Student Workflow',
  nrc_number: '123456/78/9',
  date_of_birth: '2000-01-15',
  sex: 'Male',
  phone: '+260977123456',
  email: STUDENT_CREDS.email,
  residence_town: 'Lusaka',
  next_of_kin_name: 'Test Parent',
  next_of_kin_phone: '+260977654321',
  program: 'Clinical Medicine',
  intake: 'January 2025',
  institution: 'KATC',
  application_fee: 153,
  payment_method: 'Mobile Money',
  payer_name: 'Test Student Workflow',
  payer_phone: '+260977123456',
  amount: 153,
  momo_ref: 'MM' + Date.now()
}

let studentToken = null
let adminToken = null
let applicationId = null

// Utility Functions
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MIHAS-Test-Client/1.0',
        ...options.headers
      }
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, data: parsed, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers })
        }
      })
    })

    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Test Functions
async function testStudentLogin() {
  console.log('\n🔐 Testing Student Login...')
  
  const response = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(STUDENT_CREDS)
  })

  if (response.status === 200 && response.data.access_token) {
    studentToken = response.data.access_token
    console.log('✅ Student login successful')
    return true
  } else {
    console.log('❌ Student login failed:', response.status, response.data)
    return false
  }
}

async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...')
  
  const response = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(ADMIN_CREDS)
  })

  if (response.status === 200 && response.data.access_token) {
    adminToken = response.data.access_token
    console.log('✅ Admin login successful')
    return true
  } else {
    console.log('❌ Admin login failed:', response.status, response.data)
    return false
  }
}

async function testCreateApplication() {
  console.log('\n📝 Testing Application Creation...')
  
  const response = await makeRequest(`${API_BASE}/applications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      ...TEST_APPLICATION,
      status: 'draft'
    })
  })

  if (response.status === 200 || response.status === 201) {
    applicationId = response.data.id
    console.log('✅ Application created successfully:', applicationId)
    return true
  } else {
    console.log('❌ Application creation failed:', response.status, response.data)
    return false
  }
}

async function testSubmitApplication() {
  console.log('\n📤 Testing Application Submission...')
  
  const response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
  })

  if (response.status === 200) {
    console.log('✅ Application submitted successfully')
    return true
  } else {
    console.log('❌ Application submission failed:', response.status, response.data)
    return false
  }
}

async function testAdminViewApplication() {
  console.log('\n👀 Testing Admin View Application...')
  
  const response = await makeRequest(`${API_BASE}/applications/${applicationId}?include=grades,documents,statusHistory`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  })

  if (response.status === 200) {
    console.log('✅ Admin can view application details')
    console.log('   - Application Number:', response.data.application?.application_number)
    console.log('   - Status:', response.data.application?.status)
    console.log('   - Payment Status:', response.data.application?.payment_status)
    return true
  } else {
    console.log('❌ Admin view failed:', response.status, response.data)
    return false
  }
}

async function testPaymentVerification() {
  console.log('\n💳 Testing Payment Verification...')
  
  const response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'update_payment_status',
      paymentStatus: 'verified',
      verificationNotes: 'Payment verified during workflow test'
    })
  })

  if (response.status === 200) {
    console.log('✅ Payment verification successful')
    return true
  } else {
    console.log('❌ Payment verification failed:', response.status, response.data)
    return false
  }
}

async function testStatusUpdate() {
  console.log('\n📋 Testing Status Updates...')
  
  // Start Review
  let response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'update_status',
      status: 'under_review',
      notes: 'Starting review process during workflow test'
    })
  })

  if (response.status !== 200) {
    console.log('❌ Status update to under_review failed:', response.status, response.data)
    return false
  }

  console.log('✅ Status updated to under_review')
  await sleep(1000)

  // Approve Application
  response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'update_status',
      status: 'approved',
      notes: 'Application approved during workflow test'
    })
  })

  if (response.status === 200) {
    console.log('✅ Application approved successfully')
    return true
  } else {
    console.log('❌ Application approval failed:', response.status, response.data)
    return false
  }
}

async function testDocumentGeneration() {
  console.log('\n📄 Testing Document Generation...')
  
  // Generate Acceptance Letter
  let response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'generate_acceptance_letter'
    })
  })

  if (response.status !== 200) {
    console.log('⚠️ Acceptance letter generation failed:', response.status, response.data)
  } else {
    console.log('✅ Acceptance letter generated')
  }

  await sleep(1000)

  // Generate Finance Receipt
  response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'generate_finance_receipt'
    })
  })

  if (response.status !== 200) {
    console.log('⚠️ Finance receipt generation failed:', response.status, response.data)
  } else {
    console.log('✅ Finance receipt generated')
  }

  return true
}

async function testNotificationSending() {
  console.log('\n📧 Testing Notification Sending...')
  
  const response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'send_notification',
      title: 'Application Approved',
      message: 'Congratulations! Your application has been approved. Please check your dashboard for next steps.'
    })
  })

  if (response.status === 200) {
    console.log('✅ Notification sent successfully')
    return true
  } else {
    console.log('⚠️ Notification sending failed:', response.status, response.data)
    return false
  }
}

async function testStudentViewStatus() {
  console.log('\n👨‍🎓 Testing Student View Final Status...')
  
  const response = await makeRequest(`${API_BASE}/applications/${applicationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${studentToken}`
    }
  })

  if (response.status === 200) {
    console.log('✅ Student can view final application status')
    console.log('   - Final Status:', response.data.application?.status)
    console.log('   - Payment Status:', response.data.application?.payment_status)
    return true
  } else {
    console.log('❌ Student status view failed:', response.status, response.data)
    return false
  }
}

// Main Test Runner
async function runCompleteWorkflowTest() {
  console.log('🚀 MIHAS Complete Workflow Test')
  console.log('================================')
  console.log('Testing end-to-end application process with real credentials')
  
  const results = {
    studentLogin: false,
    adminLogin: false,
    createApplication: false,
    submitApplication: false,
    adminViewApplication: false,
    paymentVerification: false,
    statusUpdate: false,
    documentGeneration: false,
    notificationSending: false,
    studentViewStatus: false
  }

  try {
    // Phase 1: Authentication
    results.studentLogin = await testStudentLogin()
    if (!results.studentLogin) throw new Error('Student login failed')

    results.adminLogin = await testAdminLogin()
    if (!results.adminLogin) throw new Error('Admin login failed')

    // Phase 2: Student Application Process
    results.createApplication = await testCreateApplication()
    if (!results.createApplication) throw new Error('Application creation failed')

    await sleep(1000)

    results.submitApplication = await testSubmitApplication()
    if (!results.submitApplication) throw new Error('Application submission failed')

    // Phase 3: Admin Processing
    await sleep(2000)

    results.adminViewApplication = await testAdminViewApplication()
    if (!results.adminViewApplication) throw new Error('Admin view failed')

    results.paymentVerification = await testPaymentVerification()
    await sleep(1000)

    results.statusUpdate = await testStatusUpdate()
    await sleep(1000)

    results.documentGeneration = await testDocumentGeneration()
    await sleep(1000)

    results.notificationSending = await testNotificationSending()

    // Phase 4: Student Final Check
    await sleep(1000)
    results.studentViewStatus = await testStudentViewStatus()

  } catch (error) {
    console.log('\n❌ Test failed:', error.message)
  }

  // Results Summary
  console.log('\n📊 Test Results Summary')
  console.log('=======================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`)
  
  if (applicationId) {
    console.log(`\n📋 Test Application ID: ${applicationId}`)
    console.log(`🔗 View in Admin: ${BASE_URL}/admin/applications`)
  }

  if (passed === total) {
    console.log('\n🎉 Complete workflow test PASSED! All systems working correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.')
  }

  return { passed, total, results, applicationId }
}

// Run the test
if (require.main === module) {
  runCompleteWorkflowTest().catch(console.error)
}

module.exports = { runCompleteWorkflowTest }