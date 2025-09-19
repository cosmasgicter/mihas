import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'module'
import type { MockInstance } from 'vitest'

const fromMock = vi.fn()
let selectMock: MockInstance<[string], QueryBuilder>
let eqMock: MockInstance<[string, unknown], QueryBuilder>
let maybeSingleMock: MockInstance<[], Promise<{ data: unknown; error: unknown }>>
const getUserFromRequestMock = vi.fn()
const nodeRequire = createRequire(import.meta.url)
const supabaseModulePath = nodeRequire.resolve('../../../api/_lib/supabaseClient.js')

type StatusMock = MockInstance<[number], TestResponse>
type JsonMock = MockInstance<[unknown], TestResponse>
type SetHeaderMock = MockInstance<[string, string], TestResponse>

interface QueryBuilder {
  eq: (column: string, value: unknown) => QueryBuilder
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>
}

interface TestRequest {
  method: string
  headers: Record<string, string>
}

interface TestResponse {
  statusCode: number
  body?: unknown
  headers: Record<string, string>
  status: StatusMock
  json: JsonMock
  setHeader: SetHeaderMock
}

function mockSupabaseModule() {
  nodeRequire.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: {
      supabaseAdminClient: { from: fromMock },
      getUserFromRequest: getUserFromRequestMock
    }
  }
}

function clearSupabaseModule() {
  delete nodeRequire.cache[supabaseModulePath]
}

type Handler = (req: TestRequest, res: TestResponse) => Promise<void>
let handler: Handler

function createMockResponse(): TestResponse {
  const response = {
    statusCode: 200,
    headers: {},
    status: vi.fn<[number], TestResponse>(code => {
      response.statusCode = code
      return response
    }) as StatusMock,
    json: vi.fn<[unknown], TestResponse>(payload => {
      response.body = payload
      return response
    }) as JsonMock,
    setHeader: vi.fn<[string, string], TestResponse>((name, value) => {
      response.headers[name] = value
      return response
    }) as SetHeaderMock
  } as TestResponse

  return response
}

describe('api/admin/dashboard', () => {
  beforeAll(async () => {
    const module = await import('../../../api/admin/dashboard.js')
    handler = (module.default || module) as Handler
  })

  beforeEach(() => {
    mockSupabaseModule()
    fromMock.mockReset()
    getUserFromRequestMock.mockReset()

    maybeSingleMock = vi.fn()
    selectMock = vi.fn()
    eqMock = vi.fn()

    const queryBuilder: QueryBuilder = {
      eq: ((column: string, value: unknown) => {
        eqMock(column, value)
        return queryBuilder
      }) as QueryBuilder['eq'],
      maybeSingle: maybeSingleMock
    }

    selectMock.mockReturnValue(queryBuilder)
    fromMock.mockReturnValue({ select: selectMock })
  })

  afterEach(() => {
    clearSupabaseModule()
  })

  afterAll(() => {
    clearSupabaseModule()
  })

  it('returns aggregated stats and recent activity from cached payload', async () => {
    const overview = {
      status_counts: {
        total: 100,
        draft: 10,
        submitted: 30,
        under_review: 20,
        approved: 25,
        rejected: 15
      },
      totals: {
        active_programs: 3,
        active_intakes: 2,
        students: 150
      },
      application_counts: {
        today: 5,
        this_week: 18,
        this_month: 60
      },
      processing_metrics: {
        average_hours: 48,
        median_hours: 36,
        p95_hours: 120,
        decision_velocity_24h: 4,
        completed_count: 40,
        active_admins_last_24h: 6,
        active_admins_last_7d: 12
      },
      recent_activity: [
        {
          id: '1',
          full_name: 'Jane Admin',
          status: 'approved',
          payment_status: 'verified',
          submitted_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T12:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          program: 'Clinical Medicine',
          intake: 'January 2025'
        }
      ]
    }

    getUserFromRequestMock.mockResolvedValue({ user: { id: 'admin' }, roles: ['admin'], isAdmin: true })
    maybeSingleMock.mockResolvedValue({
      data: { metrics: overview, generated_at: '2025-02-21T10:00:00Z' },
      error: null
    })

    const req = { method: 'GET', headers: { authorization: 'Bearer token' } }
    const res = createMockResponse()

    await handler(req, res)

    expect(fromMock).toHaveBeenCalledWith('admin_dashboard_metrics_cache')
    expect(selectMock).toHaveBeenCalledWith('metrics, generated_at')
    expect(eqMock).toHaveBeenCalledWith('id', 'overview')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=30, s-maxage=60, stale-while-revalidate=60'
    )
    expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Authorization')
    expect(res.setHeader).toHaveBeenCalledWith('X-Generated-At', 'Fri, 21 Feb 2025 10:00:00 GMT')
    expect(res.headers['Vary']).toBe('Authorization')
    expect(res.headers['X-Generated-At']).toBe('Fri, 21 Feb 2025 10:00:00 GMT')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledTimes(1)

    const payload = res.json.mock.calls[0][0]

    expect(payload.stats.totalApplications).toBe(overview.status_counts.total)
    expect(payload.stats.pendingApplications).toBe(
      overview.status_counts.submitted + overview.status_counts.under_review
    )
    expect(payload.stats.statusBreakdown).toEqual(overview.status_counts)
    expect(payload.stats.avgProcessingTimeHours).toBe(overview.processing_metrics.average_hours)
    expect(payload.processingMetrics.decision_velocity_24h).toBe(overview.processing_metrics.decision_velocity_24h)

    expect(payload.recentActivity).toHaveLength(1)
    expect(payload.recentActivity[0]).toMatchObject({
      id: '1',
      type: 'approval',
      message: 'Jane Admin - Application approved'
    })
    expect(payload.generatedAt).toBe('2025-02-21T10:00:00.000Z')
  })

  it('returns an error response when the cache lookup fails', async () => {
    getUserFromRequestMock.mockResolvedValue({ user: { id: 'admin' }, roles: ['admin'], isAdmin: true })
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'cache failure' } })

    const req = { method: 'GET', headers: { authorization: 'Bearer token' } }
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load admin dashboard overview' })
  })
})
