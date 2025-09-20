const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../_lib/rateLimiter')

const DEFAULT_PAGE_SIZE = 15
const ALLOWED_SORT_FIELDS = new Set(['date', 'name', 'status'])
const SORT_FIELD_MAP = {
  date: 'created_at',
  name: 'full_name',
  status: 'status'
}

const APPLICATION_LIST_COLUMNS = [
  'id',
  'application_number',
  'user_id',
  'full_name',
  'nrc_number',
  'passport_number',
  'date_of_birth',
  'sex',
  'phone',
  'email',
  'residence_town',
  'guardian_name',
  'guardian_phone',
  'program',
  'intake',
  'institution',
  'result_slip_url',
  'extra_kyc_url',
  'pop_url',
  'application_fee',
  'payment_method',
  'payer_name',
  'payer_phone',
  'amount',
  'paid_at',
  'momo_ref',
  'payment_status',
  'payment_verified_at',
  'payment_verified_by',
  'status',
  'submitted_at',
  'created_at',
  'updated_at',
  'public_tracking_code'
]

const MAX_DELTA_RESULTS = 200

function sanitizeSearchTerm(term = '') {
  return term.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
}

function parseBoolean(value) {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return Boolean(value)
}

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Rate limiting temporarily disabled for testing
  // try {
  //   const rateKey = buildRateLimitKey(req, { prefix: 'applications' })
  //   const rateResult = await checkRateLimit(
  //     rateKey,
  //     getLimiterConfig('applications', { maxAttempts: 40, windowMs: 60_000 })
  //   )

  //   if (rateResult.isLimited) {
  //     attachRateLimitHeaders(res, rateResult)
  //     return res.status(429).json({ error: 'Too many application requests. Please slow down.' })
  //   }
  // } catch (rateError) {
  //   console.error('Applications rate limiter error:', rateError)
  //   return res.status(503).json({ error: 'Rate limiter unavailable' })
  // }

  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, authContext)
    case 'POST':
      return handlePost(req, res, authContext)
    case 'OPTIONS':
      return res.status(200).end()
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res, { user, isAdmin }) {
  try {
    // Clean query parameters to handle malformed URLs
    const cleanQuery = {}
    const rawQuery = req.query || {}
    
    // Handle malformed URLs with &amp; entities
    let queryString = req.url?.split('?')[1] || ''
    if (queryString.includes('&amp;')) {
      queryString = queryString.replace(/&amp;/g, '&')
      const params = new URLSearchParams(queryString)
      for (const [key, value] of params.entries()) {
        cleanQuery[key] = value
      }
    } else {
      for (const [key, value] of Object.entries(rawQuery)) {
        const cleanKey = key.replace(/:.*$/, '')
        cleanQuery[cleanKey] = Array.isArray(value) ? value[0] : value
      }
    }
    
    const {
      page = '0',
      pageSize = DEFAULT_PAGE_SIZE.toString(),
      status = 'all',
      search = '',
      sortBy = 'date',
      sortOrder = 'desc',
      program = 'all',
      institution = 'all',
      paymentStatus = 'all',
      startDate = '',
      endDate = '',
      includeStats = 'false',
      mine = 'false',
      cursor = ''
    } = cleanQuery

    const parsedPage = Math.max(parseInt(Array.isArray(page) ? page[0] : page, 10) || 0, 0)
    const parsedPageSizeValue = Array.isArray(pageSize) ? pageSize[0] : pageSize
    const parsedPageSize = parsedPageSizeValue === 'all'
      ? 'all'
      : Math.min(Math.max(parseInt(parsedPageSizeValue, 10) || DEFAULT_PAGE_SIZE, 1), 200)

    const shouldIncludeStats = parseBoolean(Array.isArray(includeStats) ? includeStats[0] : includeStats)
    const limitToUser = !isAdmin || parseBoolean(Array.isArray(mine) ? mine[0] : mine)

    const cursorValueRaw = Array.isArray(cursor) ? cursor[0] : cursor
    const cursorTimestamp = cursorValueRaw ? Date.parse(cursorValueRaw) : NaN
    const hasCursor = Number.isFinite(cursorTimestamp)

    const sortFieldKey = Array.isArray(sortBy) ? sortBy[0] : sortBy
    const orderField = ALLOWED_SORT_FIELDS.has(sortFieldKey) ? SORT_FIELD_MAP[sortFieldKey] : SORT_FIELD_MAP.date
    const orderAscending = (Array.isArray(sortOrder) ? sortOrder[0] : sortOrder) === 'asc'

    const statusFilter = Array.isArray(status) ? status[0] : status
    const programFilter = Array.isArray(program) ? program[0] : program
    const institutionFilter = Array.isArray(institution) ? institution[0] : institution
    const paymentStatusFilter = Array.isArray(paymentStatus) ? paymentStatus[0] : paymentStatus
    const searchTerm = Array.isArray(search) ? search[0] : search
    const startDateFilter = Array.isArray(startDate) ? startDate[0] : startDate
    const endDateFilter = Array.isArray(endDate) ? endDate[0] : endDate

    const selectOptions = { count: hasCursor ? undefined : 'exact' }

    let query = supabaseAdminClient
      .from('applications_new')
      .select(APPLICATION_LIST_COLUMNS.join(','), selectOptions)

    if (limitToUser) {
      query = query.eq('user_id', user.id)
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    } else {
      query = query.in('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected'])
    }

    if (programFilter && programFilter !== 'all') {
      query = query.eq('program', programFilter)
    }

    if (institutionFilter && institutionFilter !== 'all') {
      query = query.eq('institution', institutionFilter)
    }

    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      query = query.eq('payment_status', paymentStatusFilter)
    }

    if (startDateFilter) {
      query = query.gte('created_at', startDateFilter)
    }

    if (endDateFilter) {
      query = query.lte('created_at', `${endDateFilter}T23:59:59`)
    }

    if (searchTerm) {
      const sanitizedSearch = sanitizeSearchTerm(searchTerm)
      query = query.or(
        [
          `full_name.ilike.%${sanitizedSearch}%`,
          `email.ilike.%${sanitizedSearch}%`,
          `application_number.ilike.%${sanitizedSearch}%`,
          `phone.ilike.%${sanitizedSearch}%`,
          `nrc_number.ilike.%${sanitizedSearch}%`
        ].join(',')
      )
    }

    if (hasCursor) {
      const cursorIso = new Date(cursorTimestamp).toISOString()
      query = query.gt('updated_at', cursorIso)
        .order('updated_at', { ascending: true })
        .limit(MAX_DELTA_RESULTS)
    } else {
      query = query.order(orderField, { ascending: orderAscending })

      if (parsedPageSize !== 'all') {
        const rangeStart = parsedPage * parsedPageSize
        const rangeEnd = rangeStart + parsedPageSize - 1
        query = query.range(rangeStart, rangeEnd)
      }
    }

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    let stats = null
    if (shouldIncludeStats) {
      stats = await fetchApplicationStats(limitToUser ? user.id : null)
    }

    let latestCursor = null
    if (Array.isArray(data) && data.length > 0) {
      let maxTimestamp = Number.isFinite(cursorTimestamp) ? cursorTimestamp : null
      for (const row of data) {
        const candidate = row.updated_at || row.created_at
        const candidateTimestamp = candidate ? Date.parse(candidate) : NaN
        if (Number.isFinite(candidateTimestamp) && (!maxTimestamp || candidateTimestamp > maxTimestamp)) {
          maxTimestamp = candidateTimestamp
        }
      }

      if (Number.isFinite(maxTimestamp)) {
        latestCursor = new Date(maxTimestamp).toISOString()
      }
    }

    if (!latestCursor && Number.isFinite(cursorTimestamp)) {
      latestCursor = new Date(cursorTimestamp).toISOString()
    }

    if (latestCursor) {
      res.setHeader('X-Applications-Cursor', latestCursor)
    }

    return res.status(200).json({
      applications: data || [],
      totalCount: hasCursor ? undefined : (count || 0),
      stats,
      cursor: latestCursor,
      deltaCount: hasCursor ? (data?.length || 0) : undefined,
      changes: hasCursor ? (data || []) : undefined
    })
  } catch (error) {
    console.error('Applications GET error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function fetchApplicationStats(userId) {
  try {
    const { data, error } = await supabaseAdminClient
      .rpc('get_application_stats', { filter_user_id: userId })

    if (error) {
      throw error
    }

    const stats = {
      total: 0,
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0
    }

    data.forEach(row => {
      if (row.status && stats.hasOwnProperty(row.status)) {
        stats[row.status] = parseInt(row.count) || 0
        stats.total += stats[row.status]
      }
    })

    return stats
  } catch (error) {
    console.error('Failed to fetch application stats', error)
    return null
  }
}

async function handlePost(req, res, { user }) {
  try {
    const payload = req.body || {}

    const applicationData = {
      ...payload,
      user_id: user.id,
      status: payload.status || 'draft'
    }

    const { data, error } = await supabaseAdminClient
      .from('applications_new')
      .insert(applicationData)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    notifyAdminsOfNewApplication(data).catch(emailError => {
      console.error('Failed to send admin application notification email:', emailError)
    })

    return res.status(201).json(data)
  } catch (error) {
    console.error('Applications POST error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function getAdminNotificationRecipients() {
  const rawRecipients = process.env.APPLICATION_ADMIN_EMAILS || process.env.ADMIN_NOTIFICATION_RECIPIENTS || ''
  return rawRecipients
    .split(/[;,\s]+/)
    .map(email => email.trim())
    .filter(Boolean)
}

async function notifyAdminsOfNewApplication(application) {
  const recipients = getAdminNotificationRecipients()

  if (!recipients.length) {
    console.warn('Admin notification email recipients not configured. Skipping admin email for new application.')
    return
  }

  const applicationNumber = String(application?.application_number || 'N/A')
  const applicantName = String(application?.full_name || application?.name || 'Unknown Applicant')
  const programName = String(application?.program || 'Unspecified Program')
  const applicantEmail = typeof application?.email === 'string' ? application.email : ''
  const applicantPhone = typeof application?.phone === 'string' ? application.phone : ''
  const submissionTimestamp = application?.created_at || new Date().toISOString()
  const status = typeof application?.status === 'string' ? application.status : ''

  try {
    const { error } = await supabaseAdminClient.functions.invoke('send-email', {
      body: {
        to: recipients,
        subject: `New application received: ${applicationNumber}`,
        template: 'admin-new-application',
        data: {
          applicationNumber,
          applicantName,
          programName,
          submittedAt: submissionTimestamp,
          applicationStatus: status,
          applicantEmail,
          applicantPhone
        }
      }
    })

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Admin notification email invocation failed:', error)
  }
}
