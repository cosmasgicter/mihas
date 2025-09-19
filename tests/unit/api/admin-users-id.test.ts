import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'module'
import type { MockInstance } from 'vitest'

const nodeRequire = createRequire(import.meta.url)
const supabaseModulePath = nodeRequire.resolve('../../../api/_lib/supabaseClient.js')
const helperModulePath = nodeRequire.resolve('../../../api/admin/users/userHelpers.js')
const handlerModulePath = nodeRequire.resolve('../../../api/admin/users/[id].js')

type HelperModule = typeof import('../../../api/admin/users/userHelpers.js')

interface TestRequest {
  method: string
  headers: Record<string, string>
  query: Record<string, unknown>
  body?: unknown
}

interface TestResponse {
  statusCode: number
  body?: unknown
  headers: Record<string, string>
  status: MockInstance<[number], TestResponse>
  json: MockInstance<[unknown], TestResponse>
  setHeader: MockInstance<[string, string], TestResponse>
}

type Handler = (req: TestRequest, res: TestResponse) => Promise<void>

function createMockResponse(): TestResponse {
  const response = {
    statusCode: 200,
    headers: {},
    status: vi.fn<[number], TestResponse>(code => {
      response.statusCode = code
      return response
    }),
    json: vi.fn<[unknown], TestResponse>(payload => {
      response.body = payload
      return response
    }),
    setHeader: vi.fn<[string, string], TestResponse>((name, value) => {
      response.headers[name] = value
      return response
    })
  } as TestResponse

  return response
}

function clearModuleCache() {
  delete nodeRequire.cache[supabaseModulePath]
  delete nodeRequire.cache[helperModulePath]
  delete nodeRequire.cache[handlerModulePath]
}

let supabaseAdminClient: any
let requireUserMock: MockInstance<[TestRequest, { requireAdmin: boolean }], Promise<unknown>>
let clearRequestRoleCacheMock: MockInstance<[TestRequest], void>

function mockSupabaseModule() {
  supabaseAdminClient = {
    from: vi.fn(),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null })
      }
    }
  }

  requireUserMock = vi.fn().mockResolvedValue({ user: { id: 'admin-1' }, isAdmin: true })
  clearRequestRoleCacheMock = vi.fn()

  nodeRequire.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: {
      supabaseAdminClient,
      requireUser: requireUserMock,
      clearRequestRoleCache: clearRequestRoleCacheMock
    }
  }
}

async function loadHandler(
  configureHelpers?: (stubs: HelperModule, actual: HelperModule) => void
) {
  const actualHelpers = await import('../../../api/admin/users/userHelpers.js')
  const stubHelpers: HelperModule = {
    fetchUserProfile: actualHelpers.fetchUserProfile,
    fetchActiveRole: actualHelpers.fetchActiveRole,
    syncUserRole: actualHelpers.syncUserRole,
    parseUserId: actualHelpers.parseUserId,
    parseAction: actualHelpers.parseAction,
    parseRequestBody: actualHelpers.parseRequestBody,
    updateAuthUserMetadata: actualHelpers.updateAuthUserMetadata
  }

  configureHelpers?.(stubHelpers, actualHelpers)

  nodeRequire.cache[helperModulePath] = {
    id: helperModulePath,
    filename: helperModulePath,
    loaded: true,
    exports: stubHelpers
  }

  const module = await import('../../../api/admin/users/[id].js')
  const handler = (module.default || module) as Handler
  return { handler, helpers: stubHelpers, actualHelpers }
}

