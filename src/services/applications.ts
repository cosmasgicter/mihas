import { apiClient, buildQueryString } from './client'

type ApplicationIncludeOptions = {
  include?: string[]
}

export const applicationService = {
  list: (params?: Record<string, any>) =>
    apiClient.request(`/api/applications${buildQueryString(params)}`),

  // Alias for backward compatibility
  getAll: (params?: Record<string, any>) =>
    apiClient.request(`/api/applications${buildQueryString(params)}`),

  getById: (id: string, options?: ApplicationIncludeOptions) =>
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

  verifyDocument: (
    id: string,
    payload: { documentId?: string; documentType?: string; status: string; notes?: string }
  ) =>
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
