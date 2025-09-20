import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient
}))

describe('Catalog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/catalog/programs', () => {
    it('should fetch all programs', async () => {
      const { default: programsHandler } = await import('../../api/catalog/programs/index.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', name: 'Nursing', institution: 'MIHAS' }],
        error: null
      })

      await programsHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('programs')
    })
  })

  describe('GET /api/catalog/intakes', () => {
    it('should fetch intake periods', async () => {
      const { default: intakesHandler } = await import('../../api/catalog/intakes/index.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', name: 'January 2024', isActive: true }],
        error: null
      })

      await intakesHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('intake_periods')
    })
  })

  describe('GET /api/catalog/subjects', () => {
    it('should fetch subjects by program', async () => {
      const { default: subjectsHandler } = await import('../../api/catalog/subjects.js')
      
      const req = createMockReq({
        method: 'GET',
        query: { programId: 'prog-1' }
      })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: '1', name: 'Biology', code: 'BIO101' }],
        error: null
      })

      await subjectsHandler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subjects')
    })
  })
})