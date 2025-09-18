import { apiClient } from './client'

export const analyticsService = {
  getMetrics: () => apiClient.request('/api/analytics/metrics')
}
