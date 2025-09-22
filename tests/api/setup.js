import { vi } from 'vitest'

// Mock Supabase client
export const createMockQueryBuilder = () => {
  const builder = {}

  builder.execute = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
  builder.select = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.or = vi.fn(() => builder)
  builder.ilike = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.range = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.single = vi.fn().mockResolvedValue({ data: {}, error: null })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  builder.mockResolvedValue = vi.fn((value) => {
    builder.execute.mockResolvedValue(value)
    return builder
  })
  builder.mockResolvedValueOnce = vi.fn((value) => {
    builder.execute.mockResolvedValueOnce(value)
    return builder
  })
  builder.then = vi.fn((onFulfilled, onRejected) => builder.execute().then(onFulfilled, onRejected))
  builder.catch = vi.fn((onRejected) => builder.execute().catch(onRejected))

  return builder
}

export const mockSupabaseClient = {
  from: vi.fn(() => createMockQueryBuilder()),
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null })
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null })
    }))
  }
}

// Mock request/response helpers
export const createMockReq = (overrides = {}) => ({
  method: 'GET',
  query: {},
  body: null,
  headers: {},
  params: {},
  ...overrides
})

export const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: vi.fn((name, value) => { res.headers[name] = value }),
    status: vi.fn((code) => { res.statusCode = code; return res }),
    json: vi.fn((data) => { res.body = JSON.stringify(data); return res })
  }
  return res
}

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key'
process.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.EMAIL_PROVIDER = 'resend'
process.env.EMAIL_FROM = 'test@test.com'
process.env.NODE_ENV = 'test'