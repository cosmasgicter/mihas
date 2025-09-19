const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../_lib/rateLimiter')
const { logAuditEvent } = require('../_lib/auditLogger')
const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

function parseAction(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  if (typeof value === 'string') {
    return value
  }
  return null
}

function normalizeRecord(record) {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    action: record.action,
    actorId: record.actor_id,
    actorEmail: record.actor_email,
    actorRoles: record.actor_roles || [],
    targetTable: record.target_table,
    targetId: record.target_id,
    targetLabel: record.target_label,
    requestId: record.request_id,
    requestIp: record.request_ip,
    userAgent: record.user_agent,
    metadata: record.metadata || {},
    createdAt: record.created_at
  }
}

async function handleDashboard(req, res, authContext) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'admin-dashboard' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('admin_dashboard', { maxAttempts: 30, windowMs: 60_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many dashboard requests. Please wait before retrying.' })
    }
  } catch (rateError) {
    console.error('Admin dashboard rate limiter error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  try {
    const queryBuilder = supabaseAdminClient.from('admin_dashboard_metrics_cache').select('metrics, generated_at')
    const { data, error } = await queryBuilder.eq('id', 'overview').maybeSingle()

    if (error) {
      throw new Error(error.message || 'Failed to load admin dashboard overview')
    }

    const overview = (data?.metrics && typeof data.metrics === 'object' ? data.metrics : {}) || {}
    const generatedAtSource = data?.generated_at || data?.generatedAt || null
    let generatedAt = null
    if (generatedAtSource) {
      const generatedAtDate = new Date(generatedAtSource)
      if (!Number.isNaN(generatedAtDate.getTime())) {
        generatedAt = generatedAtDate.toISOString()
      }
    }
    const statusCounts = overview.status_counts || {}
    const totals = overview.totals || {}
    const applicationCounts = overview.application_counts || {}
    const processingMetrics = overview.processing_metrics || {}
    const recentItems = Array.isArray(overview.recent_activity) ? overview.recent_activity : []

    const pendingApplications = (statusCounts.submitted || 0) + (statusCounts.under_review || 0)
    const avgProcessingHours = processingMetrics.average_hours || 0
    const avgProcessingTimeDays = Number(((avgProcessingHours || 0) / 24).toFixed(1))

    const stats = {
      totalApplications: statusCounts.total || 0,
      pendingApplications,
      approvedApplications: statusCounts.approved || 0,
      rejectedApplications: statusCounts.rejected || 0,
      totalPrograms: totals.active_programs || 0,
      activeIntakes: totals.active_intakes || 0,
      totalStudents: totals.students || 0,
      todayApplications: applicationCounts.today || 0,
      weekApplications: applicationCounts.this_week || 0,
      monthApplications: applicationCounts.this_month || 0,
      avgProcessingTime: avgProcessingTimeDays,
      avgProcessingTimeHours: avgProcessingHours,
      medianProcessingTimeHours: processingMetrics.median_hours || 0,
      p95ProcessingTimeHours: processingMetrics.p95_hours || 0,
      decisionVelocity24h: processingMetrics.decision_velocity_24h || 0,
      activeUsers: processingMetrics.active_admins_last_24h || 0,
      activeUsersLast7d: processingMetrics.active_admins_last_7d || 0,
      systemHealth: pendingApplications > 50 || (processingMetrics.p95_hours || 0) > 96 ? 'warning' : 'good',
      statusBreakdown: statusCounts,
      applicationTrends: applicationCounts,
      totalsSnapshot: totals,
      processingMetrics
    }

    const activities = recentItems.map(item => ({
      id: item.id,
      type:
        item.status === 'approved'
          ? 'approval'
          : item.status === 'rejected'
            ? 'rejection'
            : item.status === 'under_review'
              ? 'review'
              : 'application',
      message: `${item.full_name} - Application ${item.status}`,
      timestamp: item.updated_at || item.submitted_at || item.created_at,
      user: item.full_name,
      status: item.status,
      paymentStatus: item.payment_status,
      submittedAt: item.submitted_at,
      updatedAt: item.updated_at,
      createdAt: item.created_at,
      program: item.program,
      intake: item.intake
    }))

    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=60')
    res.setHeader('Vary', 'Authorization')
    if (generatedAt) {
      res.setHeader('X-Generated-At', new Date(generatedAt).toUTCString())
    }

    await logAuditEvent({
      req,
      action: 'admin.dashboard.view',
      actorId: authContext.user.id,
      actorEmail: authContext.user.email || null,
      actorRoles: authContext.roles,
      targetTable: 'admin_dashboard_metrics_cache',
      targetId: 'overview',
      metadata: {
        generatedAt,
        statusBreakdownKeys: Object.keys(statusCounts || {}),
        totalsSnapshotKeys: Object.keys(totals || {})
      }
    })

    return res.status(200).json({
      stats,
      recentActivity: activities,
      statusBreakdown: statusCounts,
      applicationTrends: applicationCounts,
      totalsSnapshot: totals,
      processingMetrics,
      recentActivityRaw: recentItems,
      generatedAt
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ error: 'Failed to load admin dashboard overview' })
  }
}

