const fs = require('fs')
const path = require('path')

const functionsDir = path.join(__dirname, '../netlify/functions')
const apiDir = path.join(__dirname, '../api')

// Ensure functions directory exists
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true })
}

const functionTemplate = (apiPath, functionName) => `
const handler = require('../../api/${apiPath}')

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    query: event.queryStringParameters || {},
    body: event.body,
    headers: event.headers,
    params: event.pathParameters || {}
  }
  
  const res = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    setHeader: function(name, value) { this.headers[name] = value },
    status: function(code) { this.statusCode = code; return this },
    json: function(data) { this.body = JSON.stringify(data); return this },
    end: function(data) { this.body = data || ''; return this }
  }

  try {
    if (typeof handler === 'function') {
      await handler(req, res)
    } else if (handler.handler) {
      await handler.handler(req, res)
    } else if (handler.default) {
      await handler.default(req, res)
    } else {
      await handler(req, res)
    }
  } catch (error) {
    console.error('${functionName} error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body || JSON.stringify({ error: 'No response' })
  }
}
`

// Key API endpoints to create functions for
const endpoints = [
  { path: 'auth/login.js', name: 'auth-login' },
  { path: 'auth/register.js', name: 'auth-register' },
  { path: 'auth/signin.js', name: 'auth-signin' },
  { path: 'applications/index.js', name: 'applications' },
  { path: 'applications/[id].js', name: 'applications-id' },
  { path: 'applications/bulk.js', name: 'applications-bulk' },
  { path: 'catalog/programs/index.js', name: 'catalog-programs' },
  { path: 'catalog/intakes/index.js', name: 'catalog-intakes' },
  { path: 'catalog/subjects.js', name: 'catalog-subjects' },
  { path: 'documents/upload.js', name: 'documents-upload' },
  { path: 'notifications/send.js', name: 'notifications-send' },
  { path: 'notifications/dispatch-channel.js', name: 'notifications-dispatch-channel' },
  { path: 'notifications/application-submitted.js', name: 'notifications-application-submitted' },
  { path: 'notifications/preferences.js', name: 'notifications-preferences' },
  { path: 'notifications/update-consent.js', name: 'notifications-update-consent' },
  { path: 'analytics/metrics.js', name: 'analytics-metrics' },
  { path: 'analytics/predictive-dashboard.js', name: 'analytics-predictive-dashboard' },
  { path: 'mcp/query.js', name: 'mcp-query' },
  { path: 'mcp/schema.js', name: 'mcp-schema' },
  { path: 'admin/dashboard.js', name: 'admin-dashboard' },
  { path: 'admin/users/index.js', name: 'admin-users' },
  { path: 'admin/users/[id].js', name: 'admin-users-id' },
  { path: 'admin/audit-log.js', name: 'admin-audit-log' },
  { path: 'user-consents.js', name: 'user-consents' }
]

endpoints.forEach(({ path: apiPath, name }) => {
  const functionPath = path.join(functionsDir, `${name}.js`)
  const content = functionTemplate(apiPath, name)
  fs.writeFileSync(functionPath, content.trim())
  console.log(`Created: ${name}.js`)
})

console.log(`Generated ${endpoints.length} Netlify functions`)