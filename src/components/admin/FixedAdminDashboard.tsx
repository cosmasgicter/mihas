import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  Calendar,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Gauge,
  Database
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { sanitizeForLog } from '@/lib/sanitize'
import {
  adminDashboardService,
  type AdminDashboardMetricsResponse,
  type AdminDashboardStatusBreakdown,
  type AdminDashboardPeriodTotals,
  type AdminDashboardProcessingMetrics
} from '@/services/admin/dashboard'

const EMPTY_BREAKDOWN: AdminDashboardStatusBreakdown = {
  total: 0,
  draft: 0,
  submitted: 0,
  underReview: 0,
  approved: 0,
  rejected: 0
}

const EMPTY_PERIOD_TOTALS: AdminDashboardPeriodTotals = {
  today: 0,
  last7Days: 0,
  last30Days: 0
}

const EMPTY_PROCESSING: AdminDashboardProcessingMetrics = {
  averageProcessingTimeHours: 0,
  medianProcessingTimeHours: 0,
  p95ProcessingTimeHours: 0,
  throughputPerHour: 0,
  backlog: 0,
  activeReviewers: 0
}

const HEALTH_BADGE = {
  excellent: {
    label: 'Excellent',
    className: 'bg-emerald-500 text-white',
    description: 'Systems are operating smoothly'
  },
  good: {
    label: 'Good',
    className: 'bg-blue-500 text-white',
    description: 'Minor queueing but within targets'
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-500 text-white',
    description: 'Backlog requires attention soon'
  },
  critical: {
    label: 'Critical',
    className: 'bg-red-500 text-white',
    description: 'Immediate intervention recommended'
  }
} as const

type HealthState = keyof typeof HEALTH_BADGE

function formatHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0h'
  }

  if (hours >= 48) {
    const days = hours / 24
    return `${days >= 3 ? Math.round(days) : days.toFixed(1)}d`
  }

  return `${Math.round(hours)}h`
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return value.toLocaleString()
}

function formatThroughput(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 /hr'
  }

  return `${value.toFixed(2)} /hr`
}

