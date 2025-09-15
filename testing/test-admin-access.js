// Test script to verify admin access to applications
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAdminAccess() {
  try {
    console.log('🔍 Testing admin access to applications...')
    
    // Test 1: Check if we can fetch applications without authentication
    console.log('\n1. Testing unauthenticated access (should fail):')
    const { data: unauthData, error: unauthError } = await supabase
      .from('applications_new')
      .select('id, application_number, full_name, status')
      .limit(5)
    
    if (unauthError) {
      console.log('✅ Unauthenticated access properly blocked:', unauthError.message)
    } else {
      console.log('❌ Unauthenticated access allowed (security issue):', unauthData?.length || 0, 'records')
    }
    
    // Test 2: Sign in as admin user
    console.log('\n2. Signing in as admin user...')
    const adminEmail = process.env.TEST_ADMIN_EMAIL
    const adminPassword = process.env.TEST_ADMIN_PASSWORD
    
    if (!adminEmail || !adminPassword) {
      console.log('❌ Admin credentials not provided in environment variables (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)')
      return
    }
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })
    
    if (authError) {
      console.log('❌ Admin login failed:', authError.message)
      return
    }
    
    console.log('✅ Admin login successful:', authData.user?.email)
    
    // Test 3: Check user role
    console.log('\n3. Checking user role...')
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', authData.user.id)
      .single()
    
    if (roleError) {
      console.log('❌ Role check failed:', roleError.message)
    } else {
      console.log('✅ User role:', roleData.role, '(active:', roleData.is_active, ')')
    }
    
    // Test 4: Try to fetch applications as admin
    console.log('\n4. Testing admin access to applications...')
    const { data: adminData, error: adminError } = await supabase
      .from('applications_new')
      .select('id, application_number, full_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (adminError) {
      console.log('❌ Admin access to applications failed:', adminError.message)
    } else {
      console.log('✅ Admin access successful! Found', adminData?.length || 0, 'applications:')
      adminData?.forEach((app, index) => {
        console.log(`   ${index + 1}. ${app.application_number} - ${app.full_name} (${app.status})`)
      })
    }
    
    // Test 5: Test application stats
    console.log('\n5. Testing application statistics...')
    const { data: statsData, error: statsError } = await supabase
      .from('applications_new')
      .select('status')
    
    if (statsError) {
      console.log('❌ Stats query failed:', statsError.message)
    } else {
      const stats = statsData?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      }, {})
      console.log('✅ Application statistics:', stats)
    }
    
    console.log('\n🎉 Admin access test completed!')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testAdminAccess()