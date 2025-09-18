import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from .env file
let supabaseUrl, supabaseAnonKey
try {
  const envContent = readFileSync('.env', 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixAdminAccess() {
  try {
    console.log('🔧 Fixing Admin Access (Simple Method)...')
    
    // First, let's check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message)
      return
    }
    
    if (!session) {
      console.log('❌ No active session. Please log in first.')
      return
    }
    
    console.log('✅ Active session found for:', session.user.email)
    
    // Check current profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    
    if (profileError) {
      console.log('⚠️ Profile error:', profileError.message)
      
      // Create profile if it doesn't exist
      console.log('📝 Creating admin profile...')
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          email: session.user.email,
          role: 'admin'
        })
      
      if (createError) {
        console.error('❌ Error creating profile:', createError.message)
      } else {
        console.log('✅ Admin profile created successfully!')
      }
    } else {
      console.log('📋 Current profile role:', profile.role)
      
      // Update role to admin if not already
      if (profile.role !== 'admin' && profile.role !== 'super_admin') {
        console.log('🔄 Updating role to admin...')
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role: 'admin' })
          .eq('user_id', session.user.id)
        
        if (updateError) {
          console.error('❌ Error updating role:', updateError.message)
        } else {
          console.log('✅ Role updated to admin successfully!')
        }
      } else {
        console.log('✅ User already has admin role')
      }
    }
    
    console.log('\n🎉 Admin access fix completed! Please refresh your browser.')
    
  } catch (error) {
    console.error('❌ Fix error:', error.message)
  }
}

fixAdminAccess()