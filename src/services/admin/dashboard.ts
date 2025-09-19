import { apiClient } from '../client'

export type AdminDashboardSystemHealth = 'excellent' | 'good' | 'warning' | 'critical'

export interface AdminDashboardStatusBreakdown {
  total: number
  draft: number
  submitted: number
  underReview: number
  approved: number
  rejected: number
}

export interface AdminDashboardPeriodTotals {
  today: number
  last7Days: number
  last30Days: number
}

export interface AdminDashboardProcessingMetrics {
  averageProcessingTimeHours: number
  medianProcessingTimeHours: number
  p95ProcessingTimeHours: number
  throughputPerHour: number
  backlog: number
  activeReviewers: number
}

export interface AdminDashboardActivityItem {
  id: string
  type: 'application' | 'approval' | 'rejection' | 'system'
  message: string
  timestamp: string
  user?: string
}

export interface AdminDashboardMetricsResponse {
  statusBreakdown: AdminDashboardStatusBreakdown
  periodTotals: AdminDashboardPeriodTotals
  processingMetrics: AdminDashboardProcessingMetrics
  systemHealth: AdminDashboardSystemHealth
  recentActivity: AdminDashboardActivityItem[]
}

export const adminDashboardService = {
  getMetrics: async (): Promise<AdminDashboardMetricsResponse> =>
    apiClient.request('/api/admin/dashboard')
}
