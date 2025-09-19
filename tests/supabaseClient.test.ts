import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = { ...process.env }

function createRoleQueryMock(response: { data?: Array<{ role: string }>; error?: { message: string } | null }) {
  const finalEq = vi.fn(() => Promise.resolve(response))
  const firstEq = vi.fn(() => ({ eq: finalEq }))
  const select = vi.fn(() => ({ eq: firstEq }))
  return { select, firstEq, finalEq }
}

describe('supabaseClient role caching', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('reuses database roles for repeated calls on the same request', async () => {
    const module = await import('../api/_lib/supabaseClient.js')
    const { supabaseAdminClient, getUserFromRequest } = module

    const roleQuery = createRoleQueryMock({ data: [{ role: 'admin' }], error: null })
    supabaseAdminClient.from = vi.fn(() => ({ select: roleQuery.select })) as any
    supabaseAdminClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: {} } },
      error: null
    }) as any

    const req: any = { headers: { authorization: 'Bearer token-123' } }

    const first = await getUserFromRequest(req)
    expect(first.roles).toEqual(['admin'])
    expect((supabaseAdminClient.from as any).mock.calls.length).toBe(1)

    const second = await getUserFromRequest(req)
    expect(second.roles).toEqual(['admin'])
    expect((supabaseAdminClient.from as any).mock.calls.length).toBe(1)
  })

  it('pulls roles from token claims without hitting the database', async () => {
    const module = await import('../api/_lib/supabaseClient.js')
    const { supabaseAdminClient, getUserFromRequest } = module

    supabaseAdminClient.from = vi.fn(() => ({ select: vi.fn() })) as any
    supabaseAdminClient.auth.getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-claims',
          app_metadata: { roles: ['admissions_officer', 'staff'] }
        }
      },
      error: null
    }) as any

    const req: any = { headers: { authorization: 'Bearer token-claims' } }
    const result = await getUserFromRequest(req)

    expect(result.roles).toEqual(['admissions_officer', 'staff'])
    expect((supabaseAdminClient.from as any).mock.calls.length).toBe(0)
  })

  it('fetches roles again for a different request context', async () => {
    const module = await import('../api/_lib/supabaseClient.js')
    const { supabaseAdminClient, getUserFromRequest, clearRequestRoleCache } = module

    const roleQuery = createRoleQueryMock({ data: [{ role: 'admin' }], error: null })
    supabaseAdminClient.from = vi.fn(() => ({ select: roleQuery.select })) as any
    supabaseAdminClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-3', app_metadata: {} } },
      error: null
    }) as any

    const firstReq: any = { headers: { authorization: 'Bearer token-a' } }
    const secondReq: any = { headers: { authorization: 'Bearer token-b' } }

    await getUserFromRequest(firstReq)
    clearRequestRoleCache(firstReq)
    await getUserFromRequest(secondReq)

    expect((supabaseAdminClient.from as any).mock.calls.length).toBe(2)
  })
})
