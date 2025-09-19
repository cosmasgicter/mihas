#!/usr/bin/env node

/**
 * Simple MIHAS Email Test
 * Direct test of Supabase Edge Function
 */

const SUPABASE_URL = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

async function testEmail(provider = 'resend', testEmail = 'test@mihas.edu.zm') {
  console.log(`🧪 Testing ${provider.toUpperCase()} email provider`)
  console.log(`📧 Sending to: ${testEmail}`)
  
  const testData = {
    applicationNumber: 'TEST-2025-001',
    applicantName: 'John Doe Test',
    programName: 'Diploma in Clinical Medicine',
    submittedAt: new Date().toISOString(),
    applicationStatus: 'submitted',
    applicantEmail: testEmail,
    applicantPhone: '+260 977 123 456'
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        to: testEmail,
        subject: `[TEST] New Application - ${provider.toUpperCase()} Provider`,
        template: 'admin-new-application',
        data: testData
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Email sent successfully!')
      console.log('📨 Response:', result)
      return true
    } else {
      console.log('❌ Email failed to send')
      console.log('🔍 Error:', result)
      return false
    }
  } catch (error) {
    console.log('❌ Request failed')
    console.log('🔍 Error:', error.message)
    return false
  }
}

async function testBothProviders(testEmail) {
  console.log('🚀 MIHAS Email System Test')
  console.log('=' .repeat(40))
  
  // Test Resend
  console.log('\n📨 Testing Resend Provider')
  console.log('-' .repeat(25))
  const resendSuccess = await testEmail('resend', testEmail)
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Test SMTP
  console.log('\n📨 Testing SMTP Provider')
  console.log('-' .repeat(25))
  const smtpSuccess = await testEmail('smtp', testEmail)
  
  // Summary
  console.log('\n📊 Test Summary')
  console.log('=' .repeat(40))
  console.log(`Resend: ${resendSuccess ? '✅ Success' : '❌ Failed'}`)
  console.log(`SMTP: ${smtpSuccess ? '✅ Success' : '❌ Failed'}`)
  
  if (resendSuccess || smtpSuccess) {
    console.log('\n🎉 At least one email provider is working!')
  } else {
    console.log('\n⚠️  Both email providers failed. Check configuration.')
  }
}

// Get test email from command line or use default
const targetEmail = process.argv[2] || 'admissions@mihas.edu.zm'

// Run the test
testBothProviders(targetEmail).catch(console.error)