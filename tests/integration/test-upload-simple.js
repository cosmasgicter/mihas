#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUpload() {
  console.log('🧪 Testing file upload functionality...')
  
  // Create a simple test file
  const testContent = 'This is a test file for upload verification'
  const testFile = new Blob([testContent], { type: 'text/plain' })
  const fileName = `test-upload-${Date.now()}.txt`
  
  try {
    // Test upload to app_docs bucket
    console.log('📤 Testing upload to app_docs bucket...')
    
    const { data, error } = await supabase.storage
      .from('app_docs')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('❌ Upload failed:', error.message)
      return false
    }
    
    console.log('✅ Upload successful:', data.path)
    
    // Test public URL generation
    console.log('🔗 Testing public URL generation...')
    const { data: { publicUrl } } = supabase.storage
      .from('app_docs')
      .getPublicUrl(fileName)
    
    console.log('✅ Public URL generated:', publicUrl)
    
    // Clean up - delete test file
    console.log('🗑️ Cleaning up test file...')
    const { error: deleteError } = await supabase.storage
      .from('app_docs')
      .remove([fileName])
    
    if (deleteError) {
      console.warn('⚠️ Cleanup failed:', deleteError.message)
    } else {
      console.log('✅ Cleanup successful')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Test bucket access
async function testBucketAccess() {
  console.log('🔐 Testing bucket access...')
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Failed to list buckets:', error.message)
      return false
    }
    
    console.log('📦 Available buckets:')
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
    
    const appDocsBucket = buckets.find(b => b.name === 'app_docs')
    if (!appDocsBucket) {
      console.error('❌ app_docs bucket not found')
      return false
    }
    
    console.log('✅ app_docs bucket found and accessible')
    return true
    
  } catch (error) {
    console.error('❌ Bucket access test failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting upload functionality tests...\n')
  
  const bucketTest = await testBucketAccess()
  console.log('')
  
  const uploadTest = await testUpload()
  console.log('')
  
  const allPassed = bucketTest && uploadTest
  
  console.log('📊 Test Results:')
  console.log(`  Bucket Access: ${bucketTest ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  File Upload: ${uploadTest ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  if (!allPassed) {
    console.log('\n💡 If tests are failing:')
    console.log('  1. Check your .env file has correct Supabase credentials')
    console.log('  2. Verify the app_docs bucket exists in your Supabase project')
    console.log('  3. Check RLS policies allow uploads to storage.objects')
    console.log('  4. Ensure your Supabase project has storage enabled')
  }
  
  return allPassed
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Test suite crashed:', error.message)
    process.exit(1)
  })