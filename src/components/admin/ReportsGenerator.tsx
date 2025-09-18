import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import { Download, FileText, Calendar, FileDown, FileSpreadsheet } from 'lucide-react'
import { exportReport, ReportFormat } from '@/lib/reportExports'

interface ReportConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'regulatory'
  startDate: string
  endDate: string
  includePrograms: boolean
  includeEngagement: boolean
  includeEligibility: boolean
  format: ReportFormat
}

export function ReportsGenerator() {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<ReportConfig>({
    type: 'monthly',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includePrograms: true,
    includeEngagement: true,
    includeEligibility: true,
    format: 'pdf'
  })

  const generateReport = async () => {
    try {
      setLoading(true)

      // Fetch application data
      const { data: applications, error: appsError } = await supabase
        .from('applications_new')
        .select(`
          *,
          programs(name),
          intakes(name, year)
        `)
        .gte('created_at', config.startDate)
        .lte('created_at', config.endDate)

      if (appsError) throw appsError

      // Calculate statistics
      const stats = {
        totalApplications: applications?.length || 0,
        submittedApplications: applications?.filter(app => app.status === 'submitted').length || 0,
        approvedApplications: applications?.filter(app => app.status === 'approved').length || 0,
        rejectedApplications: applications?.filter(app => app.status === 'rejected').length || 0,
        pendingApplications: applications?.filter(app => ['submitted', 'under_review'].includes(app.status)).length || 0
      }

      // Program breakdown
      const programStats = applications?.reduce((acc: any, app) => {
        const programName = app.programs?.name || 'Unknown'
        if (!acc[programName]) {
          acc[programName] = { total: 0, approved: 0, rejected: 0, pending: 0 }
        }
        acc[programName].total++
        if (app.status === 'approved') acc[programName].approved++
        if (app.status === 'rejected') acc[programName].rejected++
        if (['submitted', 'under_review'].includes(app.status)) acc[programName].pending++
        return acc
      }, {})

      // Generate report data
      const reportName = `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Report - ${config.startDate} to ${config.endDate}`

      const reportData = {
        period: `${config.startDate} to ${config.endDate}`,
        generatedAt: new Date().toISOString(),
        statistics: stats,
        programBreakdown: programStats,
        approvalRate: stats.totalApplications > 0
          ? ((stats.approvedApplications / (stats.approvedApplications + stats.rejectedApplications)) * 100).toFixed(2)
          : '0',
        metadata: {
          reportType: config.type,
          includePrograms: config.includePrograms,
          includeEngagement: config.includeEngagement,
          includeEligibility: config.includeEligibility,
          exportFormat: config.format,
          reportTitle: reportName
        }
      }

      // Save report to database
      const { error: saveError } = await supabase
        .from('automated_reports')
        .insert({
          report_type: config.type,
          report_name: reportName,
          report_data: reportData
        })

      if (saveError) throw saveError

      await exportReport(reportData, config.format, reportName)

      alert('Report generated and downloaded successfully!')
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    { value: 'daily', label: 'Daily Report', icon: Calendar },
    { value: 'weekly', label: 'Weekly Report', icon: Calendar },
    { value: 'monthly', label: 'Monthly Report', icon: Calendar },
    { value: 'regulatory', label: 'Regulatory Compliance', icon: FileText }
  ]

  const reportFormats = [
    { value: 'pdf' as ReportFormat, label: 'PDF Document', description: 'Ready-to-share summary', icon: FileDown },
    { value: 'excel' as ReportFormat, label: 'Excel Workbook', description: 'Multi-sheet analytics', icon: FileSpreadsheet },
    { value: 'json' as ReportFormat, label: 'JSON Export', description: 'Raw data for developers', icon: FileText }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Generate Reports</h3>
        <p className="text-sm text-gray-600">Create automated reports for analysis and compliance</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
          <div className="grid grid-cols-2 gap-3">
            {reportTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => setConfig(prev => ({ ...prev, type: type.value as any }))}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    config.type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Report Sections */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Include Sections</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includePrograms}
                onChange={(e) => setConfig(prev => ({ ...prev, includePrograms: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Program Analytics</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeEngagement}
                onChange={(e) => setConfig(prev => ({ ...prev, includeEngagement: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">User Engagement Metrics</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeEligibility}
                onChange={(e) => setConfig(prev => ({ ...prev, includeEligibility: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Eligibility Success Rates</span>
            </label>
          </div>
        </div>

        {/* Output Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Output Format</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reportFormats.map((format) => {
              const Icon = format.icon
              const isActive = config.format === format.value
              return (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, format: format.value }))}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{format.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{format.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={generateReport}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}