const fetch = require('node-fetch')

const { supabaseAdminClient, getUserFromRequest } = require('./_lib/supabaseClient')
const { logAuditEvent } = require('./_lib/auditLogger')
const { hasActiveConsent } = require('./_lib/userConsent')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('./_lib/rateLimiter')

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM
const TWILIO_SMS_MESSAGING_SERVICE_SID = process.env.TWILIO_SMS_MESSAGING_SERVICE_SID
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { action } = req.query

    if (action === 'preferences') {
      return handleGetPreferences(req, res)
    }

    return res.status(400).json({ error: 'Invalid action for GET requests' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.query

  if (!action || !['send', 'application-submitted', 'dispatch-channel', 'update-consent'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: send, application-submitted, dispatch-channel or update-consent' })
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
        return handleSendNotification(req, res)
      case 'application-submitted':
        return handleApplicationSubmitted(req, res)
      case 'dispatch-channel':
        return handleDispatchChannel(req, res)
      case 'update-consent':
        return handleUpdateConsent(req, res)
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

async function handleGetPreferences(req, res) {
  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  try {
    const preferences = await fetchUserNotificationPreferences(authContext.user.id)
    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('user_profiles')
      .select('phone')
      .eq('user_id', authContext.user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error(profileError.message)
    }

    return res.status(200).json({ ...preferences, phone: profile?.phone ?? null })
  } catch (error) {
    console.error('Failed to load notification preferences:', error)
    return res.status(500).json({ error: 'Failed to load notification preferences' })
  }
}

async function handleUpdateConsent(req, res) {
  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  const { channel, action, source, reason } = req.body || {}
  const normalizedChannel = typeof channel === 'string' ? channel.toLowerCase() : ''

  if (!['sms', 'whatsapp'].includes(normalizedChannel)) {
    return res.status(400).json({ error: 'Unsupported channel. Allowed values: sms, whatsapp' })
  }

  if (!['opt_in', 'opt_out'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use opt_in or opt_out' })
  }

  try {
    const existing = await fetchUserNotificationPreferences(authContext.user.id)
    const nextEnabled = action === 'opt_in'
    const nowIso = new Date().toISOString()
    const consentSource = typeof source === 'string' && source.trim() ? source.trim() : 'student_settings_page'
    const channelKey = normalizedChannel === 'sms' ? 'sms' : 'whatsapp'

    const updatedChannels = updateChannelEnabledState(existing.channels, normalizedChannel, nextEnabled)

    const payload = {
      ...existing,
      user_id: authContext.user.id,
      channels: updatedChannels,
      [`${channelKey}_opt_in_actor`]: action === 'opt_in' ? authContext.user.id : existing[`${channelKey}_opt_in_actor`] ?? null,
      [`${channelKey}_opt_in_source`]: action === 'opt_in' ? consentSource : existing[`${channelKey}_opt_in_source`] ?? null,
      [`${channelKey}_opt_in_at`]: action === 'opt_in' ? nowIso : existing[`${channelKey}_opt_in_at`] ?? null,
      [`${channelKey}_opt_out_at`]: action === 'opt_out' ? nowIso : null,
      [`${channelKey}_opt_out_source`]: action === 'opt_out' ? consentSource : null,
      [`${channelKey}_opt_out_actor`]: action === 'opt_out' ? authContext.user.id : null,
      [`${channelKey}_opt_out_reason`]: action === 'opt_out' ? (typeof reason === 'string' ? reason : null) : null
    }

    const { data, error } = await supabaseAdminClient
      .from('user_notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const normalized = normalizePreferencesRecord(data)

    return res.status(200).json(normalized)
  } catch (error) {
    console.error('Failed to update notification consent:', error)
    return res.status(500).json({ error: 'Failed to update notification consent' })
  }
}

async function handleDispatchChannel(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  const { userId, channel, content, type, metadata } = req.body || {}
  const normalizedChannel = typeof channel === 'string' ? channel.toLowerCase() : ''

  if (!userId || !content || !type || !normalizedChannel) {
    return res.status(400).json({ error: 'userId, type, channel and content are required' })
  }

  if (!['sms', 'whatsapp'].includes(normalizedChannel)) {
    return res.status(400).json({ error: 'Unsupported channel. Allowed values: sms, whatsapp' })
  }

  try {
    ensureTwilioConfiguration(normalizedChannel)
  } catch (configError) {
    console.error('Twilio configuration error:', configError)
    return res.status(503).json({ error: configError.message })
  }

  try {
    const { active: hasConsent } = await hasActiveConsent(userId, 'outreach')
    if (!hasConsent) {
      await logAuditEvent({
        req,
        action: 'notifications.channel.blocked',
        actorId: authContext.user.id,
        actorEmail: authContext.user.email || null,
        actorRoles: authContext.roles,
        targetTable: 'user_consents',
        targetId: userId,
        metadata: { channel: normalizedChannel, reason: 'missing_outreach_consent' }
      })

      await logChannelDelivery({
        userId,
        type,
        channel: normalizedChannel,
        success: false,
        status: 'blocked'
      })

      return res.status(412).json({ error: 'Active outreach consent required before dispatching' })
    }

    const preferences = await fetchUserNotificationPreferences(userId)

    if (!hasExplicitOptIn(preferences, normalizedChannel)) {
      await logChannelDelivery({
        userId,
        type,
        channel: normalizedChannel,
        success: false,
        status: 'blocked'
      })

      await logAuditEvent({
        req,
        action: 'notifications.channel.blocked',
        actorId: authContext.user.id,
        actorEmail: authContext.user.email || null,
        actorRoles: authContext.roles,
        targetTable: 'user_notification_preferences',
        targetId: userId,
        metadata: { channel: normalizedChannel, reason: 'missing_channel_opt_in' }
      })

      return res.status(412).json({ error: 'Channel disabled or missing opt-in consent' })
    }

    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('user_profiles')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      throw new Error(profileError.message)
    }

    const formattedRecipient = formatPhoneForChannel(profile?.phone ?? '', normalizedChannel)

    if (!formattedRecipient) {
      await logChannelDelivery({
        userId,
        type,
        channel: normalizedChannel,
        success: false,
        status: 'invalid_destination'
      })

      return res.status(400).json({ error: 'Valid international phone number is required for this channel' })
    }

    const twilioResult = await sendTwilioMessage({
      channel: normalizedChannel,
      to: formattedRecipient,
      body: content
    })

    const messageId = twilioResult.data?.sid || null
    const providerStatus = twilioResult.data?.status || (twilioResult.ok ? 'sent' : 'failed')

    await logChannelDelivery({
      userId,
      type,
      channel: normalizedChannel,
      success: twilioResult.ok,
      status: providerStatus,
      messageId,
      metadata
    })

    if (!twilioResult.ok) {
      const providerMessage = twilioResult.data?.message || 'Failed to dispatch channel notification'
      return res.status(502).json({
        error: providerMessage,
        status: providerStatus,
        messageId
      })
    }

    await logAuditEvent({
      req,
      action: 'notifications.channel.dispatch',
      actorId: authContext.user.id,
      actorEmail: authContext.user.email || null,
      actorRoles: authContext.roles,
      targetTable: 'notification_logs',
      targetId: userId,
      metadata: {
        channel: normalizedChannel,
        status: providerStatus,
        messageId,
        type
      }
    })

    return res.status(200).json({
      success: true,
      status: providerStatus,
      messageId,
      channel: normalizedChannel
    })
  } catch (error) {
    console.error('Channel dispatch error:', error)

    try {
      await logChannelDelivery({
        userId,
        type,
        channel: normalizedChannel,
        success: false,
        status: 'error'
      })
    } catch (logError) {
      console.error('Failed to log channel dispatch error:', logError)
    }

    return res.status(500).json({ error: 'Failed to dispatch channel notification' })
  }
}

async function fetchUserNotificationPreferences(userId) {
  const record = await fetchUserNotificationPreferencesRecord(userId)
  return normalizePreferencesRecord(record || { user_id: userId })
}

async function fetchUserNotificationPreferencesRecord(userId) {
  const { data, error } = await supabaseAdminClient
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data || null
}

function normalizePreferencesRecord(record = {}) {
  const preferences = ensureAuditFields({ ...record })
  preferences.channels = normalizeChannelPreferences(preferences.channels)
  preferences.frequency = preferences.frequency || 'immediate'
  preferences.optimalTiming = typeof preferences.optimalTiming === 'boolean' ? preferences.optimalTiming : true
  return preferences
}

function normalizeChannelPreferences(channels) {
  const defaultConfig = [
    { type: 'email', enabled: true, priority: 1 },
    { type: 'sms', enabled: false, priority: 2 },
    { type: 'whatsapp', enabled: false, priority: 3 },
    { type: 'in_app', enabled: true, priority: 4 }
  ]

  const channelMap = new Map(defaultConfig.map(entry => [entry.type, { ...entry }]))

  if (Array.isArray(channels)) {
    channels.forEach(entry => {
      if (!entry || typeof entry !== 'object' || !entry.type) {
        return
      }

      const type = String(entry.type)
      const normalized = {
        type,
        enabled: Boolean(entry.enabled),
        priority: Number.isFinite(entry.priority) ? Number(entry.priority) : channelMap.get(type)?.priority ?? defaultConfig.length + 1
      }

      channelMap.set(type, { ...channelMap.get(type), ...normalized })
    })
  }

  return Array.from(channelMap.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
}

function updateChannelEnabledState(channels, targetChannel, enabled) {
  const normalizedChannels = normalizeChannelPreferences(channels)
  return normalizedChannels.map(entry =>
    entry.type === targetChannel
      ? { ...entry, enabled }
      : entry
  )
}

function ensureAuditFields(preferences) {
  const auditFields = [
    'sms_opt_in_at',
    'sms_opt_in_source',
    'sms_opt_in_actor',
    'sms_opt_out_at',
    'sms_opt_out_source',
    'sms_opt_out_actor',
    'sms_opt_out_reason',
    'whatsapp_opt_in_at',
    'whatsapp_opt_in_source',
    'whatsapp_opt_in_actor',
    'whatsapp_opt_out_at',
    'whatsapp_opt_out_source',
    'whatsapp_opt_out_actor',
    'whatsapp_opt_out_reason'
  ]

  auditFields.forEach(field => {
    if (!(field in preferences)) {
      preferences[field] = null
    }
  })

  if (!preferences.channels) {
    preferences.channels = []
  }

  return preferences
}

function hasExplicitOptIn(preferences, channel) {
  const channelEntry = Array.isArray(preferences.channels)
    ? preferences.channels.find(entry => entry.type === channel)
    : null

  if (!channelEntry || !channelEntry.enabled) {
    return false
  }

  const prefix = channel === 'sms' ? 'sms' : channel === 'whatsapp' ? 'whatsapp' : null

  if (!prefix) {
    return true
  }

  const optInAt = preferences[`${prefix}_opt_in_at`]
  const optOutAt = preferences[`${prefix}_opt_out_at`]

  if (!optInAt) {
    return false
  }

  if (optOutAt) {
    return false
  }

  return true
}

function ensureTwilioConfiguration(channel) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are not configured')
  }

  if (channel === 'sms' && !TWILIO_SMS_MESSAGING_SERVICE_SID && !TWILIO_SMS_FROM) {
    throw new Error('Twilio SMS sender configuration is missing')
  }

  if (channel === 'whatsapp' && !TWILIO_WHATSAPP_FROM) {
    throw new Error('Twilio WhatsApp sender number is not configured')
  }
}

function formatPhoneForChannel(rawPhone, channel) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null
  }

  const trimmed = rawPhone.replace(/[\s\-]/g, '')

  if (channel === 'whatsapp') {
    if (trimmed.startsWith('whatsapp:')) {
      return trimmed
    }

    return trimmed.startsWith('+') ? `whatsapp:${trimmed}` : null
  }

  if (trimmed.startsWith('whatsapp:')) {
    const stripped = trimmed.replace(/^whatsapp:/, '')
    return stripped.startsWith('+') ? stripped : null
  }

  return trimmed.startsWith('+') ? trimmed : null
}

async function sendTwilioMessage({ channel, to, body }) {
  const authHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

  const params = new URLSearchParams()
  params.append('To', to)
  params.append('Body', body)

  if (channel === 'sms') {
    if (TWILIO_SMS_MESSAGING_SERVICE_SID) {
      params.append('MessagingServiceSid', TWILIO_SMS_MESSAGING_SERVICE_SID)
    } else if (TWILIO_SMS_FROM) {
      params.append('From', TWILIO_SMS_FROM)
    }
  } else if (channel === 'whatsapp') {
    params.append('From', TWILIO_WHATSAPP_FROM)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  let payload

  try {
    payload = await response.json()
  } catch (error) {
    payload = null
  }

  return {
    ok: response.ok,
    status: response.status,
    data: payload
  }
}

async function logChannelDelivery({ userId, type, channel, success, status, messageId }) {
  const channelStatuses = { [channel]: status || (success ? 'sent' : 'failed') }
  const providerMessageIds = messageId ? { [channel]: messageId } : {}

  const { error } = await supabaseAdminClient
    .from('notification_logs')
    .insert({
      user_id: userId,
      type,
      channels: [channel],
      success_count: success ? 1 : 0,
      total_count: 1,
      sent_at: new Date().toISOString(),
      channel_statuses: channelStatuses,
      provider_message_ids: providerMessageIds
    })

  if (error) {
    throw new Error(error.message)
  }
}