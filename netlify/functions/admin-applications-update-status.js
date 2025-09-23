const handler = require('../../api/admin/applications/update-status.js')

exports.handler = async (event, context) => {
  let body = event.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      body = {}
    }
  }

  const req = {
    method: event.httpMethod,
    query: event.queryStringParameters || {},
    body: body,
    headers: event.headers,
    params: event.pathParameters || {}
  }

  const res = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    setHeader: function(name, value) { this.headers[name] = value },
    status: function(code) { this.statusCode = code; return this },
    json: function(data) { this.body = JSON.stringify(data); return this },
    end: function(data) { this.body = data || ''; return this }
  }

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: res.headers,
      body: ''
    }
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
    console.error('admin-applications-update-status error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body || JSON.stringify({ error: 'No response' })
  }
}
