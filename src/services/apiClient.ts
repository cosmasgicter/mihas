import { monitoring } from '@/lib/monitoring'
import { supabase } from '@/lib/supabase'
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

function buildQueryString(params: Record<string, any> = {}) {
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

// Auth Service
export const authService = {
  register: (data: { email: string; password: string; fullName: string }) =>
    apiClient.request('/api/auth?action=register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  login: (data: { email: string; password: string }) =>
    apiClient.request('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  signin: (data: { email: string; password: string }) =>
    apiClient.request('/api/auth?action=signin', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

// Application Service
export const applicationService = {
  list: (params?: Record<string, any>) =>
    apiClient.request(`/api/applications${buildQueryString(params)}`),

  // Alias for backward compatibility
  getAll: (params?: Record<string, any>) =>
    apiClient.request(`/api/applications${buildQueryString(params)}`),

  getById: (id: string, options?: { include?: string[] }) =>
    apiClient.request(`/api/applications/${id}${buildQueryString({ include: options?.include })}`),

  create: (data: any) =>
    apiClient.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: any) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'DELETE'
    }),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_status', status, notes })
    }),

  updatePaymentStatus: (id: string, paymentStatus: string) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_payment_status', paymentStatus })
    }),

  verifyDocument: (id: string, payload: { documentId?: string; documentType?: string; status: string; notes?: string }) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'verify_document', ...payload })
    }),

  syncGrades: (id: string, grades: Array<{ subject_id: string; grade: number }>) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'sync_grades', grades })
    }),

  sendNotification: (id: string, notification: { title: string; message: string }) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'send_notification', ...notification })
    })
}

// Document Service
export const documentService = {
  upload: (data: { fileName: string; fileData: any; documentType: string; applicationId: string }) =>
    apiClient.request('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

// Notification Service
export const notificationService = {
  send: (data: { userId: string; type: string; title: string; message: string; data?: any }) =>
    apiClient.request('/api/notifications?action=send', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  applicationSubmitted: (data: { applicationId: string; userId: string }) =>
    apiClient.request('/api/notifications?action=application-submitted', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

// Analytics Service
export const analyticsService = {
  getMetrics: () => apiClient.request('/api/analytics/metrics')
}

export const catalogService = {
  getPrograms: () => apiClient.request('/api/catalog?resource=programs'),
  getIntakes: () => apiClient.request('/api/catalog?resource=intakes'),
  getSubjects: () => apiClient.request('/api/catalog?resource=subjects')
}

// Program Service
export const programService = {
  list: () => apiClient.request('/api/catalog?resource=programs'),
  create: (data: { name: string; description?: string; duration_years: number; institution_id: string }) =>
    apiClient.request('/api/catalog?resource=programs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (data: { id: string; name: string; description?: string; duration_years: number; institution_id: string }) =>
    apiClient.request('/api/catalog?resource=programs', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    apiClient.request('/api/catalog?resource=programs', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    })
}

// Intake Service
export const intakeService = {
  list: () => apiClient.request('/api/catalog?resource=intakes'),
  create: (data: { name: string; year: number; start_date: string; end_date: string; application_deadline: string; total_capacity: number; available_spots?: number }) =>
    apiClient.request('/api/catalog?resource=intakes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (data: { id: string; name: string; year: number; start_date: string; end_date: string; application_deadline: string; total_capacity: number; available_spots?: number }) =>
    apiClient.request('/api/catalog?resource=intakes', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  delete: (id: string) =>
    apiClient.request('/api/catalog?resource=intakes', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    })
}

// User Service
export const userService = {
  list: () => apiClient.request('/api/admin/users'),
  create: (data: { email: string; password: string; full_name: string; phone?: string; role: string }) =>
    apiClient.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (id: string, data: { full_name: string; email: string; phone?: string; role: string }) =>
    apiClient.request(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  remove: (id: string) =>
    apiClient.request(`/api/admin/users/${id}`, {
      method: 'DELETE'
    })
}

// Admin Dashboard Service
export const adminDashboardService = {
  getMetrics: () => apiClient.request('/api/admin/dashboard')
}