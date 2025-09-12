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

async function quickFix() {
  console.log('🔧 Quick Storage Fix - Checking and creating missing buckets...\n')
  
  try {
    // List existing buckets
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
    
    // Check if app_docs exists
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
        ],\n        fileSizeLimit: 10485760 // 10MB\n      })\n      \n      if (createError) {\n        if (createError.message.includes('already exists')) {\n          console.log('✅ app_docs bucket already exists (race condition)')\n        } else {\n          console.error('❌ Error creating app_docs bucket:', createError.message)\n          return false\n        }\n      } else {\n        console.log('✅ app_docs bucket created successfully')\n      }\n    } else {\n      console.log('\\n✅ app_docs bucket already exists')\n    }\n    \n    // Quick test\n    console.log('\\n🧪 Quick functionality test...')\n    const testContent = 'Storage test file'\n    const testFileName = `test-${Date.now()}.txt`\n    \n    const { error: uploadError } = await supabase.storage\n      .from('app_docs')\n      .upload(testFileName, new Blob([testContent], { type: 'text/plain' }))\n    \n    if (uploadError) {\n      console.error('❌ Upload test failed:', uploadError.message)\n      return false\n    }\n    \n    console.log('✅ Upload test passed')\n    \n    // Clean up\n    await supabase.storage.from('app_docs').remove([testFileName])\n    console.log('✅ Cleanup completed')\n    \n    console.log('\\n🎉 Storage is working correctly!')\n    console.log('\\n💡 Available buckets for your app:')\n    console.log('  - app_docs (public) - for general documents')\n    console.log('  - documents (public) - for public documents')\n    console.log('  - application-documents (private) - for sensitive application docs')\n    \n    return true\n    \n  } catch (error) {\n    console.error('❌ Quick fix failed:', error.message)\n    return false\n  }\n}\n\nquickFix()\n  .then(success => {\n    if (success) {\n      console.log('\\n✅ All done! Your storage is ready to use.')\n      process.exit(0)\n    } else {\n      console.log('\\n❌ Fix failed. Please check the errors above.')\n      process.exit(1)\n    }\n  })\n  .catch(error => {\n    console.error('❌ Unexpected error:', error.message)\n    process.exit(1)\n  })