export function FixedAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async (options: { showLoading?: boolean; showRefreshing?: boolean } = {}) => {
    const { showLoading = false, showRefreshing = false } = options

    if (showLoading) {
      setLoading(true)
    }

    if (showRefreshing) {
      setRefreshing(true)
    }

    try {
      setError(null)
      const metrics = await adminDashboardService.getMetrics()
      setDashboardData(metrics)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load admin dashboard metrics:', sanitizeForLog(message))
      setError('Failed to load dashboard metrics')
    } finally {
      if (showLoading) {
        setLoading(false)
      }

      if (showRefreshing) {
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    loadDashboard({ showLoading: true })
    const interval = setInterval(() => {
      loadDashboard()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  const breakdown = dashboardData?.statusBreakdown ?? EMPTY_BREAKDOWN
  const periodTotals = dashboardData?.periodTotals ?? EMPTY_PERIOD_TOTALS
  const processing = dashboardData?.processingMetrics ?? EMPTY_PROCESSING
  const recentActivity = dashboardData?.recentActivity ?? []
  const systemHealth: HealthState = dashboardData?.systemHealth ?? 'good'

  const totalDecisions = breakdown.approved + breakdown.rejected
  const approvalRate = totalDecisions > 0 ? Math.round((breakdown.approved / totalDecisions) * 100) : 0
  const pendingReviews = breakdown.submitted + breakdown.underReview
  const averageDailyForWeek = periodTotals.last7Days > 0 ? Math.round(periodTotals.last7Days / 7) : 0
  const todayDelta = averageDailyForWeek ? periodTotals.today - averageDailyForWeek : 0
  const todayTrendIncrease = todayDelta >= 0
  const todayTrendPercent = averageDailyForWeek
    ? Math.round((Math.abs(todayDelta) / averageDailyForWeek) * 100)
    : 0

  const statusDistribution = [
    { key: 'approved', label: 'Approved', value: breakdown.approved, color: 'bg-green-500' },
    { key: 'underReview', label: 'Under Review', value: breakdown.underReview, color: 'bg-blue-500' },
    { key: 'submitted', label: 'Submitted', value: breakdown.submitted, color: 'bg-amber-500' },
    { key: 'rejected', label: 'Rejected', value: breakdown.rejected, color: 'bg-red-500' },
    { key: 'draft', label: 'Draft', value: breakdown.draft, color: 'bg-slate-400' }
  ]

  const distributionTotal = breakdown.total || statusDistribution.reduce((sum, item) => sum + item.value, 0)

  const healthBadge = HEALTH_BADGE[systemHealth]

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3"
          >
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-red-800 font-medium">Dashboard Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              ×
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900" data-testid="today-applications">
                  {formatNumber(periodTotals.today)}
                </div>
                <div className="text-xs text-gray-500">Today</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600">New Applications</div>
            <div className="flex items-center mt-2 text-xs">
              {averageDailyForWeek ? (
                <>
                  {todayTrendIncrease ? (
                    <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={todayTrendIncrease ? 'text-green-600' : 'text-red-600'}>
                    {todayTrendIncrease ? '+' : '-'}{todayTrendPercent}% vs 7-day avg
                  </span>
                </>
              ) : (
                <span className="text-gray-500">No historical data yet</span>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/10 to-orange-600/20 rounded-bl-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900" data-testid="pending-reviews">
                  {formatNumber(pendingReviews)}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600">Awaiting Review</div>
            {pendingReviews > 0 ? (
              <div className="text-xs text-yellow-600 mt-2">Queue requires monitoring</div>
            ) : (
              <div className="text-xs text-gray-500 mt-2">No backlog</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900" data-testid="approval-rate">
                  {approvalRate}%
                </div>
                <div className="text-xs text-gray-500">Rate</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600">Approval Rate</div>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Decisions this month: {formatNumber(totalDecisions)}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-bl-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Gauge className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900" data-testid="avg-processing-time">
                  {formatHours(processing.averageProcessingTimeHours)}
                </div>
                <div className="text-xs text-gray-500">Average</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600">Processing Time</div>
            <div className="flex items-center mt-2 text-xs text-gray-600">
              Median: {formatHours(processing.medianProcessingTimeHours)} • P95: {formatHours(processing.p95ProcessingTimeHours)}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">📈 Recent Activity</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadDashboard({ showRefreshing: true })}
              loading={refreshing}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'approval'
                        ? 'bg-green-500'
                        : activity.type === 'rejection'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                    }`}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.message}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">🛡️ System Health</h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Current Status</p>
                <p className="text-xs text-gray-500">{healthBadge.description}</p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${healthBadge.className}`}
                data-testid="system-health"
              >
                {healthBadge.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide">Backlog</p>
                  <p className="text-lg font-semibold text-blue-700" data-testid="processing-backlog">
                    {formatNumber(processing.backlog)}
                  </p>
                </div>
                <Database className="h-6 w-6 text-blue-500" />
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">Throughput</p>
                  <p className="text-lg font-semibold text-emerald-700" data-testid="processing-throughput">
                    {formatThroughput(processing.throughputPerHour)}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>

              <div className="p-4 bg-purple-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 uppercase tracking-wide">Active Reviewers</p>
                  <p className="text-lg font-semibold text-purple-700" data-testid="processing-reviewers">
                    {formatNumber(processing.activeReviewers)}
                  </p>
                </div>
                <Users className="h-6 w-6 text-purple-500" />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total Applications</p>
                  <p className="text-lg font-semibold text-gray-700" data-testid="total-applications">
                    {formatNumber(breakdown.total)}
                  </p>
                </div>
                <Activity className="h-6 w-6 text-gray-500" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">📊 Status Distribution</h3>
          <p className="text-xs text-gray-500">Total applications: {formatNumber(distributionTotal)}</p>
        </div>
        <div className="p-6 space-y-4">
          {statusDistribution.map(status => {
            const percentage = distributionTotal > 0 ? Math.round((status.value / distributionTotal) * 100) : 0
            return (
              <div key={status.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{status.label}</span>
                  <span className="text-gray-900 font-medium" data-testid={`status-breakdown-${status.key}`}>
                    {formatNumber(status.value)} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${status.color}`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
