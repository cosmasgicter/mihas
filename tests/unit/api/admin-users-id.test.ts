import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import type { MockInstance } from 'vitest'

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'

const nodeRequire = createRequire(import.meta.url)
const supabaseModulePath = nodeRequire.resolve('../../../api/_lib/supabaseClient.js')
const helperModulePath = nodeRequire.resolve('../../../api/_lib/adminUserHelpers.js')
const auditLoggerModulePath = nodeRequire.resolve('../../../api/_lib/auditLogger.js')
const usersIndexModulePath = nodeRequire.resolve('../../../api/admin/users/index.js')
const userByIdModulePath = nodeRequire.resolve('../../../api/admin/users/[id].js')
const userRoleModulePath = nodeRequire.resolve('../../../api/admin/users/[id]/role.js')
const userPermissionsModulePath = nodeRequire.resolve('../../../api/admin/users/[id]/permissions.js')

type HelperModule = typeof import('../../../api/_lib/adminUserHelpers.js')

interface TestRequest {
  method: string
  headers: Record<string, string>
  query?: Record<string, unknown>
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
  delete nodeRequire.cache[auditLoggerModulePath]
  delete nodeRequire.cache[usersIndexModulePath]
  delete nodeRequire.cache[userByIdModulePath]
  delete nodeRequire.cache[userRoleModulePath]
  delete nodeRequire.cache[userPermissionsModulePath]
}

let supabaseAdminClient: any
let requireUserMock: MockInstance<[TestRequest, { requireAdmin: boolean }], Promise<unknown>>
let clearRequestRoleCacheMock: MockInstance<[TestRequest], void>
let logAuditEventMock: MockInstance<[Record<string, unknown>], Promise<void>>

function mockSupabaseModule() {
  supabaseAdminClient = {
    from: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null })
      }
    }
  }

  requireUserMock = vi.fn().mockResolvedValue({ user: { id: 'admin-1', email: 'admin@example.com' }, roles: ['admin'] })
  clearRequestRoleCacheMock = vi.fn()
  logAuditEventMock = vi.fn().mockResolvedValue(undefined)

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
  nodeRequire.cache[auditLoggerModulePath] = {
    id: auditLoggerModulePath,
    filename: auditLoggerModulePath,
    loaded: true,
    exports: {
      logAuditEvent: logAuditEventMock
    }
  }
}

async function loadHandler(
  modulePath: string,
  configureHelpers?: (stubs: HelperModule, actual: HelperModule) => void
) {
  const actualHelpers = await import('../../../api/_lib/adminUserHelpers.js')
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

  const module = await import(pathToFileURL(modulePath).href)
  const handlerExport = (module as any).default ?? module
  return { handler: handlerExport as Handler, helpers: stubHelpers, actualHelpers }
}

