#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function header(message) {
  console.log(message)
  console.log(''.padEnd(message.length, '='))
}

function logResult(icon, message) {
  console.log(`${icon} ${message}`)
}

function check(condition, successMessage, failureMessage, failures) {
  if (condition) {
    logResult('✅', successMessage)
  } else {
    logResult('❌', failureMessage)
    failures.push(failureMessage)
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath))
}

function fileContains(filePath, patterns) {
  if (!fileExists(filePath)) {
    return false
  }
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
  const normalizedPatterns = Array.isArray(patterns) ? patterns : [patterns]
  return normalizedPatterns.every(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(content)
    }
    return content.includes(pattern)
  })
}

function fileExcludes(filePath, patterns) {
  if (!fileExists(filePath)) {
    return true
  }
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
  const normalizedPatterns = Array.isArray(patterns) ? patterns : [patterns]
  return normalizedPatterns.every(pattern => {
    if (pattern instanceof RegExp) {
      return !pattern.test(content)
    }
    return !content.includes(pattern)
  })
}

(function main() {
  header('🔍 Verifying Netlify-friendly API layout')
  const failures = []

  console.log('\n📁 Validating route files')
  const requiredRoutes = [
    { path: 'api/catalog/programs/index.js', label: 'Catalog programs endpoint' },
    { path: 'api/catalog/intakes/index.js', label: 'Catalog intakes endpoint' },
    { path: 'api/catalog/subjects.js', label: 'Catalog subjects endpoint' },
    { path: 'api/auth/login.js', label: 'Auth login endpoint' },
    { path: 'api/auth/signin.js', label: 'Auth signin endpoint' },
    { path: 'api/auth/register.js', label: 'Auth register endpoint' },
    { path: 'api/notifications/send.js', label: 'Notifications send endpoint' },
    { path: 'api/notifications/application-submitted.js', label: 'Notifications application submitted endpoint' },
    { path: 'api/notifications/preferences.js', label: 'Notifications preferences endpoint' },
    { path: 'api/notifications/update-consent.js', label: 'Notifications consent update endpoint' },
    { path: 'api/mcp/query.js', label: 'MCP query endpoint' },
    { path: 'api/mcp/schema.js', label: 'MCP schema endpoint' }
  ]

  requiredRoutes.forEach(route => {
    check(
      fileExists(route.path),
      `${route.label} present`,
      `${route.label} missing (${route.path})`,
      failures
    )
  })

  console.log('\n🚫 Checking for deprecated consolidated routes')
  const deprecatedRoutes = [
    { path: 'api/catalog.js', label: 'Catalog consolidated route' },
    { path: 'api/auth.js', label: 'Auth consolidated route' },
    { path: 'api/notifications.js', label: 'Notifications consolidated route' },
    { path: 'api/admin/index.js', label: 'Admin index router' }
  ]

  deprecatedRoutes.forEach(route => {
    check(
      !fileExists(route.path),
      `${route.label} removed`,
      `${route.label} still present (${route.path})`,
      failures
    )
  })

  console.log('\n🧭 Verifying frontend services')
  check(
    fileContains('src/services/auth.ts', ['/api/auth/login', '/api/auth/register', '/api/auth/signin']),
    'Auth service uses dedicated endpoints',
    'Auth service still references consolidated auth route',
    failures
  )

  check(
    fileContains('src/services/mcpService.ts', ['/api/mcp/query', '/api/mcp/schema']),
    'MCP service uses new MCP endpoints',
    'MCP service not updated to new MCP endpoints',
    failures
  )

  check(
    fileExcludes('src/services/mcpService.ts', 'mcp-operations?action='),
    'MCP service no longer references consolidated edge function',
    'MCP service still references consolidated edge function',
    failures
  )

  console.log('\n🧪 Checking automated tests and scripts')
  check(
    fileExcludes('test-api-comprehensive.js', '\\?action='),
    'Comprehensive API test avoids query-parameter routes',
    'Comprehensive API test still references query-parameter routes',
    failures
  )

  check(
    fileExcludes('test-production-services.js', '\\?action='),
    'Production service test avoids query-parameter routes',
    'Production service test still references query-parameter routes',
    failures
  )

  check(
    fileExcludes('test-services-curl.sh', '\\?action='),
    'cURL service test avoids query-parameter routes',
    'cURL service test still references query-parameter routes',
    failures
  )

  console.log('\n📘 Validating documentation updates')
  const docsToCheck = [
    'API_CONSOLIDATION_GUIDE.md',
    'API_CONSOLIDATION_STATUS.md',
    'README.md',
    'DEPLOYMENT_CHECKLIST.md',
    'API_TEST_RESULTS.md'
  ]

  docsToCheck.forEach(doc => {
    check(
      fileExcludes(doc, '\\?action='),
      `${doc} updated to remove query-parameter routing`,
      `${doc} still references query-parameter routing`,
      failures
    )
  })

  console.log('\n🧹 Verifying repository no longer references consolidated MCP edge function')
  check(
    fileExcludes('README.md', 'mcp-operations'),
    'README.md references new MCP workflow',
    'README.md still references mcp-operations edge function',
    failures
  )

  const hasFailures = failures.length > 0
  console.log('\n🎉 Verification complete')
  if (hasFailures) {
    console.log(`❌ ${failures.length} issue(s) found`)
    process.exitCode = 1
  } else {
    console.log('✅ API layout matches multi-function Netlify deployment')
  }
})()
