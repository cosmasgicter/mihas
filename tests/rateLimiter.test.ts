import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

describe('shared rate limiter', () => {
  let rateLimiter: typeof import('../api/_lib/rateLimiter')

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()

    process.env.RATE_LIMIT_DEFAULT_WINDOW_MS = '1000'
    process.env.RATE_LIMIT_DEFAULT_MAX_ATTEMPTS = '3'
    process.env.RATE_LIMIT_TABLE = 'test_rate_limits'
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

    const module = await import('../api/_lib/rateLimiter.js')
    rateLimiter = (module.default || module) as typeof import('../api/_lib/rateLimiter')
    rateLimiter.setRateLimiterStore(rateLimiter.createInMemoryFallbackStore())
  })

  afterEach(() => {
    vi.useRealTimers()
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('enforces maximum attempts within the window', async () => {
    const config = rateLimiter.getLimiterConfig('unit_test', { maxAttempts: 2, windowMs: 1000 })
    const key = 'test:ip:203.0.113.10'

    const first = await rateLimiter.checkRateLimit(key, config)
    expect(first.isLimited).toBe(false)
    expect(first.remaining).toBe(1)

    const second = await rateLimiter.checkRateLimit(key, config)
    expect(second.isLimited).toBe(false)
    expect(second.remaining).toBe(0)

    const third = await rateLimiter.checkRateLimit(key, config)
    expect(third.isLimited).toBe(true)
    expect(third.remaining).toBe(0)
    expect(third.limit).toBe(2)
  })

  it('allows requests again after the window expires', async () => {
    const config = rateLimiter.getLimiterConfig('window_reset', { maxAttempts: 1, windowMs: 1000 })
    const key = 'reset:user:123'

    const first = await rateLimiter.checkRateLimit(key, config)
    expect(first.isLimited).toBe(false)

    vi.advanceTimersByTime(1000)

    const second = await rateLimiter.checkRateLimit(key, config)
    expect(second.isLimited).toBe(false)
    expect(second.count).toBe(1)
  })
})
