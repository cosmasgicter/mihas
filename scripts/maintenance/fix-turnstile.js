#!/usr/bin/env node

// Quick fix for Turnstile security verification issues

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('🔧 Fixing Turnstile Security Verification...')

// Read current .env file
const envPath = path.join(__dirname, '.env')
let envContent = fs.readFileSync(envPath, 'utf8')

// Option 1: Use Cloudflare's test site key for development
const testSiteKey = '1x00000000000000000000AA'

// Option 2: Disable Turnstile requirement temporarily
const fixes = [
  {
    name: 'Enable Test Mode',
    search: /VITE_TEST_MODE=false/g,
    replace: 'VITE_TEST_MODE=true'
  },
  {
    name: 'Use Test Site Key',
    search: /VITE_TURNSTILE_SITE_KEY=.*/g,
    replace: `VITE_TURNSTILE_SITE_KEY=${testSiteKey}`
  }
]

let applied = 0
fixes.forEach(fix => {
  if (fix.search.test(envContent)) {
    envContent = envContent.replace(fix.search, fix.replace)
    console.log(`✅ Applied: ${fix.name}`)
    applied++
  }
})

// Write updated .env file
fs.writeFileSync(envPath, envContent)

console.log(`\n🎉 Applied ${applied} fixes to resolve Turnstile issues`)
console.log('\n📋 Next steps:')
console.log('1. Restart your development server: npm run dev')
console.log('2. Try signing up again')
console.log('3. For production, get a real Turnstile site key from Cloudflare')

console.log('\n🔗 Get production Turnstile keys:')
console.log('https://dash.cloudflare.com/profile/api-tokens')