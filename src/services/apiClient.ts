import { monitoring } from '@/lib/monitoring'

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-vercel-app.vercel.app'
  : 'http://localhost:3000'

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('supabase.auth.token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const start = Date.now()
    const service = endpoint.split('/')[2] || 'unknown'
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
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
  login: (credentials: { email: string; password: string }) =>
    apiClient.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (data: { email: string; password: string; fullName: string }) =>
    apiClient.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

// Application Service
export const applicationService = {
  list: (params?: Record<string, any>) =>
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
    apiClient.request('/api/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}

// Analytics Service
export const analyticsService = {
  getMetrics: () => apiClient.request('/api/analytics/metrics')
}

export const catalogService = {
  getPrograms: () => apiClient.request('/api/catalog/programs'),
  getIntakes: () => apiClient.request('/api/catalog/intakes'),
  getSubjects: () => apiClient.request('/api/catalog/grade12-subjects')
}