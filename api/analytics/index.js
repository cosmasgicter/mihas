const { handleMetricsRequest } = require('../_lib/analytics/metrics')
const { handlePredictiveDashboardRequest } = require('../_lib/analytics/predictiveDashboard')
const { handleTelemetryFetch, handleTelemetryIngest } = require('../_lib/analytics/telemetry')

const ACTION_HANDLERS = {
  metrics: {
    GET: handleMetricsRequest
  },
  'predictive-dashboard': {
    GET: handlePredictiveDashboardRequest
  },
  telemetry: {
    GET: handleTelemetryFetch,
    POST: handleTelemetryIngest
  }
}

function normalizeAction(action) {
  if (Array.isArray(action)) {
    return action[0]
  }
  return action
}

module.exports = async function handler(req, res) {
  const actionParam = normalizeAction(req.query?.action)
  const actionKey = typeof actionParam === 'string' ? actionParam.toLowerCase() : undefined

  if (!actionKey) {
    return res.status(400).json({ error: 'Missing analytics action' })
  }

  const handlers = ACTION_HANDLERS[actionKey]
  if (!handlers) {
    return res.status(400).json({ error: `Unsupported analytics action: ${actionParam}` })
  }

  const method = (req.method || 'GET').toUpperCase()
  const actionHandler = handlers[method]
  if (!actionHandler) {
    res.setHeader('Allow', Object.keys(handlers).join(', '))
    return res.status(405).json({ error: `Method ${method} not allowed for action ${actionKey}` })
  }

  return actionHandler(req, res)
}
