import { apiClient, buildQueryString } from './client'

type QueryValue = string | number | boolean | Array<string | number> | undefined
type TelemetryQueryParams = Record<string, QueryValue>

const getMetrics = () => apiClient.request(`/api/analytics${buildQueryString({ action: 'metrics' })}`)
const getTelemetrySummary = (params: TelemetryQueryParams = {}) =>
  apiClient.request(
    `/api/analytics${buildQueryString({ action: 'telemetry', ...params })}`
  )

export const analyticsService = {
  getMetrics,
  getTelemetrySummary
}
