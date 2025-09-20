import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient,
  getUserFromRequest: vi.fn().mockResolvedValue({ user: { id: '123' }, roles: ['admin'] })
}))

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('should fetch admin dashboard metrics', async () => {
      const { default: dashboardHandler } = await import('../../api/admin/dashboard.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ total_applications: 100, pending_reviews: 25 }],
        error: null
      })

      await dashboardHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('GET /api/admin/users', () => {
    it('should fetch all users for admin', async () => {
      const { default: usersHandler } = await import('../../api/admin/users/index.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', email: 'user@test.com', role: 'student' }],
        error: null
      })

      await usersHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('should update user details', async () => {
      const { default: userHandler } = await import('../../api/admin/users/[id].js')
      
      const req = createMockReq({
        method: 'PUT',
        params: { id: '123' },
        body: JSON.stringify({ role: 'admin' })
      })
      const res = createMockRes()

      mockSupabaseClient.from().update().mockResolvedValue({
        data: { id: '123', role: 'admin' },
        error: null
      })

      await userHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('GET /api/admin/audit-log', () => {
    it('should fetch audit log entries', async () => {
      const { default: auditHandler } = await import('../../api/admin/audit-log.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', action: 'user.login', timestamp: new Date() }],
        error: null
      })

      await auditHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_log')
    })
  })
})