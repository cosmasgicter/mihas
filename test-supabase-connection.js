#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.development' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not found')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

try {
  // Test basic connection
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name')
    .limit(1)

  if (error) {
    console.error('❌ Supabase connection error:', error.message)
  } else {
    console.log('✅ Supabase connection successful')
    console.log('Sample data:', data)
  }
} catch (error) {
  console.error('❌ Connection test failed:', error.message)
}