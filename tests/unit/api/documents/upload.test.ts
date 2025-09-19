import { createRequire } from 'module'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key'

const require = createRequire(import.meta.url)

const storageUploadMock = vi.fn()
const storageFromMock = vi.fn(() => ({ upload: storageUploadMock }))
const fromMock = vi.fn()
const getUserFromRequestMock = vi.fn()

const supabaseModule = require('../../../../api/_lib/supabaseClient.js')
const supabaseAdminClientStub = {
  storage: {
    from: storageFromMock
  },
  from: (...args: any[]) => fromMock(...args)
}
supabaseModule.supabaseAdminClient = supabaseAdminClientStub
supabaseModule.getUserFromRequest = getUserFromRequestMock

const rateLimiterModule = require('../../../../api/_lib/rateLimiter.js')
rateLimiterModule.setRateLimiterStore(rateLimiterModule.createInMemoryFallbackStore())

const handler = require('../../../../api/documents/upload.js')

const BASE_REQUEST_BODY = {
  fileName: 'transcript.pdf',
  fileData: `data:application/pdf;base64,${Buffer.from('%PDF-1.4 test document').toString('base64')}`,
  documentType: 'transcript',
  applicationId: 'app-123'
}

const createRequest = (overrides: Partial<{ method: string; headers: Record<string, string>; body: any }> = {}) => {
  const baseRequest = {
    method: 'POST',
    headers: {
      authorization: 'Bearer fake-token'
    },
    body: { ...BASE_REQUEST_BODY }
  }

  return {
    ...baseRequest,
    ...overrides,
    headers: {
      ...baseRequest.headers,
      ...(overrides.headers ?? {})
    },
    body: {
      ...baseRequest.body,
      ...(overrides.body ?? {})
    }
  }
}

const createResponse = () => {
  return {
    statusCode: 200,
    payload: undefined as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: any) {
      this.payload = data
      return this
    }
  }
}

beforeEach(() => {
  storageUploadMock.mockReset()
  storageFromMock.mockReset()
  storageFromMock.mockReturnValue({ upload: storageUploadMock })
  fromMock.mockReset()
  getUserFromRequestMock.mockReset()
  getUserFromRequestMock.mockResolvedValue({ user: { id: 'user-123' }, isAdmin: false })
})

describe('documents upload handler validation', () => {
  it('rejects disallowed file extensions before touching storage', async () => {
    const req = createRequest({
      body: {
        fileName: 'malware.exe'
      }
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.payload).toEqual({ error: 'File type is not allowed' })
    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects uploads that exceed the configured size limit', async () => {
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1)
    const req = createRequest({
      body: {
        fileData: `data:application/pdf;base64,${largeBuffer.toString('base64')}`
      }
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(413)
    expect(res.payload).toEqual({ error: 'File exceeds the maximum allowed size of 10MB' })
    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rejects tampered or malformed base64 payloads', async () => {
    const req = createRequest({
      body: {
        fileData: 'data:application/pdf;base64,@@@'
      }
    })
    const res = createResponse()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.payload).toEqual({ error: 'Invalid file data encoding' })
    expect(storageFromMock).not.toHaveBeenCalled()
    expect(fromMock).not.toHaveBeenCalled()
  })
})
