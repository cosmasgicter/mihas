#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_FILES = [
  {
    name: 'test-document.pdf',
    path: join(__dirname, 'tests/fixtures/result-slip.pdf'),
    mimeType: 'application/pdf'
  },
  {
    name: 'test-image.jpg',
    path: join(__dirname, 'tests/fixtures/proof-of-payment.jpg'),
    mimeType: 'image/jpeg'
  }
]

const BUCKETS_TO_TEST = ['app_docs', 'documents', 'application-documents']

async function testFileUpload(bucketName, file) {
  console.log(`📤 Testing upload to '${bucketName}' with ${file.name}...`)
  
  try {
    const fileBuffer = readFileSync(file.path)
    const fileName = `test-${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.mimeType,
        upsert: false
      })
    
    if (error) {
      console.error(`❌ Upload failed: ${error.message}`)
      return { success: false, fileName: null }
    }
    
    console.log(`✅ Upload successful: ${data.path}`)
    return { success: true, fileName: data.path }
  } catch (error) {
    console.error(`❌ Upload error: ${error.message}`)
    return { success: false, fileName: null }
  }
}

async function testFileDownload(bucketName, fileName) {
  console.log(`📥 Testing download from '${bucketName}' for ${fileName}...`)
  
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName)
    
    if (error) {
      console.error(`❌ Download failed: ${error.message}`)
      return false
    }
    
    console.log(`✅ Download successful: ${data.size} bytes`)
    return true
  } catch (error) {
    console.error(`❌ Download error: ${error.message}`)
    return false
  }
}

async function testPublicUrl(bucketName, fileName) {
  console.log(`🔗 Testing public URL for '${bucketName}/${fileName}'...`)
  
  try {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)
    
    if (data.publicUrl) {
      console.log(`✅ Public URL generated: ${data.publicUrl}`)
      return true
    } else {
      console.error(`❌ Failed to generate public URL`)
      return false
    }
  } catch (error) {
    console.error(`❌ Public URL error: ${error.message}`)
    return false
  }
}

async function testFileDelete(bucketName, fileName) {
  console.log(`🗑️ Testing delete from '${bucketName}' for ${fileName}...`)
  
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName])
    
    if (error) {
      console.error(`❌ Delete failed: ${error.message}`)
      return false
    }
    
    console.log(`✅ Delete successful`)
    return true
  } catch (error) {
    console.error(`❌ Delete error: ${error.message}`)
    return false
  }
}

async function testBucketPermissions(bucketName) {
  console.log(`🔐 Testing permissions for '${bucketName}'...`)
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucket = buckets?.find(b => b.name === bucketName)
    
    if (!bucket) {
      console.error(`❌ Bucket '${bucketName}' not found`)
      return false
    }
    
    console.log(`✅ Bucket '${bucketName}' is ${bucket.public ? 'public' : 'private'}`)
    return true
  } catch (error) {
    console.error(`❌ Permission check error: ${error.message}`)
    return false
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Starting comprehensive storage tests...\n')
  
  const results = {
    buckets: {},
    overall: true
  }
  
  for (const bucketName of BUCKETS_TO_TEST) {
    console.log(`\n📦 Testing bucket: ${bucketName}`)
    console.log('='.repeat(50))
    
    results.buckets[bucketName] = {
      permissions: false,
      uploads: [],
      downloads: [],
      publicUrls: [],
      deletes: []
    }
    
    // Test permissions
    results.buckets[bucketName].permissions = await testBucketPermissions(bucketName)
    
    // Test file operations
    for (const file of TEST_FILES) {
      const uploadResult = await testFileUpload(bucketName, file)
      results.buckets[bucketName].uploads.push(uploadResult.success)
      
      if (uploadResult.success && uploadResult.fileName) {
        // Test download
        const downloadSuccess = await testFileDownload(bucketName, uploadResult.fileName)
        results.buckets[bucketName].downloads.push(downloadSuccess)
        
        // Test public URL
        const publicUrlSuccess = await testPublicUrl(bucketName, uploadResult.fileName)
        results.buckets[bucketName].publicUrls.push(publicUrlSuccess)
        
        // Test delete
        const deleteSuccess = await testFileDelete(bucketName, uploadResult.fileName)
        results.buckets[bucketName].deletes.push(deleteSuccess)
      }
    }
  }
  
  // Generate report
  console.log('\n📊 Test Results Summary')
  console.log('='.repeat(50))
  
  for (const [bucketName, bucketResults] of Object.entries(results.buckets)) {
    const uploadSuccess = bucketResults.uploads.every(Boolean)
    const downloadSuccess = bucketResults.downloads.every(Boolean)
    const publicUrlSuccess = bucketResults.publicUrls.every(Boolean)
    const deleteSuccess = bucketResults.deletes.every(Boolean)
    
    const bucketOverall = bucketResults.permissions && uploadSuccess && downloadSuccess && publicUrlSuccess && deleteSuccess
    
    console.log(`\n${bucketName}:`)
    console.log(`  Permissions: ${bucketResults.permissions ? '✅' : '❌'}`)
    console.log(`  Uploads: ${uploadSuccess ? '✅' : '❌'} (${bucketResults.uploads.filter(Boolean).length}/${bucketResults.uploads.length})`)
    console.log(`  Downloads: ${downloadSuccess ? '✅' : '❌'} (${bucketResults.downloads.filter(Boolean).length}/${bucketResults.downloads.length})`)
    console.log(`  Public URLs: ${publicUrlSuccess ? '✅' : '❌'} (${bucketResults.publicUrls.filter(Boolean).length}/${bucketResults.publicUrls.length})`)
    console.log(`  Deletes: ${deleteSuccess ? '✅' : '❌'} (${bucketResults.deletes.filter(Boolean).length}/${bucketResults.deletes.length})`)
    console.log(`  Overall: ${bucketOverall ? '✅ PASS' : '❌ FAIL'}`)
    
    if (!bucketOverall) results.overall = false
  }
  
  console.log(`\n🎯 Final Result: ${results.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  if (!results.overall) {
    console.log('\n💡 Troubleshooting Tips:')
    console.log('  - Check RLS policies on storage.objects table')
    console.log('  - Verify bucket permissions and MIME type restrictions')
    console.log('  - Ensure your Supabase project has storage enabled')
    console.log('  - Check file size limits (current limit: 10MB)')
  }
  
  return results.overall
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('❌ Test suite failed:', error.message)
      process.exit(1)
    })
}

export { runComprehensiveTest }