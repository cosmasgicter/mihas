#!/usr/bin/env node

// Test script to verify application slip generation with userId support

const { generateApplicationSlip, persistSlip } = require('./src/lib/applicationSlip.ts')

async function testSlipGeneration() {
  console.log('🧪 Testing application slip generation with userId support...\n')

  // Test data
  const testData = {
    public_tracking_code: 'TRK123456',
    application_number: 'MIHAS123456',
    status: 'submitted',
    payment_status: 'pending_review',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    program_name: 'Diploma in Registered Nursing',
    intake_name: 'January 2025 Intake',
    institution: 'MIHAS',
    full_name: 'Test Applicant',
    email: 'test@example.com',
    phone: '+260123456789',
    admin_feedback: null,
    admin_feedback_date: null
  }

  try {
    // Test 1: Generate slip with userId
    console.log('📋 Test 1: Generating slip with userId...')
    const testDataWithUserId = { ...testData, userId: 'test-user-id-123' }
    const blob1 = await generateApplicationSlip(testDataWithUserId)
    console.log('✅ Slip generated successfully with userId')
    console.log(`   Blob size: ${blob1.size} bytes`)

    // Test 2: Generate slip without userId
    console.log('\n📋 Test 2: Generating slip without userId...')
    const blob2 = await generateApplicationSlip(testData)
    console.log('✅ Slip generated successfully without userId')
    console.log(`   Blob size: ${blob2.size} bytes`)

    // Test 3: Test persistSlip with userId
    console.log('\n💾 Test 3: Testing persistSlip with userId...')
    const persistResult1 = await persistSlip('MIHAS123456', blob1, 'test-user-id-123')
    console.log('✅ persistSlip with userId completed')
    console.log(`   Success: ${persistResult1.success}`)
    console.log(`   Path: ${persistResult1.path || 'N/A'}`)
    console.log(`   Error: ${persistResult1.error || 'None'}`)

    // Test 4: Test persistSlip without userId
    console.log('\n💾 Test 4: Testing persistSlip without userId...')
    const persistResult2 = await persistSlip('MIHAS123456', blob2)
    console.log('✅ persistSlip without userId completed')
    console.log(`   Success: ${persistResult2.success}`)
    console.log(`   Path: ${persistResult2.path || 'N/A'}`)
    console.log(`   Error: ${persistResult2.error || 'None'}`)

    console.log('\n🎉 All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testSlipGeneration()
}

module.exports = { testSlipGeneration }