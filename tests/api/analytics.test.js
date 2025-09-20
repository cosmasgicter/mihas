import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient } from './setup.js'

vi.mock('../../api/_lib/supabaseClient.js', () => ({
  supabaseAdminClient: mockSupabaseClient,
  getUserFromRequest: vi.fn().mockResolvedValue({ user: { id: '123' }, roles: ['admin'] })
}))

vi.mock('../../api/_lib/userConsent.js', () => ({
  listActiveConsentUserIds: vi.fn().mockResolvedValue(['123', '456'])
}))

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/analytics/metrics', () => {
    it('should fetch analytics metrics', async () => {
      const { default: metricsHandler } = await import('../../api/analytics/metrics.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ total_applications: 100, pending_applications: 25 }],
        error: null
      })

      await metricsHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })

  describe('POST /api/analytics/telemetry', () => {
    it('should ingest telemetry events', async () => {
      const { handleTelemetryIngest } = await import('../../api/_lib/analytics/telemetry.js')
      
      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          events: [{
            type: 'api_call',
            service: 'auth',
            endpoint: '/login',
            success: true,
            duration_ms: 150
          }]
        })
      })
      const res = createMockRes()

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: [],
        error: null
      })

      await handleTelemetryIngest(req, res)

      expect(res.statusCode).toBe(202)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_telemetry')
    })
  })

  describe('GET /api/analytics/predictive-dashboard', () => {
    it('should fetch predictive analytics', async () => {
      const { default: predictiveHandler } = await import('../../api/analytics/predictive-dashboard.js')
      
      const req = createMockReq({ method: 'GET' })
      const res = createMockRes()

      mockSupabaseClient.from().select().mockResolvedValue({
        data: [{ predicted_applications: 150, confidence: 0.85 }],
        error: null
      })

      await predictiveHandler(req, res)

      expect(res.statusCode).toBe(200)
    })
  })
})