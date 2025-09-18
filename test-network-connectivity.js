#!/usr/bin/env node

/**
 * Network Connectivity Test
 * Tests various aspects of network connectivity to Supabase
 */

const { performance } = require('perf_hooks')

console.log('🌐 Testing Network Connectivity to Supabase...\n')

const SUPABASE_URL = 'https://mylgegkqoddcrxtwcclb.supabase.co'

async function testEndpoint(url, description, timeout = 5000) {
  const start = performance.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    const duration = performance.now() - start
    
    if (response.ok) {
      console.log(`✅ ${description}: ${duration.toFixed(2)}ms`)
      return { success: true, duration }
    } else {
      console.log(`❌ ${description}: HTTP ${response.status} (${duration.toFixed(2)}ms)`)
      return { success: false, duration, status: response.status }
    }
  } catch (error) {
    const duration = performance.now() - start
    console.log(`❌ ${description}: ${error.message} (${duration.toFixed(2)}ms)`)
    return { success: false, duration, error: error.message }
  }
}

async function runTests() {
  console.log('Testing connectivity to:', SUPABASE_URL)
  console.log('=' .repeat(60))
  
  const tests = [
    { url: `${SUPABASE_URL}/rest/v1/`, desc: 'REST API Health Check', timeout: 8000 },
    { url: `${SUPABASE_URL}/auth/v1/health`, desc: 'Auth API Health Check', timeout: 8000 },
    { url: `${SUPABASE_URL}/storage/v1/`, desc: 'Storage API Health Check', timeout: 8000 },
    { url: 'https://www.google.com', desc: 'Google (Internet Test)', timeout: 5000 },
    { url: 'https://api.github.com', desc: 'GitHub API (HTTPS Test)', timeout: 5000 }
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await testEndpoint(test.url, test.desc, test.timeout)
    results.push({ ...test, ...result })
  }
  
  console.log('\n📊 Summary:')
  console.log('=' .repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`)
  console.log(`❌ Failed: ${failed.length}/${results.length}`)
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    console.log(`⏱️  Average response time: ${avgDuration.toFixed(2)}ms`)
  }
  
  console.log('\n🔍 Diagnosis:')
  console.log('=' .repeat(60))
  
  const supabaseTests = results.filter(r => r.url.includes('supabase.co'))
  const internetTests = results.filter(r => !r.url.includes('supabase.co'))
  
  const supabaseWorking = supabaseTests.some(r => r.success)
  const internetWorking = internetTests.some(r => r.success)
  
  if (!internetWorking) {
    console.log('❌ No internet connectivity detected')
    console.log('   → Check your network connection')
    console.log('   → Verify DNS settings')
  } else if (!supabaseWorking) {
    console.log('❌ Supabase connectivity issues detected')
    console.log('   → Supabase servers may be unreachable from your location')
    console.log('   → Try using a VPN to test from different location')
    console.log('   → Check if firewall/antivirus is blocking supabase.co')
    console.log('   → Consider using mobile hotspot to test different network')
  } else {
    const slowTests = supabaseTests.filter(r => r.success && r.duration > 3000)
    if (slowTests.length > 0) {
      console.log('⚠️  Slow Supabase connectivity detected')
      console.log('   → Network latency is high to Supabase servers')
      console.log('   → This explains the 20-second login delay')
      console.log('   → Consider optimizing for slow connections')
    } else {
      console.log('✅ Supabase connectivity appears normal')
      console.log('   → The login delay may be caused by other factors')
      console.log('   → Check browser developer tools for more details')
    }
  }
  
  console.log('\n💡 Recommendations:')
  console.log('=' .repeat(60))
  console.log('1. Clear browser cache and localStorage')
  console.log('2. Try logging in from an incognito/private window')
  console.log('3. Test from a different network (mobile hotspot)')
  console.log('4. Check browser developer tools → Network tab during login')
  console.log('5. Temporarily disable antivirus/firewall to test')
  console.log('6. Try using a VPN if regional connectivity issues exist')
}

runTests().catch(console.error)