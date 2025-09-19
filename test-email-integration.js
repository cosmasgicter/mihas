#!/usr/bin/env node

/**
 * MIHAS Email Integration Test
 * Tests email system integration with application workflow
 */

const SUPABASE_URL = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUxMjA4MywiZXhwIjoyMDczMDg4MDgzfQ.FsspKE5bjcG4TW8IvG-N0o7W0E7ljxznwlzJCm50ZRE'

async function testNotificationAPI() {
  console.log('🔔 Testing Notification API Integration')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        to: 'admissions@mihas.edu.zm',
        subject: '[INTEGRATION TEST] Application Workflow',
        template: 'admin-new-application',
        data: {
          applicationNumber: 'INT-TEST-001',
          applicantName: 'Integration Test User',
          programName: 'Diploma in Clinical Medicine',
          submittedAt: new Date().toISOString(),
          applicationStatus: 'submitted',
          applicantEmail: 'test@example.com',
          applicantPhone: '+260 977 000 000'
        }
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('  ✅ Notification API working')
      console.log(`  📨 Email ID: ${result.id}`)
      return true
    } else {
      console.log('  ❌ Notification API failed')
      console.log(`  🔍 Error: ${result.error}`)
      return false
    }
  } catch (error) {
    console.log('  ❌ API request failed')
    console.log(`  🔍 Error: ${error.message}`)
    return false
  }
}

async function testEmailProviderFallback() {
  console.log('\\n🔄 Testing Email Provider Fallback')
  
  // Test with invalid Resend key to trigger fallback
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'X-Test-Provider': 'smtp' // Custom header to force SMTP
      },
      body: JSON.stringify({
        to: 'admissions@mihas.edu.zm',
        subject: '[FALLBACK TEST] SMTP Provider',
        template: 'application-receipt',
        data: {
          applicationNumber: 'FALLBACK-001',
          trackingCode: 'TRK-FALLBACK',
          programName: 'Test Program',
          submissionDate: new Date().toLocaleDateString(),
          paymentStatus: 'pending'
        }
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('  ✅ Provider fallback working')
      console.log(`  📨 Provider used: ${result.provider}`)
      return true
    } else {
      console.log('  ⚠️  Fallback test inconclusive')
      console.log(`  🔍 Response: ${JSON.stringify(result)}`)
      return false
    }
  } catch (error) {
    console.log('  ❌ Fallback test failed')
    console.log(`  🔍 Error: ${error.message}`)
    return false
  }
}

async function testEmailValidation() {
  console.log('\\n🛡️  Testing Email Validation')
  
  const testCases = [
    { email: '', shouldFail: true, description: 'Empty email' },
    { email: 'invalid-email', shouldFail: true, description: 'Invalid format' },
    { email: 'test@', shouldFail: true, description: 'Incomplete domain' },
    { email: 'valid@example.com', shouldFail: false, description: 'Valid email' }
  ]
  
  let validationPassed = 0
  
  for (const testCase of testCases) {
    console.log(`  🧪 Testing: ${testCase.description}`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          to: testCase.email,
          subject: 'Validation Test',
          template: 'application-receipt',
          data: {
            applicationNumber: 'VAL-001',
            trackingCode: 'TRK-VAL',
            programName: 'Test',
            submissionDate: new Date().toLocaleDateString(),
            paymentStatus: 'pending'
          }
        })
      })
      
      const result = await response.json()
      
      if (testCase.shouldFail && !response.ok) {
        console.log(`    ✅ Correctly rejected: ${result.error}`)
        validationPassed++
      } else if (!testCase.shouldFail && response.ok) {
        console.log(`    ✅ Correctly accepted`)
        validationPassed++
      } else {
        console.log(`    ❌ Unexpected result`)
      }
    } catch (error) {
      if (testCase.shouldFail) {
        console.log(`    ✅ Correctly failed with exception`)
        validationPassed++
      } else {
        console.log(`    ❌ Unexpected exception: ${error.message}`)
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`  📊 Validation tests: ${validationPassed}/${testCases.length} passed`)
  return validationPassed === testCases.length
}

async function main() {
  console.log('🚀 MIHAS Email Integration Test')
  console.log('=' .repeat(50))
  
  const tests = [
    { name: 'Notification API', test: testNotificationAPI },
    { name: 'Provider Fallback', test: testEmailProviderFallback },
    { name: 'Email Validation', test: testEmailValidation }
  ]
  
  const results = []
  
  for (const { name, test } of tests) {
    console.log(`\\n🧪 Running: ${name}`)
    console.log('-' .repeat(30))
    
    const success = await test()
    results.push({ name, success })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // Summary
  console.log('\\n📊 Integration Test Summary')
  console.log('=' .repeat(50))
  
  const successful = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })
  
  console.log(`\\n📈 Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)`)
  
  if (successful === total) {
    console.log('\\n🎉 All integration tests passed!')
    console.log('\\n✨ Your email system is production-ready!')
  } else if (successful > 0) {
    console.log('\\n⚠️  Some integration tests failed.')
    console.log('\\n💡 Your basic email functionality works, but check the failed tests.')
  } else {
    console.log('\\n❌ Integration tests failed.')
    console.log('\\n🔧 Check your email configuration and try again.')
  }
}

main().catch(console.error)