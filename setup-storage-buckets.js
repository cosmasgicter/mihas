#!/usr/bin/env node

// Setup script to ensure storage buckets exist
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseKey = 'sbp_a5d15dd3cf175a5b7fd47009861eca8794ead455'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupStorageBuckets() {
  console.log('🔧 Setting up storage buckets...\n')
  
  const buckets = [
    {
      name: 'app_docs',
      config: {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      }
    },
    {
      name: 'documents',
      config: {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      }
    },
    {
      name: 'application-documents',
      config: {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        fileSizeLimit: 10485760 // 10MB
      }
    }
  ]
  
  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      return
    }
    
    console.log('📋 Existing buckets:', existingBuckets.map(b => b.name).join(', '))
    
    for (const bucket of buckets) {
      const exists = existingBuckets.some(b => b.name === bucket.name)
      
      if (exists) {
        console.log(`✅ Bucket '${bucket.name}' already exists`)
      } else {
        console.log(`🔧 Creating bucket '${bucket.name}'...`)
        
        const { error: createError } = await supabase.storage.createBucket(bucket.name, bucket.config)
        
        if (createError) {
          console.log(`❌ Failed to create '${bucket.name}':`, createError.message)
        } else {
          console.log(`✅ Successfully created '${bucket.name}'`)
        }
      }
    }
    
    console.log('\n🎯 Storage setup completed!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

setupStorageBuckets()