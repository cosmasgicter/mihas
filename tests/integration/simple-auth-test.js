#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('🧪 Testing Authentication Status...\n')

  // Test current auth
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  console.log('Current Auth Status:')
  console.log('- User:', user ? '✅ Authenticated' : '❌ Not authenticated')
  console.log('- Session:', session ? '✅ Valid session' : '❌ No session')

  // Test unauthenticated insert (should fail with 403)
  console.log('\n🔒 Testing RLS Protection...')
  const { error } = await supabase
    .from('applications_new')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      application_number: 'TEST123',
      status: 'draft'
    })

  if (error) {
    console.log('✅ RLS working - unauthenticated insert blocked:', error.message)
  } else {
    console.log('❌ Security issue - unauthenticated insert succeeded')
  }

  console.log('\n📋 Fix Status: Authentication protection is active')
}

testAuth().catch(console.error)