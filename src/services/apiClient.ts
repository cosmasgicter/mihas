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
  getAll: () => apiClient.request('/api/applications'),
  
  getById: (id: string) => apiClient.request(`/api/applications/${id}`),
  
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