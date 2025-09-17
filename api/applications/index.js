import { supabaseAdminClient, getUserFromRequest } from '../_lib/supabaseClient'

const DEFAULT_PAGE_SIZE = 15
const ALLOWED_SORT_FIELDS = new Set(['date', 'name', 'status'])
const SORT_FIELD_MAP = {
  date: 'created_at',
  name: 'full_name',
  status: 'status'
}

function sanitizeSearchTerm(term = '') {
  return term.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
}

function parseBoolean(value) {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return Boolean(value)
}

export default async function handler(req, res) {
  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, authContext)
    case 'POST':
      return handlePost(req, res, authContext)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res, { user, isAdmin }) {
  try {
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
      mine = 'false'
    } = req.query

    const parsedPage = Math.max(parseInt(Array.isArray(page) ? page[0] : page, 10) || 0, 0)
    const parsedPageSizeValue = Array.isArray(pageSize) ? pageSize[0] : pageSize
    const parsedPageSize = parsedPageSizeValue === 'all'
      ? 'all'
      : Math.min(Math.max(parseInt(parsedPageSizeValue, 10) || DEFAULT_PAGE_SIZE, 1), 200)

    const shouldIncludeStats = parseBoolean(Array.isArray(includeStats) ? includeStats[0] : includeStats)
    const limitToUser = !isAdmin || parseBoolean(Array.isArray(mine) ? mine[0] : mine)

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

    let query = supabaseAdminClient
      .from('applications_new')
      .select('*', { count: 'exact' })

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

    query = query.order(orderField, { ascending: orderAscending })

    if (parsedPageSize !== 'all') {
      const rangeStart = parsedPage * parsedPageSize
      const rangeEnd = rangeStart + parsedPageSize - 1
      query = query.range(rangeStart, rangeEnd)
    }

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    let stats = null
    if (shouldIncludeStats) {
      stats = await fetchApplicationStats(limitToUser ? user.id : null)
    }

    return res.status(200).json({
      applications: data || [],
      totalCount: count || 0,
      stats
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

    return res.status(201).json(data)
  } catch (error) {
    console.error('Applications POST error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
