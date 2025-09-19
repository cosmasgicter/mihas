import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'module'
import type { MockInstance } from 'vitest'

const rpcMock = vi.fn()
const getUserFromRequestMock = vi.fn()
const nodeRequire = createRequire(import.meta.url)
const supabaseModulePath = nodeRequire.resolve('../../../api/_lib/supabaseClient.js')

type StatusMock = MockInstance<[number], TestResponse>
type JsonMock = MockInstance<[unknown], TestResponse>

interface TestRequest {
  method: string
  headers: Record<string, string>
}

interface TestResponse {
  statusCode: number
  body?: unknown
  status: StatusMock
  json: JsonMock
}

function mockSupabaseModule() {
  nodeRequire.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: {
      supabaseAdminClient: { rpc: rpcMock },
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
    status: vi.fn<[number], TestResponse>(code => {
      response.statusCode = code
      return response
    }) as StatusMock,
    json: vi.fn<[unknown], TestResponse>(payload => {
      response.body = payload
      return response
    }) as JsonMock
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
    rpcMock.mockReset()
    getUserFromRequestMock.mockReset()
  })

  afterEach(() => {
    clearSupabaseModule()
  })

  afterAll(() => {
    clearSupabaseModule()
  })

  it('returns aggregated stats and recent activity from RPC payload', async () => {
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
    rpcMock.mockResolvedValue({ data: overview, error: null })

    const req = { method: 'GET', headers: { authorization: 'Bearer token' } }
    const res = createMockResponse()

    await handler(req, res)

    expect(rpcMock).toHaveBeenCalledWith('get_admin_dashboard_overview')
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
  })

  it('returns an error response when the RPC fails', async () => {
    getUserFromRequestMock.mockResolvedValue({ user: { id: 'admin' }, roles: ['admin'], isAdmin: true })
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc failure' } })

    const req = { method: 'GET', headers: { authorization: 'Bearer token' } }
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to load admin dashboard overview' })
  })
})
