#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAdminUser() {
  console.log('🔍 Checking for admin users...')
  
  try {
    // List all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Failed to list users:', usersError.message)
      return
    }
    
    console.log(`📊 Found ${users.users.length} users:`)
    users.users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`)
    })
    
    // Check for cosmas@beanola.com
    const adminUser = users.users.find(user => user.email === 'cosmas@beanola.com')
    
    if (!adminUser) {
      console.log('\n❌ Admin user cosmas@beanola.com not found')
      console.log('🔧 Creating admin user...')
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'cosmas@beanola.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Cosmas Admin',
          role: 'super_admin'
        }
      })
      
      if (createError) {
        console.error('❌ Failed to create admin user:', createError.message)
        return
      }
      
      console.log('✅ Admin user created:', newUser.user.email)
      
      // Create profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.user.id,
          full_name: 'Cosmas Admin',
          email: 'cosmas@beanola.com',
          role: 'super_admin'
        })
      
      if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message)
      } else {
        console.log('✅ Profile created')
      }
      
      // Create role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: 'super_admin',
          permissions: ['*'],
          is_active: true
        })
      
      if (roleError) {
        console.error('❌ Failed to create role:', roleError.message)
      } else {
        console.log('✅ Role created')
      }
      
    } else {
      console.log('\n✅ Admin user found:', adminUser.email)
      
      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', adminUser.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile not found, creating...')
        const { error: createProfileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: adminUser.id,
            full_name: 'Cosmas Admin',
            email: 'cosmas@beanola.com',
            role: 'super_admin'
          })
        
        if (createProfileError) {
          console.error('❌ Failed to create profile:', createProfileError.message)
        } else {
          console.log('✅ Profile created')
        }
      } else {
        console.log('✅ Profile exists:', profile.full_name, profile.role)
      }
      
      // Check role
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', adminUser.id)
        .eq('is_active', true)
        .single()
      
      if (roleError) {
        console.error('❌ Role not found, creating...')
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: adminUser.id,
            role: 'super_admin',
            permissions: ['*'],
            is_active: true
          })
        
        if (createRoleError) {
          console.error('❌ Failed to create role:', createRoleError.message)
        } else {
          console.log('✅ Role created')
        }
      } else {
        console.log('✅ Role exists:', role.role)
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkAdminUser()