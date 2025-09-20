const handler = require('../../api/mcp/query.js')

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
    json: function(data) { this.body = JSON.stringify(data); return this }
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
    console.error('mcp-query error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body || JSON.stringify({ error: 'No response' })
  }
}