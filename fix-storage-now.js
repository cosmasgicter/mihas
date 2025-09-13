#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function quickFix() {
  console.log('🔧 Quick Storage Fix - Checking and creating missing buckets...\n')
  
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return false
    }
    
    console.log('📦 Current buckets:')
    buckets?.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
    })
    
    const existingBucketNames = buckets?.map(b => b.name) || []
    
    if (!existingBucketNames.includes('app_docs')) {
      console.log('\n📦 Creating missing app_docs bucket...')
      
      const { error: createError } = await supabase.storage.createBucket('app_docs', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png', 
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 10485760
      })
      
      if (createError) {
        if (createError.message.includes('already exists')) {
          console.log('✅ app_docs bucket already exists (race condition)')
        } else {
          console.error('❌ Error creating app_docs bucket:', createError.message)
          return false
        }
      } else {
        console.log('✅ app_docs bucket created successfully')
      }
    } else {
      console.log('\n✅ app_docs bucket already exists')
    }
    
    console.log('\n🧪 Quick functionality test...')
    const testContent = 'Storage test file'
    const testFileName = `test-${Date.now()}.txt`
    
    const { error: uploadError } = await supabase.storage
      .from('app_docs')
      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }))
    
    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message)
      return false
    }
    
    console.log('✅ Upload test passed')
    
    await supabase.storage.from('app_docs').remove([testFileName])
    console.log('✅ Cleanup completed')
    
    console.log('\n🎉 Storage is working correctly!')
    console.log('\n💡 Available buckets for your app:')
    console.log('  - app_docs (public) - for general documents')
    console.log('  - documents (public) - for public documents')
    console.log('  - application-documents (private) - for sensitive application docs')
    
    return true
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error.message)
    return false
  }
}

quickFix()
  .then(success => {
    if (success) {
      console.log('\n✅ All done! Your storage is ready to use.')
      process.exit(0)
    } else {
      console.log('\n❌ Fix failed. Please check the errors above.')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  })