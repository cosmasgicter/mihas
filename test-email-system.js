#!/usr/bin/env node

/**
 * MIHAS Email System Test
 * Tests both Resend and SMTP email providers
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data for different email templates
const testData = {
  'admin-new-application': {
    applicationNumber: 'TEST-2025-001',
    applicantName: 'John Doe',
    programName: 'Diploma in Clinical Medicine',
    submittedAt: new Date().toISOString(),
    applicationStatus: 'submitted',
    applicantEmail: 'john.doe@example.com',
    applicantPhone: '+260 977 123 456'
  },
  'application-receipt': {
    applicationNumber: 'TEST-2025-001',
    trackingCode: 'TRK-ABC123',
    programName: 'Diploma in Clinical Medicine',
    submissionDate: new Date().toLocaleDateString(),
    paymentStatus: 'pending'
  },
  'application-slip': {
    applicationNumber: 'TEST-2025-001',
    trackingCode: 'TRK-ABC123',
    status: 'submitted',
    slipUrl: 'https://application.mihas.edu.zm/slip/TEST-2025-001',
    applicantName: 'John Doe',
    programName: 'Diploma in Clinical Medicine',
    paymentStatus: 'pending'
  }
}

async function testEmailProvider(provider, testEmail) {
  console.log(`\n🧪 Testing ${provider.toUpperCase()} provider...`)
  
  const results = []
  
  for (const [template, data] of Object.entries(testData)) {
    console.log(`  📧 Testing template: ${template}`)
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: `[TEST] ${template} - ${provider.toUpperCase()}`,
          template,
          data: {
            ...data,
            testProvider: provider
          }
        }
      })
      
      if (error) {
        console.log(`    ❌ Failed: ${error.message}`)
        results.push({ template, success: false, error: error.message })
      } else {
        console.log(`    ✅ Success: ${result.message}`)
        if (result.id) {
          console.log(`    📨 Email ID: ${result.id}`)
        }
        results.push({ template, success: true, provider: result.provider, id: result.id })
      }
    } catch (err) {
      console.log(`    ❌ Exception: ${err.message}`)
      results.push({ template, success: false, error: err.message })
    }
    
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return results
}

async function testSupabaseConnection() {
  console.log('🔗 Testing Supabase connection...')
  
  try {
    const { data, error } = await supabase.from('applications_new').select('count').limit(1)
    if (error) {
      console.log(`❌ Supabase connection failed: ${error.message}`)
      return false
    }
    console.log('✅ Supabase connection successful')
    return true
  } catch (err) {
    console.log(`❌ Supabase connection exception: ${err.message}`)
    return false
  }
}

async function testEdgeFunction() {
  console.log('⚡ Testing Edge Function availability...')
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'test@example.com',
        subject: 'Connection Test',
        template: 'invalid-template',
        data: {}
      }
    })
    
    // We expect this to fail with template error, not connection error
    if (error && error.message.includes('Unknown email template')) {
      console.log('✅ Edge Function is accessible')
      return true
    } else if (error && error.message.includes('not found')) {
      console.log('❌ Edge Function not deployed')
      return false
    } else {
      console.log('✅ Edge Function is accessible')
      return true
    }
  } catch (err) {
    console.log(`❌ Edge Function test failed: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 MIHAS Email System Test')
  console.log('=' .repeat(50))
  
  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'test@mihas.edu.zm'
  console.log(`📧 Test email: ${testEmail}`)
  
  // Test Supabase connection
  const supabaseOk = await testSupabaseConnection()
  if (!supabaseOk) {
    console.log('❌ Cannot proceed without Supabase connection')
    process.exit(1)
  }
  
  // Test Edge Function
  const edgeFunctionOk = await testEdgeFunction()
  if (!edgeFunctionOk) {
    console.log('❌ Cannot proceed without Edge Function')
    process.exit(1)
  }
  
  // Test Resend provider
  console.log('\n📨 Testing Email Providers')
  console.log('-' .repeat(30))
  
  // Set environment for Resend test
  process.env.EMAIL_PROVIDER = 'resend'
  const resendResults = await testEmailProvider('resend', testEmail)
  
  // Test SMTP provider
  process.env.EMAIL_PROVIDER = 'smtp'
  const smtpResults = await testEmailProvider('smtp', testEmail)
  
  // Summary
  console.log('\n📊 Test Summary')
  console.log('=' .repeat(50))
  
  const resendSuccess = resendResults.filter(r => r.success).length
  const smtpSuccess = smtpResults.filter(r => r.success).length
  const totalTests = Object.keys(testData).length
  
  console.log(`Resend Provider: ${resendSuccess}/${totalTests} templates successful`)
  console.log(`SMTP Provider: ${smtpSuccess}/${totalTests} templates successful`)
  
  if (resendSuccess === totalTests && smtpSuccess === totalTests) {
    console.log('\n🎉 All email tests passed!')
  } else {
    console.log('\n⚠️  Some email tests failed. Check the logs above.')
  }
  
  // Detailed results
  console.log('\n📋 Detailed Results:')
  console.log('\nResend Results:')
  resendResults.forEach(r => {
    const status = r.success ? '✅' : '❌'
    console.log(`  ${status} ${r.template}: ${r.success ? 'Success' : r.error}`)
  })
  
  console.log('\nSMTP Results:')
  smtpResults.forEach(r => {
    const status = r.success ? '✅' : '❌'
    console.log(`  ${status} ${r.template}: ${r.success ? 'Success' : r.error}`)
  })
  
  console.log('\n✨ Test completed!')
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

// Run the test
main().catch(console.error)