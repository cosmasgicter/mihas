const { handleTelemetryFetch, handleTelemetryIngest } = require('../../_lib/analytics/telemetry')

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase()

  if (method === 'GET') {
    return handleTelemetryFetch(req, res)
  }

  if (method === 'POST') {
    return handleTelemetryIngest(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: `Method ${method} not allowed` })
}
