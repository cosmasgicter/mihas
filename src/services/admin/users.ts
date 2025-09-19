import { apiClient } from '../client'

export const userService = {
  list: () => apiClient.request('/api/admin/users'),
  getById: (id: string) => apiClient.request(`/api/admin/users/${id}`),
  getRole: (id: string) => apiClient.request(`/api/admin/users/${id}?action=role`),
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
