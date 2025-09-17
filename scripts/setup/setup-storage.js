#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupStorage() {
  try {
    console.log('Checking for app_docs bucket...')
    
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError.message)
      return
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'app_docs')
    
    if (bucketExists) {
      console.log('✅ app_docs bucket already exists')
      return
    }
    
    console.log('Creating app_docs bucket...')
    
    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket('app_docs', {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      fileSizeLimit: 10485760 // 10MB
    })
    
    if (createError) {
      console.error('Error creating bucket:', createError.message)
      return
    }
    
    console.log('✅ app_docs bucket created successfully')
    
  } catch (error) {
    console.error('Setup failed:', error.message)
  }
}

setupStorage()