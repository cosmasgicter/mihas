const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')
const { logAuditEvent } = require('../_lib/auditLogger')
const { hasActiveConsent } = require('../_lib/userConsent')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../_lib/rateLimiter')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'notifications-send' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('notifications_send', { maxAttempts: 25, windowMs: 120_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many notification requests. Please wait before retrying.' })
    }
  } catch (rateError) {
    console.error('Notifications send rate limiter error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  // Parse body if it's a string (Netlify functions)
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' })
    }
  }

  const { userId, type, title, message, data } = body || {}

  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'userId, title and message are required' })
  }

  try {
    const { active: hasConsent } = await hasActiveConsent(userId, 'outreach')
    if (!hasConsent) {
      await logAuditEvent({
        req,
        action: 'notifications.send.blocked',
        actorId: authContext.user.id,
        actorEmail: authContext.user.email || null,
        actorRoles: authContext.roles,
        targetTable: 'user_consents',
        targetId: userId,
        metadata: { reason: 'missing_outreach_consent', title }
      })

      return res.status(412).json({ error: 'Active outreach consent required before sending notifications' })
    }

    const { data: notification, error } = await supabaseAdminClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAuditEvent({
      req,
      action: 'notifications.send',
      actorId: authContext.user.id,
      actorEmail: authContext.user.email || null,
      actorRoles: authContext.roles,
      targetTable: 'notifications',
      targetId: notification?.id || null,
      metadata: { userId, type, title }
    })

    return res.status(201).json(notification)
  } catch (error) {
    console.error('Notifications send error:', error)
    return res.status(500).json({ error: 'Failed to send notification' })
  }
}
