#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔐 Testing Login Performance\n')

async function testLogin() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Don't persist for testing
      detectSessionInUrl: false
    }
  })

  console.log('Testing with credentials:')
  console.log('Student: alexisstar8@gmail.com / Beanola2025')
  console.log('Admin: cosmas@beanola.com / Beanola2025\n')

  // Test student login
  console.log('1. Testing Student Login...')
  const studentStart = performance.now()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alexisstar8@gmail.com',
      password: 'Beanola2025'
    })
    
    const studentEnd = performance.now()
    
    if (error) {
      console.log(`   ❌ Student login failed: ${error.message} (${(studentEnd - studentStart).toFixed(2)}ms)`)
    } else {
      console.log(`   ✅ Student login successful: ${(studentEnd - studentStart).toFixed(2)}ms`)
      
      // Test profile loading
      const profileStart = performance.now()
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      const profileEnd = performance.now()
      
      if (profileError) {
        console.log(`   ⚠️  Profile loading failed: ${profileError.message} (${(profileEnd - profileStart).toFixed(2)}ms)`)
      } else {
        console.log(`   ✅ Profile loaded: ${(profileEnd - profileStart).toFixed(2)}ms`)
        console.log(`   👤 User: ${profile.full_name} (${profile.role})`)
      }
      
      await supabase.auth.signOut()
    }
  } catch (error) {
    console.log(`   ❌ Student login error: ${error.message}`)
  }

  console.log()

  // Test admin login
  console.log('2. Testing Admin Login...')
  const adminStart = performance.now()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'Beanola2025'
    })
    
    const adminEnd = performance.now()
    
    if (error) {
      console.log(`   ❌ Admin login failed: ${error.message} (${(adminEnd - adminStart).toFixed(2)}ms)`)
    } else {
      console.log(`   ✅ Admin login successful: ${(adminEnd - adminStart).toFixed(2)}ms`)
      
      // Test profile loading
      const profileStart = performance.now()
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      const profileEnd = performance.now()
      
      if (profileError) {
        console.log(`   ⚠️  Profile loading failed: ${profileError.message} (${(profileEnd - profileStart).toFixed(2)}ms)`)
      } else {
        console.log(`   ✅ Profile loaded: ${(profileEnd - profileStart).toFixed(2)}ms`)
        console.log(`   👤 User: ${profile.full_name} (${profile.role})`)
      }
      
      // Test role loading
      const roleStart = performance.now()
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
      const roleEnd = performance.now()
      
      if (roleError) {
        console.log(`   ⚠️  Role loading failed: ${roleError.message} (${(roleEnd - roleStart).toFixed(2)}ms)`)
      } else {
        console.log(`   ✅ Roles loaded: ${(roleEnd - roleStart).toFixed(2)}ms`)
        if (roles && roles.length > 0) {
          console.log(`   🔑 Roles: ${roles.map(r => r.role).join(', ')}`)
        }
      }
      
      await supabase.auth.signOut()
    }
  } catch (error) {
    console.log(`   ❌ Admin login error: ${error.message}`)
  }

  console.log('\n📊 Performance Analysis:')
  console.log('========================')
  console.log('✅ Optimizations Applied:')
  console.log('   - Removed lazy loading from signin page')
  console.log('   - Simplified AuthContext initialization')
  console.log('   - Optimized Supabase client configuration')
  console.log('   - Deferred non-critical services')
  console.log('   - Simplified session management')
  console.log('\n💡 Expected Improvements:')
  console.log('   - Signin page should load in <2 seconds')
  console.log('   - Login should complete in <3 seconds')
  console.log('   - Profile loading should be <1 second')
}

testLogin().catch(console.error)