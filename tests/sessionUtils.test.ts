import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSessionToken, makeAuthenticatedRequest } from '@/lib/sessionUtils'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

describe('sessionUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSessionToken', () => {
    it('should return token when session is valid', async () => {
      const mockSession = { access_token: 'valid-token' }
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await getSessionToken()
      
      expect(result.token).toBe('valid-token')
      expect(result.error).toBeNull()
    })

    it('should return error when no session exists', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getSessionToken()
      
      expect(result.token).toBeNull()
      expect(result.error).toBe('No active session')
    })

    it('should return error when session has no access token', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: {} },
        error: null
      })

      const result = await getSessionToken()
      
      expect(result.token).toBeNull()
      expect(result.error).toBe('No active session')
    })

    it('should handle auth errors', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth error' }
      })

      const result = await getSessionToken()
      
      expect(result.token).toBeNull()
      expect(result.error).toBe('Auth error')
    })
  })

  describe('makeAuthenticatedRequest', () => {
    it('should make request with valid token', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'valid-token' } },
        error: null
      })

      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      await makeAuthenticatedRequest('/api/test')
      
      expect(fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token'
        }
      })
    })

    it('should throw error when no token available', async () => {
      const { supabase } = await import('@/lib/supabase')
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(makeAuthenticatedRequest('/api/test')).rejects.toThrow('No active session')
    })
  })
})