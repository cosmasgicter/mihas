import { apiClient, buildQueryString } from './client'

type QueryValue = string | number | boolean | Array<string | number> | undefined
type TelemetryQueryParams = Record<string, QueryValue>

export const analyticsService = {
  getMetrics: () => apiClient.request('/api/analytics/metrics'),
  getTelemetrySummary: (params: TelemetryQueryParams = {}) =>
    apiClient.request(`/api/analytics/telemetry${buildQueryString(params)}`)
}
