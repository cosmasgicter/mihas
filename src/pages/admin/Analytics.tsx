import React, { useState, useEffect } from 'react'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { AnalyticsService, ApplicationStats, ProgramAnalytics, EligibilityAnalytics } from '@/lib/analytics'
import { ReportsGenerator } from '@/components/admin/ReportsGenerator'
import { TrendingUp, Users, FileText, CheckCircle, XCircle, Download, Calendar, BarChart3 } from 'lucide-react'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [applicationStats, setApplicationStats] = useState<ApplicationStats[]>([])
  const [programAnalytics, setProgramAnalytics] = useState<ProgramAnalytics[]>([])
  const [eligibilityAnalytics, setEligibilityAnalytics] = useState<EligibilityAnalytics[]>([])
  const [engagementMetrics, setEngagementMetrics] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const [appStats, progAnalytics, eligAnalytics, engagement] = await Promise.all([
        AnalyticsService.getApplicationStatistics(dateRange.start, dateRange.end),
        AnalyticsService.getProgramAnalytics(),
        AnalyticsService.getEligibilityAnalytics(dateRange.start, dateRange.end),
        AnalyticsService.getUserEngagementMetrics(dateRange.start, dateRange.end)
      ])

      setApplicationStats(appStats)
      setProgramAnalytics(progAnalytics)
      setEligibilityAnalytics(eligAnalytics)
      setEngagementMetrics(engagement)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      const report = await AnalyticsService.generateDailyReport()
      // Create and download the report
      const reportData = {
        date: new Date().toISOString().split('T')[0],
        statistics: {
          totalApplications,
          totalApproved,
          totalRejected,
          overallApprovalRate: parseFloat(overallApprovalRate),
          avgEligibilitySuccess: parseFloat(avgEligibilitySuccess),
          uniqueUsers,
          avgSessionDuration: parseFloat(avgSessionDuration)
        },
        programAnalytics,
        eligibilityAnalytics: eligibilityAnalytics.slice(0, 10)
      }
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('Analytics report generated and downloaded successfully!')
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('Failed to generate report')
    }
  }

  const totalApplications = applicationStats.reduce((sum, stat) => sum + stat.totalApplications, 0)
  const totalApproved = applicationStats.reduce((sum, stat) => sum + stat.approvedApplications, 0)
  const totalRejected = applicationStats.reduce((sum, stat) => sum + stat.rejectedApplications, 0)
  const overallApprovalRate = totalApplications > 0 ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1) : '0'

  const avgEligibilitySuccess = eligibilityAnalytics.length > 0 
    ? (eligibilityAnalytics.reduce((sum, stat) => sum + stat.successRate, 0) / eligibilityAnalytics.length).toFixed(1)
    : '0'

  const uniqueUsers = new Set(engagementMetrics.map(m => m.user_id)).size
  const avgSessionDuration = engagementMetrics.length > 0
    ? (engagementMetrics.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) / engagementMetrics.length / 60).toFixed(1)
    : '0'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="mt-2 text-gray-600">Application statistics and trends analysis</p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <Button onClick={generateReport} className="mt-6">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{totalApplications}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                <p className="text-3xl font-bold text-green-600">{overallApprovalRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Eligibility Success</p>
                <p className="text-3xl font-bold text-purple-600">{avgEligibilitySuccess}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-indigo-600">{uniqueUsers}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Program Analytics */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Program Performance</h3>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Processing Days</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {programAnalytics.map((program, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {program.programName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.applicationsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.approvalRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.averageProcessingDays} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Application Trends Chart */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Application Trends</h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Chart visualization would be implemented here</p>
                <p className="text-sm">Consider using Chart.js or Recharts for data visualization</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Engagement */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">User Engagement Metrics</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{uniqueUsers}</p>
                  <p className="text-sm text-gray-600">Unique Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{avgSessionDuration} min</p>
                  <p className="text-sm text-gray-600">Avg Session Duration</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{engagementMetrics.length}</p>
                  <p className="text-sm text-gray-600">Total Page Views</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reports Generator */}
          <ReportsGenerator />
        </div>

        {/* Eligibility Success Rates */}
        {eligibilityAnalytics.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Eligibility Success Rates</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Checks</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eligibilityAnalytics.slice(0, 10).map((analytics, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(analytics.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {analytics.totalChecks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {analytics.passedChecks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            analytics.successRate >= 70 
                              ? 'bg-green-100 text-green-800'
                              : analytics.successRate >= 50
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {analytics.successRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}