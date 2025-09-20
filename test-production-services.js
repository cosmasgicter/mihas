import fetch from 'node-fetch'

const PRODUCTION_URL = 'https://application.mihas.edu.zm'

async function testServices() {
  console.log('🧪 Testing Production Microservices...\n')

  // Test Auth Service
  console.log('1. Testing Auth Service...')
  try {
    const authResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    })
    console.log(`   Auth Service: ${authResponse.status} ${authResponse.statusText}`)
  } catch (error) {
    console.log(`   Auth Service: ERROR - ${error.message}`)
  }

  // Test Applications Service
  console.log('2. Testing Applications Service...')
  try {
    const appsResponse = await fetch(`${PRODUCTION_URL}/api/applications`)
    console.log(`   Applications Service: ${appsResponse.status} ${appsResponse.statusText}`)
  } catch (error) {
    console.log(`   Applications Service: ERROR - ${error.message}`)
  }

  // Test Documents Service
  console.log('3. Testing Documents Service...')
  try {
    const docsResponse = await fetch(`${PRODUCTION_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'test.pdf' })
    })
    console.log(`   Documents Service: ${docsResponse.status} ${docsResponse.statusText}`)
  } catch (error) {
    console.log(`   Documents Service: ERROR - ${error.message}`)
  }

  // Test Notifications Service
  console.log('4. Testing Notifications Service...')
  try {
    const notifResponse = await fetch(`${PRODUCTION_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test', type: 'test', title: 'Test', message: 'Test' })
    })
    console.log(`   Notifications Service: ${notifResponse.status} ${notifResponse.statusText}`)
  } catch (error) {
    console.log(`   Notifications Service: ERROR - ${error.message}`)
  }

  // Test Analytics Service
  console.log('5. Testing Analytics Service...')
  try {
    const analyticsResponse = await fetch(`${PRODUCTION_URL}/api/analytics/metrics`)
    console.log(`   Analytics Service: ${analyticsResponse.status} ${analyticsResponse.statusText}`)
  } catch (error) {
    console.log(`   Analytics Service: ERROR - ${error.message}`)
  }

  console.log('\n✅ Service testing complete!')
}

testServices()