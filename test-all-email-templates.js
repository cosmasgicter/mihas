#!/usr/bin/env node

/**
 * Test All MIHAS Email Templates
 */

const SUPABASE_URL = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const templates = {
  'admin-new-application': {
    subject: '[TEST] New Application Notification',
    data: {
      applicationNumber: 'TEST-2025-001',
      applicantName: 'John Doe Test',
      programName: 'Diploma in Clinical Medicine',
      submittedAt: new Date().toISOString(),
      applicationStatus: 'submitted',
      applicantEmail: 'john.doe@example.com',
      applicantPhone: '+260 977 123 456'
    }
  },
  'application-receipt': {
    subject: '[TEST] Application Receipt',
    data: {
      applicationNumber: 'TEST-2025-001',
      trackingCode: 'TRK-ABC123',
      programName: 'Diploma in Clinical Medicine',
      submissionDate: new Date().toLocaleDateString(),
      paymentStatus: 'pending'
    }
  },
  'application-slip': {
    subject: '[TEST] Application Slip Ready',
    data: {
      applicationNumber: 'TEST-2025-001',
      trackingCode: 'TRK-ABC123',
      status: 'submitted',
      slipUrl: 'https://application.mihas.edu.zm/slip/TEST-2025-001',
      applicantName: 'John Doe Test',
      programName: 'Diploma in Clinical Medicine',
      paymentStatus: 'pending'
    }
  }
}

async function testTemplate(templateName, templateConfig, recipient) {
  console.log(`📧 Testing template: ${templateName}`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        to: recipient,
        subject: templateConfig.subject,
        template: templateName,
        data: templateConfig.data
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log(`  ✅ Success: ${result.message}`)
      if (result.id) {
        console.log(`  📨 Email ID: ${result.id}`)
      }
      return true
    } else {
      console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`)
      return false
    }
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`)
    return false
  }
}

async function main() {
  const recipient = process.argv[2] || 'admissions@mihas.edu.zm'
  
  console.log('🚀 MIHAS Email Templates Test')
  console.log('=' .repeat(50))
  console.log(`📧 Test recipient: ${recipient}`)
  console.log(`📝 Testing ${Object.keys(templates).length} templates`)
  
  const results = []
  
  for (const [templateName, templateConfig] of Object.entries(templates)) {
    console.log(`\\n🧪 Testing: ${templateName}`)
    console.log('-' .repeat(30))
    
    const success = await testTemplate(templateName, templateConfig, recipient)
    results.push({ template: templateName, success })
    
    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  // Summary
  console.log('\\n📊 Test Results Summary')
  console.log('=' .repeat(50))
  
  const successful = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.template}`)
  })
  
  console.log(`\\n📈 Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)`)
  
  if (successful === total) {
    console.log('\\n🎉 All email templates are working perfectly!')
  } else if (successful > 0) {
    console.log('\\n⚠️  Some templates failed. Check the logs above.')
  } else {
    console.log('\\n❌ All templates failed. Check your email configuration.')
  }
}

main().catch(console.error)