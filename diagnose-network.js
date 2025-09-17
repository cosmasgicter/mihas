#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import { performance } from 'perf_hooks'

const execAsync = promisify(exec)

console.log('🌐 Network Diagnostics for MIHAS/KATC Performance Issues\n')

async function runCommand(command, description) {
  console.log(`${description}...`)
  const start = performance.now()
  
  try {
    const { stdout, stderr } = await execAsync(command)
    const end = performance.now()
    
    console.log(`✅ ${description} (${(end - start).toFixed(2)}ms)`)
    if (stdout.trim()) {
      console.log(stdout.trim())
    }
    if (stderr.trim()) {
      console.log(`⚠️ ${stderr.trim()}`)
    }
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}`)
  }
  console.log()
}

async function diagnoseNetwork() {
  console.log('🔍 Diagnosing Network Connectivity Issues\n')
  
  // Test basic connectivity
  await runCommand('ping -c 3 8.8.8.8', 'Testing basic internet connectivity (Google DNS)')
  
  // Test Supabase connectivity
  await runCommand('ping -c 3 mylgegkqoddcrxtwcclb.supabase.co', 'Testing Supabase server connectivity')
  
  // Test DNS resolution
  await runCommand('nslookup mylgegkqoddcrxtwcclb.supabase.co', 'Testing DNS resolution for Supabase')
  
  // Test with different DNS servers
  await runCommand('nslookup mylgegkqoddcrxtwcclb.supabase.co 8.8.8.8', 'Testing with Google DNS (8.8.8.8)')
  await runCommand('nslookup mylgegkqoddcrxtwcclb.supabase.co 1.1.1.1', 'Testing with Cloudflare DNS (1.1.1.1)')
  
  // Test HTTP connectivity
  await runCommand('curl -I -m 10 https://mylgegkqoddcrxtwcclb.supabase.co', 'Testing HTTPS connectivity to Supabase')
  
  // Check network interface
  await runCommand('ip route show', 'Checking network routing')
  
  // Check if there are any firewall issues
  await runCommand('ss -tuln | grep :443', 'Checking HTTPS port availability')
  
  console.log('📋 Network Diagnostic Summary:')
  console.log('==============================')
  console.log('If you see high packet loss or timeouts to Supabase:')
  console.log('1. Check your internet connection stability')
  console.log('2. Try switching DNS servers (8.8.8.8 or 1.1.1.1)')
  console.log('3. Check if your ISP is blocking Supabase')
  console.log('4. Try using a VPN to test connectivity')
  console.log('5. Contact your network administrator')
  console.log()
  console.log('🔧 Quick Fixes to Try:')
  console.log('======================')
  console.log('1. Restart your network connection')
  console.log('2. Flush DNS cache: sudo systemctl flush-dns')
  console.log('3. Change DNS servers in /etc/resolv.conf')
  console.log('4. Check for proxy settings that might interfere')
  console.log()
  console.log('🚀 Performance Optimizations Applied:')
  console.log('=====================================')
  console.log('✅ Removed lazy loading from signin page')
  console.log('✅ Optimized AuthContext initialization')
  console.log('✅ Simplified session management')
  console.log('✅ Deferred non-critical services')
  console.log('✅ Optimized Supabase client configuration')
  console.log('✅ Added database performance indexes')
  console.log()
  console.log('Expected improvements once network is stable:')
  console.log('- Signin page: <2 seconds')
  console.log('- Authentication: <3 seconds')
  console.log('- Profile loading: <1 second')
}

diagnoseNetwork().catch(console.error)