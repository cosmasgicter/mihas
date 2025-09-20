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

module.exports = async function handler(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    const status = authContext.error === 'Access denied' ? 403 : 401
    return res.status(status).json({ error: authContext.error })
  }

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
