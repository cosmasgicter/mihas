const handler = require('../../api/admin/users/[id]/permissions.js')

exports.handler = async (event) => {
  const pathParameters = event.pathParameters || {}
  const query = { ...(event.queryStringParameters || {}) }

  if (pathParameters.id && !query.id) {
    query.id = pathParameters.id
  }

  const params = { ...pathParameters }
  if (!params.id && query.id) {
    params.id = query.id
  }

  const req = {
    method: event.httpMethod,
    query,
    body: event.body,
    headers: event.headers,
    params
  }

  const res = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = JSON.stringify(data)
      return this
    },
    end(data) {
      this.body = data || ''
      return this
    }
  }

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
    console.error('admin-users-permissions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body || JSON.stringify({ error: 'No response' })
  }
}
