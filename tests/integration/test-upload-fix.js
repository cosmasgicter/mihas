#!/usr/bin/env node

// Simple test to verify file upload functionality
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseKey = 'sbp_a5d15dd3cf175a5b7fd47009861eca8794ead455'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpload() {
  console.log('🧪 Testing file upload functionality...\n')
  
  try {
    // Create a test file
    const testContent = 'This is a test document for upload validation'
    const testFile = new File([testContent], 'test-document.pdf', { type: 'application/pdf' })
    
    console.log('📤 Testing upload to app_docs bucket...')
    
    const fileName = `test/${Date.now()}-test-document.pdf`
    
    const { data, error } = await supabase.storage
      .from('app_docs')
      .upload(fileName, testFile, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (error) {
      console.log('❌ Upload failed:', error.message)
      
      // Try creating the bucket
      console.log('🔧 Attempting to create app_docs bucket...')
      const { error: createError } = await supabase.storage.createBucket('app_docs', {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        fileSizeLimit: 10485760 // 10MB
      })
      
      if (createError) {
        console.log('❌ Bucket creation failed:', createError.message)
      } else {
        console.log('✅ Bucket created successfully')
        
        // Try upload again
        const { data: retryData, error: retryError } = await supabase.storage
          .from('app_docs')
          .upload(fileName, testFile, {
            contentType: 'application/pdf',
            upsert: true
          })
        
        if (retryError) {
          console.log('❌ Retry upload failed:', retryError.message)
        } else {
          console.log('✅ Upload successful after bucket creation')
          console.log('📁 File path:', retryData.path)
        }
      }
    } else {
      console.log('✅ Upload successful')
      console.log('📁 File path:', data.path)
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('app_docs')
        .getPublicUrl(data.path)
      
      console.log('🔗 Public URL:', urlData.publicUrl)
    }
    
    console.log('\n🎯 Upload test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUpload()