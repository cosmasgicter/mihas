import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockReq, createMockRes } from './setup.js'
import './setup.js'
import { createRequire } from 'module'

const nodeRequire = createRequire(import.meta.url)
const applicationModulePath = nodeRequire.resolve('../../api/applications/[id].js')
const supabaseClientModulePath = nodeRequire.resolve('../../api/_lib/supabaseClient.js')
const auditLoggerModulePath = nodeRequire.resolve('../../api/_lib/auditLogger.js')
const rateLimiterModulePath = nodeRequire.resolve('../../api/_lib/rateLimiter.js')

let handler
let supabaseAdminClient
let getUserFromRequest
let logAuditEvent
let checkRateLimit
let buildRateLimitKey
let getLimiterConfig
let attachRateLimitHeaders

function cleanupModuleMocks() {
  delete nodeRequire.cache[supabaseClientModulePath]
  delete nodeRequire.cache[auditLoggerModulePath]
  delete nodeRequire.cache[rateLimiterModulePath]
  delete nodeRequire.cache[applicationModulePath]
  handler = undefined
}

function prepareModuleMocks() {
  cleanupModuleMocks()

  supabaseAdminClient = {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }
  getUserFromRequest = vi.fn()
  logAuditEvent = vi.fn().mockResolvedValue(undefined)
  checkRateLimit = vi.fn().mockResolvedValue({ isLimited: false })
  buildRateLimitKey = vi.fn(() => 'rate-key')
  getLimiterConfig = vi.fn(() => ({}))
  attachRateLimitHeaders = vi.fn()

  nodeRequire.cache[supabaseClientModulePath] = {
    id: supabaseClientModulePath,
    filename: supabaseClientModulePath,
    loaded: true,
    exports: {
      supabaseAdminClient,
      getUserFromRequest,
    },
  }

  nodeRequire.cache[auditLoggerModulePath] = {
    id: auditLoggerModulePath,
    filename: auditLoggerModulePath,
    loaded: true,
    exports: {
      logAuditEvent,
    },
  }

  nodeRequire.cache[rateLimiterModulePath] = {
    id: rateLimiterModulePath,
    filename: rateLimiterModulePath,
    loaded: true,
    exports: {
      checkRateLimit,
      buildRateLimitKey,
      getLimiterConfig,
      attachRateLimitHeaders,
    },
  }

  handler = nodeRequire(applicationModulePath)
}

