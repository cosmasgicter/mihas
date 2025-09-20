import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

// Mock the supabase client
vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient,
  getUserFromRequest: vi.fn().mockResolvedValue({ user: { id: '123', email: 'test@test.com' }, roles: ['student'] })
}))

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const { default: loginHandler } = await import('../../api/auth/login.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' })
      })
      const res = createMockRes()

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' } },
        error: null
      })

      await loginHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123'
      })
    })

    it('should return 400 for invalid credentials', async () => {
      const { default: loginHandler } = await import('../../api/auth/login.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({ email: 'invalid', password: '' })
      })
      const res = createMockRes()

      await loginHandler(req, res)

      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const { default: registerHandler } = await import('../../api/auth/register.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          email: 'new@test.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        })
      })
      const res = createMockRes()

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: '456', email: 'new@test.com' } },
        error: null
      })

      await registerHandler(req, res)

      expect(res.statusCode).toBe(201)
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled()
    })
  })
})