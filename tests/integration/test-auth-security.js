// Test script to verify authSecurity import and functionality
import { authSecurity } from './src/lib/authSecurity.ts'

console.log('Testing authSecurity import...')

if (authSecurity) {
  console.log('✅ authSecurity imported successfully')
  console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authSecurity)))
} else {
  console.log('❌ authSecurity is undefined')
}

// Test basic functionality
try {
  const result = await authSecurity.validateAuth()
  console.log('✅ validateAuth method callable')
} catch (error) {
  console.log('⚠️ validateAuth error (expected if no session):', error.message)
}