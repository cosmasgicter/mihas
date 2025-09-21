#!/usr/bin/env node

require('dotenv').config()
const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:8888'
const STUDENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjE1ZTkxenVweDltUlBkU00iLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL215bGdlZ2txb2RkY3J4dHdjY2xiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2ZTE0N2VhZC1lMzRkLTQxZTItYmMwNS0zNThhNjUzZmY2MzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NDYxNDk2LCJpYXQiOjE3NTg0NTc4OTYsImVtYWlsIjoiY29zbWFza2FuY2hlcGE4QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJjb3NtYXNrYW5jaGVwYThAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IlNvbG9tb24gTmdvbWEiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInNpZ251cF9kYXRhIjoie1wiZW1haWxcIjpcImNvc21hc2thbmNoZXBhOEBnbWFpbC5jb21cIixcInBhc3N3b3JkXCI6XCJCZWFub2xhMjAyNVwiLFwiZnVsbF9uYW1lXCI6XCJTb2xvbW9uIE5nb21hXCIsXCJwaG9uZVwiOlwiKzI2MDk2NjIyMjk5OVwiLFwiZGF0ZV9vZl9iaXJ0aFwiOlwiMjAwNi0wMS0wMlwiLFwiZ2VuZGVyXCI6XCJNYWxlXCIsXCJuYXRpb25hbGl0eVwiOlwiWmFtYmlhblwiLFwiYWRkcmVzc1wiOlwiMTgyLzQ5XFxuT0ZGIE1BSU4gUk9BRFxcblZBTExFWSBWSUVXXCIsXCJjaXR5XCI6XCJMVVNBS0FcIixcImNvdW50cnlcIjpcIlphbWJpYVwiLFwiZW1lcmdlbmN5X2NvbnRhY3RfbmFtZVwiOlwiV0lMTElBTSBaVUxVXCIsXCJlbWVyZ2VuY3lfY29udGFjdF9waG9uZVwiOlwiMDk3NzU2MjA0N1wifSIsInN1YiI6IjZlMTQ3ZWFkLWUzNGQtNDFlMi1iYzA1LTM1OGE2NTNmZjYzMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU4NDU3ODk2fV0sInNlc3Npb25faWQiOiI3NzE3NmNjMC1mMmY5LTQxNWQtODY3Ny1lNmVmZDM1OGI5MDEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.BdxBpprLh8UPczaRGLr56L703SDQw9Dke6fCqR-_OXU'

async function testApplicationCreation() {
  console.log('🧪 Testing Application Creation Fix...')
  
  const response = await fetch(`${BASE_URL}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STUDENT_TOKEN}`
    },
    body: JSON.stringify({
      full_name: 'Test Student Fixed',
      nrc_number: '999999/99/9',
      date_of_birth: '2000-01-01',
      sex: 'Male',
      phone: '+260977999999',
      email: 'test@example.com',
      residence_town: 'Lusaka',
      program: 'Diploma in Registered Nursing',
      intake: '2025 Intake',
      institution: 'MIHAS'
    })
  })
  
  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Application creation FIXED!')
    return data.id
  } else {
    console.log('❌ Application creation still failing:', data.error)
    return null
  }
}

async function testNotificationConsent() {
  console.log('🧪 Testing Notification Consent Fix...')
  
  const response = await fetch(`${BASE_URL}/api/notifications/update-consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STUDENT_TOKEN}`
    },
    body: JSON.stringify({
      channel: 'sms',
      action: 'opt_in',
      source: 'api_test'
    })
  })
  
  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Notification consent FIXED!')
  } else {
    console.log('❌ Notification consent still failing:', data.error)
  }
}

async function runTests() {
  console.log('🚀 Testing Critical Fixes...\n')
  
  const applicationId = await testApplicationCreation()
  await testNotificationConsent()
  
  console.log('\n🎯 Fix Test Summary:')
  console.log('- Application Creation: ' + (applicationId ? '✅ WORKING' : '❌ STILL BROKEN'))
  console.log('- Notification Consent: Testing completed')
  
  if (applicationId) {
    console.log('\n🎉 Critical fixes appear to be working!')
    console.log('Application ID created:', applicationId)
  }
}

runTests().catch(console.error)