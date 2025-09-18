import { monitoring } from '@/lib/monitoring'
import { getSupabaseClient } from '@/lib/supabase'
import { getApiBaseUrl } from '@/lib/apiConfig'

const API_BASE = getApiBaseUrl()

class ApiClient {
  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) {
      return {}
    }

    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries())
    }

    if (Array.isArray(headers)) {
      return headers.reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
    }

    return headers
  }

  private async getAuthHeaders() {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (typeof window === 'undefined') {
      return baseHeaders
    }

    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (token) {
        baseHeaders.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Failed to resolve Supabase session for API request:', error)
    }

    return baseHeaders
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const start = Date.now()
    const service = endpoint.split('/')[2] || 'unknown'

    try {
      const authHeaders = await this.getAuthHeaders()
      const requestHeaders = {
        ...authHeaders,
        ...this.normalizeHeaders(options.headers)
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: requestHeaders
      })

      const duration = Date.now() - start
      monitoring.trackApiCall(service, endpoint, duration, response.ok)

      if (!response.ok) {
        monitoring.logError(service, `${response.status}: ${response.statusText}`)
        throw new Error(`API Error: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      const duration = Date.now() - start
      monitoring.trackApiCall(service, endpoint, duration, false)
      monitoring.logError(service, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }
}

export const apiClient = new ApiClient()

export function buildQueryString(params: Record<string, any> = {}) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          query.append(key, String(item))
        }
      })
      return
    }

    query.append(key, String(value))
  })

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export type ApiClientRequest = ApiClient['request']