describe('Applications interview actions API', () => {
  beforeEach(() => {
    prepareModuleMocks()

    getUserFromRequest.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com' },
      roles: ['admin'],
      isAdmin: true,
    })
  })

  afterEach(() => {
    cleanupModuleMocks()
  })

  const buildApplicationQuery = (application) => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: application, error: null }),
    }
    return builder
  }

  const buildInterviewQuery = (interviewData) => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: interviewData, error: null }),
    }
    return builder
  }

  it('schedules a new interview', async () => {
    const application = { id: 'app-123', user_id: 'user-1', full_name: 'Test User', email: 'user@example.com', phone: '123456789' }
    const interview = {
      id: 'int-1',
      application_id: 'app-123',
      scheduled_at: '2024-05-02T09:00:00.000Z',
      mode: 'in_person',
      status: 'scheduled',
      location: 'Campus Office',
      notes: null,
    }

    supabaseAdminClient.from.mockImplementation((table) => {
      if (table === 'applications_new') {
        return buildApplicationQuery(application)
      }
      if (table === 'application_interviews') {
        return buildInterviewQuery(null)
      }
      throw new Error(`Unexpected table ${table}`)
    })
    supabaseAdminClient.rpc.mockResolvedValue({ data: interview, error: null })

    const req = createMockReq({
      method: 'PATCH',
      params: { id: 'app-123' },
      body: {
        action: 'schedule_interview',
        scheduledAt: '2024-05-02T09:00:00Z',
        mode: 'in_person',
        location: 'Campus Office',
        notes: 'Bring documents',
      },
    })
    const res = createMockRes()

    await handler(req, res)

    expect(getUserFromRequest).toHaveBeenCalled()
    expect(checkRateLimit).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(supabaseAdminClient.rpc).toHaveBeenCalledWith('manage_application_interview', {
      p_action: 'schedule',
      p_application_id: 'app-123',
      p_location: 'Campus Office',
      p_mode: 'in_person',
      p_notes: 'Bring documents',
      p_scheduled_at: '2024-05-02T09:00:00.000Z',
    })
    expect(JSON.parse(res.body)).toEqual({ interview })
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'applications.interview.schedule',
        targetId: interview.id,
      }),
    )
  })

  it('reschedules an existing interview', async () => {
    const application = { id: 'app-123', user_id: 'user-1', full_name: 'Test User', email: 'user@example.com', phone: '123456789' }
    const updatedInterview = {
      id: 'int-1',
      application_id: 'app-123',
      scheduled_at: '2024-05-03T10:00:00.000Z',
      mode: 'virtual',
      status: 'rescheduled',
      location: 'Zoom',
      notes: 'Use provided link',
    }

    supabaseAdminClient.from.mockImplementation((table) => {
      if (table === 'applications_new') {
        return buildApplicationQuery(application)
      }
      if (table === 'application_interviews') {
        return buildInterviewQuery(null)
      }
      throw new Error(`Unexpected table ${table}`)
    })
    supabaseAdminClient.rpc.mockResolvedValue({ data: updatedInterview, error: null })

    const req = createMockReq({
      method: 'PATCH',
      params: { id: 'app-123' },
      body: {
        action: 'reschedule_interview',
        scheduledAt: '2024-05-03T10:00:00Z',
        mode: 'virtual',
        location: 'Zoom',
        notes: 'Use provided link',
      },
    })
    const res = createMockRes()

    await handler(req, res)

    expect(getUserFromRequest).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(supabaseAdminClient.rpc).toHaveBeenCalledWith('manage_application_interview', {
      p_action: 'reschedule',
      p_application_id: 'app-123',
      p_location: 'Zoom',
      p_mode: 'virtual',
      p_notes: 'Use provided link',
      p_scheduled_at: '2024-05-03T10:00:00.000Z',
    })
    expect(JSON.parse(res.body)).toEqual({ interview: updatedInterview })
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'applications.interview.reschedule',
        targetId: updatedInterview.id,
      }),
    )
  })

  it('cancels a scheduled interview', async () => {
    const application = { id: 'app-123', user_id: 'user-1', full_name: 'Test User', email: 'user@example.com', phone: '123456789' }
    const cancelledInterview = {
      id: 'int-1',
      application_id: 'app-123',
      scheduled_at: '2024-05-02T09:00:00.000Z',
      mode: 'in_person',
      status: 'cancelled',
      location: 'Campus Office',
      notes: 'Rescheduled separately',
    }

    supabaseAdminClient.from.mockImplementation((table) => {
      if (table === 'applications_new') {
        return buildApplicationQuery(application)
      }
      if (table === 'application_interviews') {
        return buildInterviewQuery(null)
      }
      throw new Error(`Unexpected table ${table}`)
    })
    supabaseAdminClient.rpc.mockResolvedValue({ data: cancelledInterview, error: null })

    const req = createMockReq({
      method: 'PATCH',
      params: { id: 'app-123' },
      body: {
        action: 'cancel_interview',
        notes: 'Rescheduled separately',
      },
    })
    const res = createMockRes()

    await handler(req, res)

    expect(getUserFromRequest).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    expect(supabaseAdminClient.rpc).toHaveBeenCalledWith('manage_application_interview', {
      p_action: 'cancel',
      p_application_id: 'app-123',
      p_location: null,
      p_mode: null,
      p_notes: 'Rescheduled separately',
      p_scheduled_at: null,
    })
    expect(JSON.parse(res.body)).toEqual({ interview: cancelledInterview })
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'applications.interview.cancel',
        targetId: cancelledInterview.id,
      }),
    )
  })
})
