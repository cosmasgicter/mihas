import { apiClient } from './client'

export const catalogService = {
  getPrograms: () => apiClient.request('/api/catalog?resource=programs'),
  getIntakes: () => apiClient.request('/api/catalog?resource=intakes'),
  getSubjects: () => apiClient.request('/api/catalog?resource=subjects')
}

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