async function handleAuditLog(req, res, authContext) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    actorId,
    targetTable,
    targetId,
    from,
    to,
    page = '1',
    pageSize = '25',
    logAction,
    eventAction,
    auditAction
  } = req.query || {}

  const normalizedPage = Number.parseInt(Array.isArray(page) ? page[0] : page, 10)
  const normalizedPageSize = Number.parseInt(Array.isArray(pageSize) ? pageSize[0] : pageSize, 10)

  const limit = Number.isNaN(normalizedPageSize) ? 25 : Math.min(Math.max(normalizedPageSize, 5), 100)
  const currentPage = Number.isNaN(normalizedPage) ? 1 : Math.max(normalizedPage, 1)
  const offset = (currentPage - 1) * limit

  let query = supabaseAdminClient
    .from('system_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const auditActionFilter = parseAction(logAction) || parseAction(eventAction) || parseAction(auditAction)
  if (auditActionFilter) {
    query = query.ilike('action', `${auditActionFilter}%`)
  }
  if (actorId) {
    query = query.eq('actor_id', Array.isArray(actorId) ? actorId[0] : actorId)
  }
  if (targetTable) {
    query = query.eq('target_table', Array.isArray(targetTable) ? targetTable[0] : targetTable)
  }
  if (targetId) {
    query = query.eq('target_id', Array.isArray(targetId) ? targetId[0] : targetId)
  }
  if (from) {
    const parsed = new Date(Array.isArray(from) ? from[0] : from)
    if (!Number.isNaN(parsed.getTime())) {
      query = query.gte('created_at', parsed.toISOString())
    }
  }
  if (to) {
    const parsed = new Date(Array.isArray(to) ? to[0] : to)
    if (!Number.isNaN(parsed.getTime())) {
      query = query.lte('created_at', parsed.toISOString())
    }
  }

  const { data, count, error } = await query
  if (error) {
    console.error('Audit log query failed', error)
    return res.status(500).json({ error: 'Failed to load audit log entries' })
  }

  const records = (data || []).map(normalizeRecord)
  const totalCount = typeof count === 'number' ? count : records.length
  const totalPages = limit > 0 ? Math.max(Math.ceil(totalCount / limit), 1) : 1

  await logAuditEvent({
    req,
    action: 'audit.log.view',
    actorId: authContext.user.id,
    actorEmail: authContext.user.email || null,
    actorRoles: authContext.roles,
    targetTable: 'system_audit_log',
    metadata: {
      filters: {
        action: auditActionFilter || null,
        actorId: actorId ? (Array.isArray(actorId) ? actorId[0] : actorId) : null,
        targetTable: targetTable ? (Array.isArray(targetTable) ? targetTable[0] : targetTable) : null,
        targetId: targetId ? (Array.isArray(targetId) ? targetId[0] : targetId) : null
      },
      page: currentPage,
      pageSize: limit
    }
  })

  return res.status(200).json({
    data: records,
    page: currentPage,
    pageSize: limit,
    totalPages,
    totalCount
  })
}

module.exports = async function handler(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    const status = authContext.error === 'Access denied' ? 403 : 401
    return res.status(status).json({ error: authContext.error })
  }

  const action = parseAction(req.query?.action) || 'dashboard'

  if (action === 'dashboard') {
    return handleDashboard(req, res, authContext)
  }

  if (action === 'audit-log') {
    return handleAuditLog(req, res, authContext)
  }

  return res.status(400).json({ error: 'Invalid admin action' })
}