describe('api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetModules()
    clearModuleCache()
    mockSupabaseModule()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearModuleCache()
  })

  it('returns a user profile for GET requests', async () => {
    let fetchUserProfileSpy: MockInstance<[string], Promise<unknown>>
    const { handler } = await loadHandler(helpers => {
      fetchUserProfileSpy = vi
        .fn()
        .mockResolvedValue({ user_id: 'user-123', email: 'user@example.com' })
      helpers.fetchUserProfile = fetchUserProfileSpy as HelperModule['fetchUserProfile']
    })

    const req: TestRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { id: 'user-123' }
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(requireUserMock).toHaveBeenCalledWith(req, { requireAdmin: true })
    expect(fetchUserProfileSpy!).toHaveBeenCalledWith('user-123')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: { user_id: 'user-123', email: 'user@example.com' } })
  })

  it('returns the active role when action=role is provided', async () => {
    let fetchActiveRoleSpy: MockInstance<[string], Promise<unknown>>
    const { handler } = await loadHandler(helpers => {
      fetchActiveRoleSpy = vi
        .fn()
        .mockResolvedValue({ id: 1, role: 'admin', user_id: 'user-123' })
      helpers.fetchActiveRole = fetchActiveRoleSpy as HelperModule['fetchActiveRole']
    })

    const req: TestRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { id: 'user-123', action: 'role' }
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(fetchActiveRoleSpy!).toHaveBeenCalledWith('user-123')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: 1, role: 'admin', user_id: 'user-123' })
  })

  it('updates auth metadata and profile records on PUT', async () => {
    let syncUserRoleSpy: MockInstance<[string, string], Promise<unknown>>
    let updateAuthSpy: MockInstance<[string, Record<string, unknown>], Promise<unknown>>
    const { handler } = await loadHandler(helpers => {
      syncUserRoleSpy = vi.fn().mockResolvedValue()
      helpers.syncUserRole = syncUserRoleSpy as HelperModule['syncUserRole']

      const originalUpdateAuth = helpers.updateAuthUserMetadata
      updateAuthSpy = vi.fn((...args: Parameters<HelperModule['updateAuthUserMetadata']>) =>
        originalUpdateAuth(...args)
      )
      helpers.updateAuthUserMetadata = updateAuthSpy as HelperModule['updateAuthUserMetadata']
    })

    const profileUpdateResult = {
      data: {
        user_id: 'user-123',
        email: 'updated@example.com',
        full_name: 'Updated User',
        phone: '+260777000111',
        role: 'admin'
      },
      error: null
    }

    const updateBuilder = {
      update: vi.fn(() => updateBuilder),
      eq: vi.fn(() => updateBuilder),
      select: vi.fn(() => updateBuilder),
      single: vi.fn(() => Promise.resolve(profileUpdateResult))
    }

    supabaseAdminClient.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return updateBuilder
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const req: TestRequest = {
      method: 'PUT',
      headers: { authorization: 'Bearer token' },
      query: { id: 'user-123' },
      body: JSON.stringify({
        full_name: 'Updated User',
        email: 'updated@example.com',
        phone: '+260777000111',
        role: 'admin'
      })
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(updateAuthSpy!).toHaveBeenCalledWith('user-123', {
      full_name: 'Updated User',
      email: 'updated@example.com',
      phone: '+260777000111',
      role: 'admin'
    })
    expect(supabaseAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
      email: 'updated@example.com',
      user_metadata: {
        full_name: 'Updated User',
        phone: '+260777000111'
      },
      app_metadata: {
        role: 'admin',
        roles: ['admin']
      }
    })
    expect(updateBuilder.update).toHaveBeenCalledWith({
      full_name: 'Updated User',
      email: 'updated@example.com',
      phone: '+260777000111',
      role: 'admin'
    })
    expect(syncUserRoleSpy!).toHaveBeenCalledWith('user-123', 'admin')
    expect(clearRequestRoleCacheMock).toHaveBeenCalledWith(req)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ data: profileUpdateResult.data })
  })

  it('returns 400 when no valid fields are provided on PUT', async () => {
    const { handler } = await loadHandler()

    const req: TestRequest = {
      method: 'PUT',
      headers: { authorization: 'Bearer token' },
      query: { id: 'user-123' },
      body: JSON.stringify({ invalid: 'value' })
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'No valid fields provided for update' })
  })

  it('deletes auth account, roles, and profile records on DELETE', async () => {
    let fetchUserProfileSpy: MockInstance<[string], Promise<unknown>>
    const { handler } = await loadHandler(helpers => {
      fetchUserProfileSpy = vi.fn().mockResolvedValue({ user_id: 'user-123' })
      helpers.fetchUserProfile = fetchUserProfileSpy as HelperModule['fetchUserProfile']
    })

    const rolesDeleteBuilder = {
      delete: vi.fn(() => rolesDeleteBuilder),
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }

    const profilesDeleteBuilder = {
      delete: vi.fn(() => profilesDeleteBuilder),
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }

    supabaseAdminClient.from.mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return rolesDeleteBuilder
      }
      if (table === 'user_profiles') {
        return profilesDeleteBuilder
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const req: TestRequest = {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
      query: { id: 'user-123' }
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(fetchUserProfileSpy!).toHaveBeenCalledWith('user-123')
    expect(supabaseAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-123')
    expect(rolesDeleteBuilder.delete).toHaveBeenCalled()
    expect(rolesDeleteBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(profilesDeleteBuilder.delete).toHaveBeenCalled()
    expect(profilesDeleteBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(clearRequestRoleCacheMock).toHaveBeenCalledWith(req)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('returns 404 when the requested profile is missing on GET', async () => {
    let fetchUserProfileSpy: MockInstance<[string], Promise<unknown>>
    const { handler } = await loadHandler(helpers => {
      fetchUserProfileSpy = vi.fn().mockResolvedValue(null)
      helpers.fetchUserProfile = fetchUserProfileSpy as HelperModule['fetchUserProfile']
    })

    const req: TestRequest = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { id: 'missing-user' }
    }
    const res = createMockResponse()

    await handler(req, res)

    expect(fetchUserProfileSpy!).toHaveBeenCalledWith('missing-user')
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' })
  })
})
