import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

import { FixedAdminDashboard } from '../FixedAdminDashboard'
import type { AdminDashboardMetricsResponse } from '@/services/admin/dashboard'
import { adminDashboardService } from '@/services/admin/dashboard'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<any>('framer-motion')

  return {
    ...actual,
    useReducedMotion: () => true
  }
})

vi.mock('@/services/admin/dashboard', () => ({
  adminDashboardService: {
    getMetrics: vi.fn()
  }
}))

const mockDashboardMetrics: AdminDashboardMetricsResponse = {
  statusBreakdown: {
    total: 120,
    draft: 10,
    submitted: 20,
    underReview: 15,
    approved: 60,
    rejected: 15
  },
  periodTotals: {
    today: 5,
    last7Days: 35,
    last30Days: 95
  },
  processingMetrics: {
    averageProcessingTimeHours: 48,
    medianProcessingTimeHours: 36,
    p95ProcessingTimeHours: 96,
    throughputPerHour: 2.5,
    backlog: 35,
    activeReviewers: 8
  },
  systemHealth: 'good',
  recentActivity: [
    {
      id: '1',
      type: 'approval',
      message: 'Jane Doe - Application approved',
      timestamp: new Date().toISOString(),
      user: 'Jane Doe'
    }
  ]
}

describe('FixedAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders aggregated metrics from the dashboard service', async () => {
    vi.mocked(adminDashboardService.getMetrics).mockResolvedValue(mockDashboardMetrics)

    render(<FixedAdminDashboard />)

    const todayApplications = await screen.findByTestId('today-applications')
    expect(todayApplications).toBeTruthy()
    expect(todayApplications.textContent).toContain('5')

    expect(screen.getByTestId('pending-reviews').textContent).toContain('35')
    expect(screen.getByTestId('approval-rate').textContent).toContain('80%')
    expect(screen.getByTestId('avg-processing-time').textContent).toContain('2.0d')
    expect(screen.getByTestId('processing-throughput').textContent).toContain('2.50 /hr')
    expect(screen.getByTestId('processing-backlog').textContent).toContain('35')
    expect(screen.getByTestId('processing-reviewers').textContent).toContain('8')
    expect(screen.getByTestId('status-breakdown-approved').textContent).toContain('60 (50%)')
    expect(screen.getByTestId('system-health').textContent).toContain('Good')
    expect(screen.getByText('Jane Doe - Application approved')).toBeTruthy()
  })

  it('shows an error message when the dashboard service fails', async () => {
    vi.mocked(adminDashboardService.getMetrics).mockRejectedValue(new Error('network error'))

    render(<FixedAdminDashboard />)

    const errorMessage = await screen.findByText('Failed to load dashboard metrics')
    expect(errorMessage).toBeTruthy()
  })

  it('refreshes metrics using the dashboard service when the refresh button is clicked', async () => {
    const getMetricsMock = vi.mocked(adminDashboardService.getMetrics)
    getMetricsMock.mockResolvedValue(mockDashboardMetrics)

    render(<FixedAdminDashboard />)

    await waitFor(() => expect(getMetricsMock).toHaveBeenCalledTimes(1))

    const refreshButton = screen.getByRole('button', { name: /refresh dashboard/i })
    fireEvent.click(refreshButton)

    await waitFor(() => expect(getMetricsMock).toHaveBeenCalledTimes(2))
  })
})
