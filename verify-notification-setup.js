#!/usr/bin/env node

/**
 * Verification script to check if notification system is properly set up
 * Run with: node verify-notification-setup.js
 */

import fs from 'fs'
import path from 'path'

const checks = []

function addCheck(name, condition, message) {
  checks.push({ name, condition, message })
}

function runChecks() {
  console.log('🔍 Verifying Notification System Setup...\n')
  
  let passed = 0
  let failed = 0
  
  checks.forEach(check => {
    try {
      if (check.condition()) {
        console.log(`✅ ${check.name}`)
        passed++
      } else {
        console.log(`❌ ${check.name}: ${check.message}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`)
      failed++
    }
  })
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All checks passed! Notification system is ready.')
    return true
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.')
    return false
  }
}

// File existence checks
addCheck(
  'ApplicationWizard component exists',
  () => fs.existsSync('src/pages/student/ApplicationWizard.tsx'),
  'ApplicationWizard.tsx not found'
)

addCheck(
  'NotificationBell component exists',
  () => fs.existsSync('src/components/student/NotificationBell.tsx'),
  'NotificationBell.tsx not found'
)

addCheck(
  'Notification API endpoint exists',
  () => fs.existsSync('api/notifications/application-submitted.js'),
  'API endpoint not found'
)

addCheck(
  'Notification service exists',
  () => fs.existsSync('src/lib/notificationService.ts'),
  'NotificationService not found'
)

addCheck(
  'Multi-channel notifications exists',
  () => fs.existsSync('src/lib/multiChannelNotifications.ts'),
  'MultiChannelNotifications not found'
)

// Code content checks
addCheck(
  'ApplicationWizard has notification integration',
  () => {
    const content = fs.readFileSync('src/pages/student/ApplicationWizard.tsx', 'utf8')
    return content.includes('submittedApplication') && 
           content.includes('application-submitted') &&
           content.includes('Application Details')
  },
  'ApplicationWizard missing notification integration'
)

addCheck(
  'NotificationBell has test attributes',
  () => {
    const content = fs.readFileSync('src/components/student/NotificationBell.tsx', 'utf8')
    return content.includes('data-testid="notification-bell"') &&
           content.includes('data-testid="unread-count"') &&
           content.includes('data-testid="notification-item"')
  },
  'NotificationBell missing test attributes'
)

addCheck(
  'API endpoint has proper authentication',
  () => {
    const content = fs.readFileSync('api/notifications/application-submitted.js', 'utf8')
    return content.includes('getUserFromRequest') &&
           content.includes('supabaseAdminClient') &&
           content.includes('in_app_notifications')
  },
  'API endpoint missing proper authentication or database integration'
)

// Environment checks
addCheck(
  'Environment variables configured',
  () => {
    return fs.existsSync('.env') || fs.existsSync('.env.local')
  },
  'No environment file found (.env or .env.local)'
)

addCheck(
  'Package.json has required dependencies',
  () => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    return deps['@supabase/supabase-js'] && 
           deps['framer-motion'] &&
           deps['lucide-react']
  },
  'Missing required dependencies'
)

// Database schema checks
addCheck(
  'Database schema file exists',
  () => fs.existsSync('sql/enhanced_features_schema.sql'),
  'Database schema file not found'
)

addCheck(
  'Schema includes notification tables',
  () => {
    const content = fs.readFileSync('sql/enhanced_features_schema.sql', 'utf8')
    return content.includes('in_app_notifications') &&
           content.includes('notification_logs') &&
           content.includes('user_notification_preferences')
  },
  'Schema missing notification tables'
)

// Test files
addCheck(
  'Integration test exists',
  () => fs.existsSync('tests/integration/test-notification-integration.js'),
  'Integration test file not found'
)

addCheck(
  'Manual test guide exists',
  () => fs.existsSync('manual-test-notifications.md'),
  'Manual test guide not found'
)

addCheck(
  'Test script exists',
  () => fs.existsSync('test-notification-system.js'),
  'Test script not found'
)

// Component integration checks
addCheck(
  'AuthenticatedNavigation includes NotificationBell',
  () => {
    const content = fs.readFileSync('src/components/ui/AuthenticatedNavigation.tsx', 'utf8')
    return content.includes('NotificationBell') &&
           content.includes('from \'@/components/student/NotificationBell\'')
  },
  'AuthenticatedNavigation missing NotificationBell integration'
)

// Run all checks
const success = runChecks()

if (success) {
  console.log('\n🚀 Next Steps:')
  console.log('1. Run the application: npm run dev')
  console.log('2. Test manually using: manual-test-notifications.md')
  console.log('3. Run automated tests: npm run test:notifications')
  console.log('4. Verify database setup: node test-notification-system.js')
} else {
  console.log('\n🔧 Fix the issues above and run this script again.')
}

process.exit(success ? 0 : 1)