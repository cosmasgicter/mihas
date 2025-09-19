import { test, expect } from '@playwright/test'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

test.describe('Governance consent and audit enforcement', () => {
  const projectRoot = path.resolve(__dirname, '..', '..')
  const supabaseModulePath = path.join(projectRoot, 'api/_lib/supabaseClient.js')
  const userConsentModulePath = path.join(projectRoot, 'api/_lib/userConsent.js')
  const auditLoggerModulePath = path.join(projectRoot, 'api/_lib/auditLogger.js')
  const rateLimiterModulePath = path.join(projectRoot, 'api/_lib/rateLimiter.js')

  function registerMock(modulePath: string, exports: Record<string, unknown>) {
    delete require.cache[modulePath]
    require.cache[modulePath] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports
    } as NodeModule
  }

  function resetMocks() {
    delete require.cache[supabaseModulePath]
    delete require.cache[userConsentModulePath]
    delete require.cache[auditLoggerModulePath]
    delete require.cache[rateLimiterModulePath]
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_SMS_FROM
    delete process.env.TWILIO_SMS_MESSAGING_SERVICE_SID
  }

  function createResponse() {
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(payload: unknown) {
        this.body = payload
        return this
      },
      setHeader: () => undefined
    }
    return res
  }

  test.afterEach(() => {
    resetMocks()
  })

  test('notification dispatch is blocked without outreach consent and audit event is recorded', async () => {
    const auditEvents: string[] = []

    registerMock(auditLoggerModulePath, {
      logAuditEvent: async ({ action }: { action: string }) => {
        auditEvents.push(action)
      }
    })

    registerMock(userConsentModulePath, {
      hasActiveConsent: async () => ({ active: false })
    })

    registerMock(rateLimiterModulePath, {
      buildRateLimitKey: () => 'test-rate-limit',
      getLimiterConfig: () => ({}),
      attachRateLimitHeaders: () => undefined,
      checkRateLimit: async () => ({ isLimited: false })
    })

    process.env.TWILIO_ACCOUNT_SID = 'test-sid'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_SMS_FROM = '+10000000000'
    process.env.TWILIO_SMS_MESSAGING_SERVICE_SID = 'test-service'

    registerMock(supabaseModulePath, {
      supabaseAdminClient: {
        from: () => ({
          insert: async () => ({ data: null, error: null })
        })
      },
      getUserFromRequest: async () => ({
        user: { id: 'admin-1', email: 'admin@example.com' },
        roles: ['admin'],
        isAdmin: true
      })
    })

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const notificationsHandler = require(path.join(projectRoot, 'api/notifications.js'))

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
      query: { action: 'dispatch-channel' },
      body: {
        userId: 'student-123',
        channel: 'sms',
        content: 'Test message',
        type: 'update'
      }
    } as unknown as IncomingMessage & { query: Record<string, unknown>; body: Record<string, unknown> }

    const res = createResponse() as unknown as ServerResponse & { body: unknown; status: (code: number) => typeof res; json: (payload: unknown) => typeof res }

    await notificationsHandler(req, res)

    expect(res.statusCode).toBe(412)
    expect(res.body).toMatchObject({ error: expect.stringContaining('consent') })
    expect(auditEvents).toContain('notifications.channel.blocked')
  })

  test('analytics metrics request fails gracefully when no analytics consent exists', async () => {
    const auditEvents: string[] = []

    registerMock(auditLoggerModulePath, {
      logAuditEvent: async ({ action }: { action: string }) => {
        auditEvents.push(action)
      }
    })

    registerMock(userConsentModulePath, {
      listActiveConsentUserIds: async () => []
    })

    registerMock(rateLimiterModulePath, {
      buildRateLimitKey: () => 'analytics-test',
      getLimiterConfig: () => ({}),
      attachRateLimitHeaders: () => undefined,
      checkRateLimit: async () => ({ isLimited: false })
    })

    registerMock(supabaseModulePath, {
      supabaseAdminClient: {
        from: () => ({})
      },
      getUserFromRequest: async () => ({
        user: { id: 'admin-2', email: 'analytics@example.com' },
        roles: ['admin'],
        isAdmin: true
      })
    })

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handleMetricsRequest } = require(path.join(projectRoot, 'api/_lib/analytics/metrics.js'))

    const req = {
      headers: { authorization: 'Bearer test-token' },
      query: {}
    } as unknown as IncomingMessage & { query: Record<string, unknown> }

    const res = createResponse() as unknown as ServerResponse & { body: unknown; status: (code: number) => typeof res; json: (payload: unknown) => typeof res }

    await handleMetricsRequest(req, res)

    expect(res.statusCode).toBe(412)
    expect(res.body).toMatchObject({ error: expect.stringContaining('consent') })
    expect(auditEvents).toContain('analytics.metrics.blocked')
  })
})