describe('admin user API routes', () => {
  beforeEach(() => {
    vi.resetModules()
    clearModuleCache()
    mockSupabaseModule()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearModuleCache()
  })

  describe('api/admin/users/index', () => {
    it('returns a list of user profiles for GET requests', async () => {
      const { handler } = await loadHandler(usersIndexModulePath)
      const listResult = {
        data: [
          { user_id: 'user-1', email: 'first@example.com' },
          { user_id: 'user-2', email: 'second@example.com' }
        ],
        error: null
      }

      const listBuilder = {
        select: vi.fn(() => listBuilder),
        order: vi.fn(() => Promise.resolve(listResult))
      }

      supabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return listBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const req: TestRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: {}
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(requireUserMock).toHaveBeenCalledWith(req, { requireAdmin: true })
      expect(listBuilder.select).toHaveBeenCalledWith('*')
      expect(listBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ data: listResult.data })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.list',
          metadata: expect.objectContaining({ total: listResult.data.length })
        })
      )
    })

    it('creates a user profile on POST requests', async () => {
      const { handler } = await loadHandler(usersIndexModulePath)

      supabaseAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const profileResult = {
        data: {
          user_id: 'user-123',
          email: 'new@example.com',
          full_name: 'New User',
          phone: '+260123456789',
          role: 'student'
        },
        error: null
      }

      const insertBuilder = {
        insert: vi.fn(() => insertBuilder),
        select: vi.fn(() => insertBuilder),
        single: vi.fn(() => Promise.resolve(profileResult))
      }

      supabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return insertBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const req: TestRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: {
          email: 'new@example.com',
          password: 'password123',
          full_name: 'New User',
          phone: '+260123456789',
          role: 'student'
        }
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(requireUserMock).toHaveBeenCalledWith(req, { requireAdmin: true })
      expect(supabaseAdminClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        email_confirm: true
      })
      expect(insertBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        email: 'new@example.com',
        full_name: 'New User',
        phone: '+260123456789',
        role: 'student'
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ data: profileResult.data })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.create',
          targetId: 'user-123',
          metadata: expect.objectContaining({ email: 'new@example.com', role: 'student' })
        })
      )
    })

    it('creates a user profile when POST body is a JSON string', async () => {
      const { handler } = await loadHandler(usersIndexModulePath)

      supabaseAdminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'user-456' } },
        error: null
      })

      const profileResult = {
        data: {
          user_id: 'user-456',
          email: 'string@example.com',
          full_name: 'String Body User',
          phone: '+260987654321',
          role: 'staff'
        },
        error: null
      }

      const insertBuilder = {
        insert: vi.fn(() => insertBuilder),
        select: vi.fn(() => insertBuilder),
        single: vi.fn(() => Promise.resolve(profileResult))
      }

      supabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return insertBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const req: TestRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: JSON.stringify({
          email: 'string@example.com',
          password: 'password456',
          full_name: 'String Body User',
          phone: '+260987654321',
          role: 'staff'
        })
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(requireUserMock).toHaveBeenCalledWith(req, { requireAdmin: true })
      expect(supabaseAdminClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'string@example.com',
        password: 'password456',
        email_confirm: true
      })
      expect(insertBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-456',
        email: 'string@example.com',
        full_name: 'String Body User',
        phone: '+260987654321',
        role: 'staff'
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ data: profileResult.data })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.create',
          targetId: 'user-456',
          metadata: expect.objectContaining({ email: 'string@example.com', role: 'staff' })
        })
      )
    })

    it('returns 400 when POST body JSON string is malformed', async () => {
      const { handler } = await loadHandler(usersIndexModulePath)

      const req: TestRequest = {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        query: {},
        body: '{ invalid json'
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid JSON body' })
      expect(supabaseAdminClient.auth.admin.createUser).not.toHaveBeenCalled()
      expect(logAuditEventMock).not.toHaveBeenCalled()
    })
  })

  describe('api/admin/users/[id]', () => {
    it('returns a user profile for GET requests', async () => {
      let fetchUserProfileSpy: MockInstance<[string], Promise<unknown>>
      const { handler } = await loadHandler(userByIdModulePath, helpers => {
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
      expect(res.json).toHaveBeenCalledWith({ user_id: 'user-123', email: 'user@example.com' })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.users.view', targetId: 'user-123' })
      )
    })

    it('updates auth metadata and profile records on PUT', async () => {
      let syncUserRoleSpy: MockInstance<[string, string], Promise<unknown>>
      let updateAuthSpy: MockInstance<[string, Record<string, unknown>], Promise<unknown>>
      const { handler } = await loadHandler(userByIdModulePath, helpers => {
        syncUserRoleSpy = vi.fn().mockResolvedValue(undefined)
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
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.update',
          targetId: 'user-123',
          metadata: expect.objectContaining({ updatedFields: ['full_name', 'email', 'phone', 'role'] })
        })
      )
    })

    it('returns 400 when no valid fields are provided on PUT', async () => {
      const { handler } = await loadHandler(userByIdModulePath)

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
      const { handler } = await loadHandler(userByIdModulePath, helpers => {
        fetchUserProfileSpy = vi.fn().mockResolvedValue({ user_id: 'user-123', email: 'user@example.com' })
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
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.delete',
          targetId: 'user-123',
          metadata: expect.objectContaining({ profileEmail: 'user@example.com' })
        })
      )
    })

    it('returns 404 when the requested profile is missing on GET', async () => {
      let fetchUserProfileSpy: MockInstance<[string], Promise<unknown>>
      const { handler } = await loadHandler(userByIdModulePath, helpers => {
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

  describe('api/admin/users/[id]/role', () => {
    it('returns the active role for the user', async () => {
      let fetchActiveRoleSpy: MockInstance<[string], Promise<unknown>>
      const { handler } = await loadHandler(userRoleModulePath, helpers => {
        fetchActiveRoleSpy = vi
          .fn()
          .mockResolvedValue({ id: 1, role: 'admin', user_id: 'user-123' })
        helpers.fetchActiveRole = fetchActiveRoleSpy as HelperModule['fetchActiveRole']
      })

      const req: TestRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { id: 'user-123' }
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(fetchActiveRoleSpy!).toHaveBeenCalledWith('user-123')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ id: 1, role: 'admin', user_id: 'user-123' })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.role.view',
          targetId: 'user-123',
          metadata: expect.objectContaining({ activeRole: 'admin' })
        })
      )
    })
  })

  describe('api/admin/users/[id]/permissions', () => {
    it('returns saved permissions for the user', async () => {
      const { handler } = await loadHandler(userPermissionsModulePath)

      const permissionsResult = {
        data: { permissions: ['manage-users', 'view-reports'] },
        error: null
      }

      const selectBuilder = {
        select: vi.fn(() => selectBuilder),
        eq: vi.fn(() => selectBuilder),
        maybeSingle: vi.fn(() => Promise.resolve(permissionsResult))
      }

      supabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_permissions') {
          return selectBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const req: TestRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { id: 'user-123' }
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(selectBuilder.select).toHaveBeenCalledWith('permissions')
      expect(selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ data: permissionsResult.data.permissions })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.permissions.view',
          targetId: 'user-123',
          metadata: expect.objectContaining({ permissionsCount: 2 })
        })
      )
    })

    it('updates permissions on PUT requests', async () => {
      const { handler } = await loadHandler(userPermissionsModulePath)

      const upsertBuilder = {
        upsert: vi.fn(() => upsertBuilder),
        select: vi.fn(() => upsertBuilder),
        single: vi.fn(() => Promise.resolve({ data: { permissions: ['read', 'write'] }, error: null }))
      }

      supabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_permissions') {
          return upsertBuilder
        }
        throw new Error(`Unexpected table ${table}`)
      })

      const req: TestRequest = {
        method: 'PUT',
        headers: { authorization: 'Bearer token' },
        query: { id: 'user-123' },
        body: JSON.stringify({ permissions: ['read', 'read', ' write ', '', 123] })
      }
      const res = createMockResponse()

      await handler(req, res)

      expect(upsertBuilder.upsert).toHaveBeenCalled()
      const upsertPayload = upsertBuilder.upsert.mock.calls[0][0]
      expect(upsertPayload).toMatchObject({ user_id: 'user-123' })
      expect(upsertPayload.permissions).toEqual(['read', 'write'])
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ data: ['read', 'write'] })
      expect(logAuditEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.users.permissions.update',
          targetId: 'user-123',
          metadata: expect.objectContaining({ permissionsCount: 2 })
        })
      )
    })
  })
})
