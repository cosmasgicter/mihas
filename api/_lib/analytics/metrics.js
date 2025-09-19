const { supabaseAdminClient, getUserFromRequest } = require('../supabaseClient')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../rateLimiter')

async function handleMetricsRequest(req, res) {
  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'analytics-metrics' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('analytics_metrics', { maxAttempts: 30, windowMs: 60_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res
        .status(429)
        .json({ error: 'Too many analytics requests. Please try again later.' })
    }
  } catch (rateError) {
    console.error('Analytics metrics rate limiter error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    const status = authContext.error === 'Access denied' ? 403 : 401
    return res.status(status).json({ error: authContext.error })
  }

  try {
    const [totalApps, submittedApps, approvedApps, recentApps] = await Promise.all([
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true }),
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabaseAdminClient
        .from('applications_new')
        .select('created_at, status, program')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
    ])

    return res.status(200).json({
      totalApplications: Number(totalApps.count || 0),
      submittedApplications: Number(submittedApps.count || 0),
      approvedApplications: Number(approvedApps.count || 0),
      recentApplications: recentApps.data || []
    })
  } catch (error) {
    console.error('Analytics metrics error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  handleMetricsRequest
}
