/**
 * Test script to verify KYC auto-population functionality
 * Run this in browser console after signing in
 */

// Test KYC Auto-population
async function testKYCAutoPopulation() {
  console.log('🧪 Testing KYC Auto-population...')
  
  // Check if user is signed in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ User not signed in')
    return
  }
  
  console.log('✅ User signed in:', user.email)
  console.log('📋 User metadata:', user.user_metadata)
  
  // Check profile data
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  console.log('👤 User profile:', profile)
  
  // Navigate to application wizard
  console.log('🔄 Navigate to /student/application-wizard to test auto-population')
  
  // Check what data should be auto-populated
  const expectedFields = {
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name,
    phone: profile?.phone,
    date_of_birth: profile?.date_of_birth,
    sex: profile?.sex || user.user_metadata?.sex,
    residence_town: profile?.city,
    next_of_kin_name: profile?.next_of_kin_name,
    next_of_kin_phone: profile?.next_of_kin_phone
  }
  
  console.log('📝 Expected auto-populated fields:', expectedFields)
  
  return {
    user,
    profile,
    expectedFields
  }
}

// Run test
testKYCAutoPopulation()