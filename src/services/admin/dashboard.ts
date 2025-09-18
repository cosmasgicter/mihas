import { apiClient } from '../client'

export const adminDashboardService = {
  getMetrics: () => apiClient.request('/api/admin/dashboard')
}
