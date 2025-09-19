const { supabaseAdminClient, getUserFromRequest } = require('./_lib/supabaseClient')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('./_lib/rateLimiter')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.query

  if (!action || !['send', 'application-submitted'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: send or application-submitted' })
  }

  try {
    const rateKey = buildRateLimitKey(req, { prefix: `notifications-${action}` })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig(`notifications_${action.replace(/-/g, '_')}`, { maxAttempts: 25, windowMs: 120_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many notification requests. Please wait before retrying.' })
    }
  } catch (rateError) {
    console.error('Notifications rate limiter error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  try {
    switch (action) {
      case 'send':
        return await handleSendNotification(req, res)
      case 'application-submitted':
        return await handleApplicationSubmitted(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Notifications API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleSendNotification(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  const { userId, type, title, message, data } = req.body || {}

  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'userId, title and message are required' })
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

  return res.status(201).json(notification)
}

async function handleApplicationSubmitted(req, res) {
  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  const { applicationId, userId } = req.body || {}

  if (!applicationId || !userId) {
    return res.status(400).json({ error: 'applicationId and userId are required' })
  }

  // Verify user owns the application
  const { data: application, error: appError } = await supabaseAdminClient
    .from('applications_new')
    .select('*')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single()

  if (appError || !application) {
    return res.status(404).json({ error: 'Application not found or access denied' })
  }

  // Create in-app notification
  const { data: notification, error: notifError } = await supabaseAdminClient
    .from('in_app_notifications')
    .insert({
      user_id: userId,
      title: '✅ Application Submitted Successfully',
      content: `Your application #${application.application_number} for ${application.program} has been submitted and is under review.`,
      type: 'success',
      action_url: `/student/dashboard`,
      read: false
    })
    .select()
    .single()

  if (notifError) {
    console.error('Failed to create notification:', notifError)
    return res.status(500).json({ error: 'Failed to create notification' })
  }

  // Log notification for tracking
  await supabaseAdminClient
    .from('notification_logs')
    .insert({
      user_id: userId,
      type: 'application_submitted',
      channels: ['in_app'],
      success_count: 1,
      total_count: 1,
      sent_at: new Date().toISOString()
    })

  return res.status(201).json({ 
    success: true, 
    notification,
    application: {
      number: application.application_number,
      trackingCode: application.public_tracking_code,
      program: application.program,
      institution: application.institution
    }
  })
}