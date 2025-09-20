import { vi } from 'vitest'

// Mock Supabase client
const createMockQueryBuilder = () => {
  const mockResolvedValue = vi.fn().mockResolvedValue({ data: [], error: null })
  
  return {
    select: vi.fn(() => ({ mockResolvedValue })),
    insert: vi.fn(() => ({ mockResolvedValue })),
    update: vi.fn(() => ({ mockResolvedValue })),
    delete: vi.fn(() => ({ mockResolvedValue })),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
    mockResolvedValue
  }
}

export const mockSupabaseClient = {
  from: vi.fn(() => createMockQueryBuilder()),
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null })
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