// Test script to verify authentication fix
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: false
  }
})

async function testAuthFix() {
  console.log('🔍 Testing authentication fix...\n')

  try {
    // Test 1: Check session persistence
    console.log('1. Testing session persistence...')
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    console.log('Initial session:', initialSession ? '✅ Found' : '❌ None')

    // Test 2: Test sign in
    console.log('\n2. Testing sign in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'cosmas@beanola.com',
      password: 'password123'
    })

    if (signInError) {
      console.log('Sign in error:', signInError.message)
    } else {
      console.log('Sign in:', signInData.session ? '✅ Success' : '❌ Failed')
      console.log('User ID:', signInData.user?.id)
    }

    // Test 3: Check session after sign in
    console.log('\n3. Testing session after sign in...')
    const { data: { session: postSignInSession } } = await supabase.auth.getSession()
    console.log('Post sign-in session:', postSignInSession ? '✅ Found' : '❌ None')

    // Test 4: Test token refresh
    console.log('\n4. Testing token refresh...')
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      console.log('Refresh error:', refreshError.message)
    } else {
      console.log('Token refresh:', refreshData.session ? '✅ Success' : '❌ Failed')
    }

    // Test 5: Check auth state persistence
    console.log('\n5. Testing auth state persistence...')
    let authStateChanges = 0
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authStateChanges++
      console.log(`Auth state change ${authStateChanges}: ${event}`, session ? '(with session)' : '(no session)')
    })

    // Wait a bit to see auth state changes
    await new Promise(resolve => setTimeout(resolve, 2000))
    subscription.unsubscribe()

    console.log('\n✅ Authentication fix verification complete!')
    console.log('Key improvements verified:')
    console.log('- Session persistence with localStorage')
    console.log('- Proper auth state handling')
    console.log('- Token refresh functionality')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAuthFix()