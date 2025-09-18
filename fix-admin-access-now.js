import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from .env file
let supabaseUrl, supabaseServiceKey
try {
  const envContent = readFileSync('.env', 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAdminAccess() {
  try {
    console.log('🔧 Fixing Admin Access...')
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }
    
    console.log(`📋 Found ${users.users.length} users`)
    
    for (const user of users.users) {
      console.log(`\n👤 Processing user: ${user.email}`)
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.log('⚠️ Profile error:', profileError.message)
        continue
      }
      
      if (!profile) {
        console.log('📝 Creating profile...')
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            email: user.email,
            role: user.email === 'cosmas@beanola.com' ? 'super_admin' : 'admin'
          })
        
        if (createError) {
          console.error('❌ Error creating profile:', createError.message)
        } else {
          console.log('✅ Profile created')
        }
      } else {
        console.log('📋 Profile exists, role:', profile.role)
        
        // Update role if needed
        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
          const newRole = user.email === 'cosmas@beanola.com' ? 'super_admin' : 'admin'
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ role: newRole })
            .eq('user_id', user.id)
          
          if (updateError) {
            console.error('❌ Error updating role:', updateError.message)
          } else {
            console.log(`✅ Role updated to: ${newRole}`)
          }
        }
      }
      
      // Check/create user role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (roleError && roleError.code === 'PGRST116') {
        console.log('📝 Creating user role...')
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: user.email === 'cosmas@beanola.com' ? 'super_admin' : 'admin',
            permissions: ['*'],
            is_active: true
          })
        
        if (createRoleError) {
          console.error('❌ Error creating user role:', createRoleError.message)
        } else {
          console.log('✅ User role created')
        }
      } else if (!roleError) {
        console.log('📋 User role exists:', userRole.role)
      }
    }
    
    console.log('\n🎉 Admin access fix completed!')
    
  } catch (error) {
    console.error('❌ Fix error:', error.message)
  }
}

fixAdminAccess()