let cachedHandlerModule

function loadHandlerModule() {
  if (!cachedHandlerModule) {
    cachedHandlerModule = require('../../api/applications/[id].js')
  }
  return cachedHandlerModule
}

function resolveHandler(handlerOverride) {
  if (handlerOverride) {
    return handlerOverride
  }

  const module = loadHandlerModule()

  if (typeof module === 'function') {
    return module
  }

  if (typeof module?.handler === 'function') {
    return module.handler
  }

  if (typeof module?.default === 'function') {
    return module.default
  }

  return module
}

function createApplicationsIdHandler(handlerOverride) {
  const getHandler = () => resolveHandler(handlerOverride)

  return async (event, context) => {
    // Extract ID from path or query
    const pathParts = event.path ? event.path.split('/') : []
    const idFromPath = pathParts[pathParts.length - 1]
    const idFromQuery = event.queryStringParameters?.id
    const applicationId = idFromPath !== 'applications-id' ? idFromPath : idFromQuery

    if (applicationId) {
      console.log('applications-id resolved request parameters', {
        applicationId,
        source: idFromPath !== 'applications-id' ? 'path' : 'query'
      })
    } else {
      console.warn('applications-id missing identifier for request', {
        path: event.path,
        query: event.queryStringParameters
      })
    }

    const req = {
      method: event.httpMethod,
      query: event.queryStringParameters || {},
      body: event.body,
      headers: event.headers,
      params: { id: applicationId }
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
      const handler = getHandler()
      if (typeof handler === 'function') {
        await handler(req, res)
      } else if (handler?.handler) {
        await handler.handler(req, res)
      } else if (handler?.default) {
        await handler.default(req, res)
      } else {
        await handler(req, res)
      }
    } catch (error) {
      console.error('applications-id error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body || JSON.stringify({ error: 'No response' })
    }
  }
}

exports.handler = createApplicationsIdHandler()
exports.createApplicationsIdHandler = createApplicationsIdHandler
