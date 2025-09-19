const { z } = require('zod')
const {
  supabaseAdminClient,
  getUserFromRequest
} = require('../_lib/supabaseClient')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../_lib/rateLimiter')

const telemetryEventSchema = z.object({
  type: z.enum(['api_call', 'custom_metric', 'error', 'alert']),
  service: z.string().min(1),
  endpoint: z.string().optional(),
  success: z.boolean().optional(),
  duration_ms: z.number().nonnegative().optional(),
  status_code: z.number().optional(),
  metric_name: z.string().optional(),
  metric_value: z.number().optional(),
  level: z.enum(['info', 'warning', 'error']).optional(),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  occurred_at: z.string().datetime().optional()
})

const ingestPayloadSchema = z.object({
  events: z.array(telemetryEventSchema).min(1)
})

function calculatePercentile(samples, percentile) {
  if (!samples.length) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]

  const rank = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) {
    return sorted[lower]
  }
  const weight = rank - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

async function handlePost(req, res) {
  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'telemetry-ingest' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('telemetry_ingest', { maxAttempts: 600, windowMs: 60_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many telemetry submissions' })
    }
  } catch (rateError) {
    console.error('Telemetry ingest rate limit error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  let payload
  try {
    payload = ingestPayloadSchema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
  } catch (error) {
    console.error('Invalid telemetry payload', error)
    return res.status(400).json({ error: 'Invalid telemetry payload' })
  }

  const records = payload.events.map(event => ({
    type: event.type,
    service: event.service,
    endpoint: event.endpoint ?? null,
    success: event.success ?? null,
    duration_ms: event.duration_ms ?? null,
    status_code: event.status_code ?? null,
    metric_name: event.metric_name ?? null,
    metric_value: event.metric_value ?? null,
    level: event.level ?? null,
    message: event.message ?? null,
    metadata: event.metadata ?? null,
    occurred_at: event.occurred_at ?? new Date().toISOString()
  }))

  const { error } = await supabaseAdminClient.from('api_telemetry').insert(records)
  if (error) {
    console.error('Failed to persist telemetry batch', error)
    return res.status(500).json({ error: 'Failed to persist telemetry' })
  }

  return res.status(202).json({ stored: records.length })
}

async function handleGet(req, res) {
  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'telemetry-fetch' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('telemetry_fetch', { maxAttempts: 120, windowMs: 60_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many telemetry requests' })
    }
  } catch (rateError) {
    console.error('Telemetry fetch rate limit error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    const status = authContext.error === 'Access denied' ? 403 : 401
    return res.status(status).json({ error: authContext.error })
  }

  const { service, endpoint, type, level, limit, since, windowMinutes } = req.query

  let query = supabaseAdminClient
    .from('api_telemetry')
    .select(
      'id, type, service, endpoint, success, duration_ms, status_code, metric_name, metric_value, level, message, metadata, occurred_at'
    )
    .order('occurred_at', { ascending: false })

  if (service) {
    query = query.eq('service', service)
  }
  if (endpoint) {
    query = query.eq('endpoint', endpoint)
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (level) {
    query = query.eq('level', level)
  }

  const limitNumber = Number.parseInt(limit, 10)
  if (!Number.isNaN(limitNumber) && limitNumber > 0) {
    query = query.limit(Math.min(limitNumber, 1000))
  } else {
    query = query.limit(500)
  }

  const now = Date.now()
  if (since) {
    query = query.gte('occurred_at', new Date(since).toISOString())
  } else if (windowMinutes) {
    const minutes = Number.parseInt(windowMinutes, 10)
    if (!Number.isNaN(minutes) && minutes > 0) {
      const start = new Date(now - minutes * 60_000).toISOString()
      query = query.gte('occurred_at', start)
    }
  }

  const { data, error } = await query
  if (error) {
    console.error('Failed to fetch telemetry', error)
    return res.status(500).json({ error: 'Failed to fetch telemetry' })
  }

  const summaryMap = new Map()
  ;(data || [])
    .filter(event => event.type === 'api_call')
    .forEach(event => {
      const key = `${event.service}:${event.endpoint ?? 'unknown'}`
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          service: event.service,
          endpoint: event.endpoint ?? 'unknown',
          totalCalls: 0,
          errorCount: 0,
          samples: [],
          firstSeen: event.occurred_at,
          lastSeen: event.occurred_at
        })
      }

      const entry = summaryMap.get(key)
      entry.totalCalls += 1
      if (event.success === false) {
        entry.errorCount += 1
      }
      if (typeof event.duration_ms === 'number') {
        entry.samples.push(event.duration_ms)
      }

      const occurred = Date.parse(event.occurred_at)
      if (!entry.firstSeen || occurred < Date.parse(entry.firstSeen)) {
        entry.firstSeen = event.occurred_at
      }
      if (!entry.lastSeen || occurred > Date.parse(entry.lastSeen)) {
        entry.lastSeen = event.occurred_at
      }
    })

  const summary = Array.from(summaryMap.values()).map(entry => ({
    service: entry.service,
    endpoint: entry.endpoint,
    totalCalls: entry.totalCalls,
    errorCount: entry.errorCount,
    errorRate: entry.totalCalls > 0 ? entry.errorCount / entry.totalCalls : 0,
    avgDuration: entry.samples.length
      ? entry.samples.reduce((sum, value) => sum + value, 0) / entry.samples.length
      : 0,
    p95Duration: calculatePercentile(entry.samples, 95),
    firstSeen: entry.firstSeen,
    lastSeen: entry.lastSeen
  }))

  return res.status(200).json({
    events: data ?? [],
    summary
  })
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    return handlePost(req, res)
  }

  if (req.method === 'GET') {
    return handleGet(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
