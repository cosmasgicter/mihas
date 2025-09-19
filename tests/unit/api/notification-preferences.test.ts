import { createRequire } from 'module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nodeRequire = createRequire(import.meta.url)

const handlerModulePath = nodeRequire.resolve('../../../api/notifications.js')
const supabaseModulePath = nodeRequire.resolve('../../../api/_lib/supabaseClient.js')
const auditLoggerModulePath = nodeRequire.resolve('../../../api/_lib/auditLogger.js')
const rateLimiterModulePath = nodeRequire.resolve('../../../api/_lib/rateLimiter.js')
const userConsentModulePath = nodeRequire.resolve('../../../api/_lib/userConsent.js')
const nodeFetchModulePath = nodeRequire.resolve('node-fetch')

function registerMock(modulePath: string, exports: unknown) {
  nodeRequire.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports
  }
}

function clearModule(modulePath: string) {
  delete nodeRequire.cache[modulePath]
}

function loadNotificationsModule() {
  clearModule(handlerModulePath)
  return nodeRequire(handlerModulePath) as {
    normalizeChannelPreferences: (channels?: Array<{ type: string; enabled?: boolean; priority?: number }>) => Array<{
      type: string
      enabled: boolean
      priority: number
    }>
  }
}

describe('notification channel normalization', () => {
  beforeEach(() => {
    const fetchMock = Object.assign(vi.fn(), {
      Response: class {},
      Headers: class {}
    })

    registerMock(nodeFetchModulePath, fetchMock)
    registerMock(supabaseModulePath, {
      supabaseAdminClient: { from: vi.fn() },
      getUserFromRequest: vi.fn()
    })
    registerMock(auditLoggerModulePath, { logAuditEvent: vi.fn() })
    registerMock(rateLimiterModulePath, {
      checkRateLimit: vi.fn(async () => ({ isLimited: false })),
      buildRateLimitKey: vi.fn(() => 'test-rate-key'),
      getLimiterConfig: vi.fn(() => ({})),
      attachRateLimitHeaders: vi.fn()
    })
    registerMock(userConsentModulePath, {
      hasActiveConsent: vi.fn(async () => ({ active: true }))
    })
  })

  afterEach(() => {
    ;[
      handlerModulePath,
      nodeFetchModulePath,
      supabaseModulePath,
      auditLoggerModulePath,
      rateLimiterModulePath,
      userConsentModulePath
    ].forEach(clearModule)
  })

  it('enables SMS and WhatsApp by default when no record exists', () => {
    const notifications = loadNotificationsModule()
    const channels = notifications.normalizeChannelPreferences(undefined)

    const sms = channels.find(channel => channel.type === 'sms')
    const whatsapp = channels.find(channel => channel.type === 'whatsapp')

    expect(sms?.enabled).toBe(true)
    expect(whatsapp?.enabled).toBe(true)
  })

  it('retains persisted opt-outs when normalizing stored records', () => {
    const notifications = loadNotificationsModule()
    const channels = notifications.normalizeChannelPreferences([
      { type: 'sms', enabled: false, priority: 2 },
      { type: 'whatsapp', enabled: false, priority: 3 }
    ])

    expect(channels.find(channel => channel.type === 'sms')?.enabled).toBe(false)
    expect(channels.find(channel => channel.type === 'whatsapp')?.enabled).toBe(false)
  })
})
