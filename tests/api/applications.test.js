import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient,
  getUserFromRequest: vi.fn().mockResolvedValue({ user: { id: '123' }, roles: ['student'] })
}))

describe('Applications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/applications', () => {
    it('should fetch applications for authenticated user', async () => {
      const { default: applicationsHandler } = await import('../../api/applications/index.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', status: 'pending' }],
        error: null
      })

      await applicationsHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('applications')
    })
  })

  describe('POST /api/applications', () => {
    it('should create new application', async () => {
      const { default: applicationsHandler } = await import('../../api/applications/index.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1',
          firstName: 'John',
          lastName: 'Doe'
        })
      })
      const res = createMockRes()

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: { id: 'app-1' },
        error: null
      })

      await applicationsHandler(req, res)

      expect(res.statusCode).toBe(201)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('applications')
    })
  })

  describe('PUT /api/applications/bulk', () => {
    it('should update multiple applications', async () => {
      const { default: bulkHandler } = await import('../../api/applications/bulk.js')
      
      const req = createMockReq({
        method: 'PUT',
        body: JSON.stringify({
          applicationIds: ['1', '2'],
          updates: { status: 'approved' }
        })
      })
      const res = createMockRes()

      mockSupabaseClient.from().update().mockResolvedValue({
        data: [],
        error: null
      })

      await bulkHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })
})