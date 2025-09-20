import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient,
  getUserFromRequest: vi.fn().mockResolvedValue({ user: { id: '123' }, roles: ['admin'] })
}))

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/notifications/send', () => {
    it('should send notification', async () => {
      const { default: sendHandler } = await import('../../api/notifications/send.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          to: 'test@test.com',
          subject: 'Test',
          message: 'Test message'
        })
      })
      const res = createMockRes()

      await sendHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('POST /api/notifications/application-submitted', () => {
    it('should send application submitted notification', async () => {
      const { default: appSubmittedHandler } = await import('../../api/notifications/application-submitted.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          applicationId: 'app-123',
          userEmail: 'test@test.com'
        })
      })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ id: 'app-123', firstName: 'John', lastName: 'Doe' }],
        error: null
      })

      await appSubmittedHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('GET /api/notifications/preferences', () => {
    it('should fetch user notification preferences', async () => {
      const { default: preferencesHandler } = await import('../../api/notifications/preferences.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ email_notifications: true, sms_notifications: false }],
        error: null
      })

      await preferencesHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })
})