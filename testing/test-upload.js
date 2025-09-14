#!/usr/bin/env node

import { uploadFile, STORAGE_CONFIGS } from './src/lib/storage.js'
import { readFileSync } from 'fs'

async function testUpload() {
  console.log('🧪 Testing storage upload functionality...\n')
  
  try {
    // Create a test file
    const testContent = 'This is a test document for storage validation'
    const testFile = new File([testContent], 'test-document.txt', { type: 'text/plain' })
    
    console.log('📤 Testing upload to documents bucket...')
    const result1 = await uploadFile(testFile, STORAGE_CONFIGS.documents)
    console.log('Result:', result1.success ? '✅ Success' : '❌ Failed:', result1.error)
    
    console.log('📤 Testing upload to application-documents bucket...')
    const result2 = await uploadFile(testFile, STORAGE_CONFIGS.applicationDocuments)
    console.log('Result:', result2.success ? '✅ Success' : '❌ Failed:', result2.error)
    
    console.log('📤 Testing upload to app_docs bucket...')
    const result3 = await uploadFile(testFile, STORAGE_CONFIGS.appDocs)
    console.log('Result:', result3.success ? '✅ Success' : '❌ Failed:', result3.error)
    
    console.log('\n🎯 Storage test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUpload()