const { handleTelemetryFetch, handleTelemetryIngest } = require('../../api/_lib/analytics/telemetry')

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    query: event.queryStringParameters || {},
    body: event.body,
    headers: event.headers
  }
  
  const res = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    setHeader: function(name, value) {
      this.headers[name] = value
    },
    status: function(code) {
      this.statusCode = code
      return this
    },
    json: function(data) {
      this.headers['Content-Type'] = 'application/json'
      this.body = JSON.stringify(data)
      return this
    }
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
    if (req.method === 'GET') {
      await handleTelemetryFetch(req, res)
    } else if (req.method === 'POST') {
      await handleTelemetryIngest(req, res)
    } else {
      res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error) {
    console.error('Telemetry handler error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body || JSON.stringify({ error: 'No response body' })
  }
}