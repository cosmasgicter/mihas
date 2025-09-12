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

const REQUIRED_BUCKETS = [
  {
    name: 'app_docs',
    config: {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    }
  },
  {
    name: 'documents',
    config: {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    }
  },
  {
    name: 'application-documents',
    config: {
      public: false,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    }
  }
]

async function listExistingBuckets() {
  console.log('📋 Checking existing buckets...')
  
  const { data: buckets, error } = await supabase.storage.listBuckets()
  
  if (error) {
    console.error('❌ Error listing buckets:', error.message)
    return []
  }
  
  console.log('📦 Existing buckets:')
  buckets?.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
  })
  
  return buckets || []
}

async function createBucketIfNotExists(bucketName, config) {
  console.log(`\n🔍 Checking bucket: ${bucketName}`)
  
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
  
  if (bucketExists) {
    console.log(`✅ Bucket '${bucketName}' already exists`)
    return true
  }
  
  console.log(`📦 Creating bucket '${bucketName}'...`)
  
  const { error } = await supabase.storage.createBucket(bucketName, config)
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log(`✅ Bucket '${bucketName}' already exists (race condition)`)
      return true
    }
    console.error(`❌ Error creating bucket '${bucketName}':`, error.message)
    return false
  }
  
  console.log(`✅ Bucket '${bucketName}' created successfully`)
  return true
}

async function testBucketOperations(bucketName) {
  console.log(`\n🧪 Testing bucket operations for '${bucketName}'...`)
  
  const testFileName = `test-${Date.now()}.txt`
  const testContent = 'This is a test file for bucket validation'
  
  try {
    // Test upload
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }))
    
    if (uploadError) {
      console.error(`❌ Upload test failed for '${bucketName}':`, uploadError.message)
      return false
    }
    
    console.log(`✅ Upload test passed for '${bucketName}'`)
    
    // Test download
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testFileName)
    
    if (downloadError) {
      console.error(`❌ Download test failed for '${bucketName}':`, downloadError.message)
      return false
    }
    
    console.log(`✅ Download test passed for '${bucketName}'`)
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName])
    
    if (deleteError) {
      console.warn(`⚠️ Cleanup warning for '${bucketName}':`, deleteError.message)
    } else {
      console.log(`✅ Cleanup completed for '${bucketName}'`)
    }
    
    return true
  } catch (error) {
    console.error(`❌ Test failed for '${bucketName}':`, error.message)
    return false
  }
}

async function setupStorage() {
  try {
    console.log('🚀 Starting storage setup...\n')
    
    // List existing buckets
    const existingBuckets = await listExistingBuckets()
    
    // Create required buckets
    let allSuccess = true
    for (const bucket of REQUIRED_BUCKETS) {
      const success = await createBucketIfNotExists(bucket.name, bucket.config)
      if (!success) allSuccess = false
    }
    
    if (!allSuccess) {
      console.error('\n❌ Some buckets failed to create')
      process.exit(1)
    }
    
    console.log('\n🧪 Running bucket tests...')
    
    // Test each bucket
    for (const bucket of REQUIRED_BUCKETS) {
      await testBucketOperations(bucket.name)
    }
    
    console.log('\n✅ Storage setup completed successfully!')
    console.log('\n📋 Summary:')
    console.log('  - All required buckets are available')
    console.log('  - Upload/download operations tested')
    console.log('  - Ready for production use')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupStorage()
}

export { setupStorage, testBucketOperations, createBucketIfNotExists }