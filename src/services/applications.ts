import { Application } from '@/lib/supabase'

import { apiClient, buildQueryString, QueryParams } from './client'

type ApplicationIncludeOptions = {
  include?: string[]
}

type ApplicationPayload = Partial<Application>

export const applicationService = {
  list: (params?: QueryParams) =>
    apiClient.request<Application[]>(`/api/applications${buildQueryString(params ?? {})}`),

  // Alias for backward compatibility
  getAll: (params?: QueryParams) =>
    apiClient.request<Application[]>(`/api/applications${buildQueryString(params ?? {})}`),

  getById: (id: string, options?: ApplicationIncludeOptions) =>
    apiClient.request<any>(
      `/api/applications/${id}${buildQueryString({ include: options?.include ?? [] })}`
    ),

  create: (data: ApplicationPayload) =>
    apiClient.request<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: ApplicationPayload) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    apiClient.request<void>(`/api/applications/${id}`, {
      method: 'DELETE'
    }),

  updateStatus: (id: string, status: Application['status'], notes?: string) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'update_status', status, notes })
    }),

  updatePaymentStatus: (
    id: string,
    paymentStatus: Application['payment_status'],
    verificationNotes?: string
  ) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'update_payment_status',
        paymentStatus,
        verificationNotes: verificationNotes || undefined
      })
    }),

  verifyDocument: (
    id: string,
    payload: { documentId?: string; documentType?: string; status: string; notes?: string }
  ) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'verify_document', ...payload })
    }),

  syncGrades: (id: string, grades: Array<{ subject_id: string; grade: number }>) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'sync_grades', grades })
    }),

  sendNotification: (id: string, notification: { title: string; message: string }) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'send_notification', ...notification })
    }),

  generateAcceptanceLetter: (id: string) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'generate_acceptance_letter' })
    }),

  generateFinanceReceipt: (id: string) =>
    apiClient.request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'generate_finance_receipt' })
    })
}
