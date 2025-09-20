const { handlePredictiveDashboardRequest } = require('../_lib/analytics/predictiveDashboard')

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  return handlePredictiveDashboardRequest(req, res)
}
