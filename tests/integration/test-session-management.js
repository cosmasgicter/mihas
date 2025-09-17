const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSessionManagement() {
  console.log('🧪 Testing Multi-Device Session Management...\n')

  try {
    // Test 1: Check if device_sessions table exists
    console.log('1️⃣ Testing database table existence...')
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'device_sessions')

    if (tableError) {
      console.error('❌ Error checking table:', tableError.message)
      return
    }

    if (tables && tables.length > 0) {
      console.log('✅ device_sessions table exists')
    } else {
      console.log('❌ device_sessions table not found')
      console.log('💡 Run: npm run session:setup')
      return
    }

    // Test 2: Check RLS policies
    console.log('\n2️⃣ Testing RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'device_sessions')

    if (policyError) {
      console.warn('⚠️ Could not verify RLS policies:', policyError.message)
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies`)
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   - ${policy.policyname} (${policy.cmd})`)
        })
      }
    }

    // Test 3: Test session operations (requires authentication)
    console.log('\n3️⃣ Testing session operations...')
    
    // Try to query device_sessions (should work if user is authenticated)
    const { data: sessions, error: sessionError } = await supabase
      .from('device_sessions')
      .select('*')
      .limit(1)

    if (sessionError) {
      if (sessionError.code === '42501') {
        console.log('✅ RLS is working (access denied for unauthenticated user)')
      } else {
        console.warn('⚠️ Session query error:', sessionError.message)
      }
    } else {
      console.log(`✅ Session query successful (found ${sessions?.length || 0} sessions)`)
    }

    // Test 4: Check cleanup function
    console.log('\n4️⃣ Testing cleanup function...')
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'cleanup_old_device_sessions')

    if (funcError) {
      console.warn('⚠️ Could not verify cleanup function:', funcError.message)
    } else if (functions && functions.length > 0) {
      console.log('✅ Cleanup function exists')
    } else {
      console.log('❌ Cleanup function not found')
    }

    console.log('\n🎉 Session management testing completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Login from multiple browsers/devices')
    console.log('3. Check Active Sessions in user settings')
    console.log('4. Verify no page hanging occurs')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Test authentication flow
async function testAuthFlow() {
  console.log('\n🔐 Testing authentication flow...')
  
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('⚠️ Auth error:', error.message)
    } else if (session) {
      console.log('✅ User is authenticated')
      console.log(`   User ID: ${session.user.id}`)
      console.log(`   Email: ${session.user.email}`)
    } else {
      console.log('ℹ️ No active session (user not logged in)')
    }
  } catch (error) {
    console.error('❌ Auth test failed:', error.message)
  }
}

// Run tests
async function runAllTests() {
  await testSessionManagement()
  await testAuthFlow()
}

runAllTests()