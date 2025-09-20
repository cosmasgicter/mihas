import React, { useCallback, useMemo, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import {
  FiltersPanel,
  MetricsHeader,
  ApplicationsTable,
  ApplicationsSkeleton,
  ApplicationDetailModal
} from '@/components/admin/applications'
import { useApplicationsData, useApplicationFilters } from '@/hooks/admin'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ApplicationData
} from '@/lib/exportUtils'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'

const EXPORT_BATCH_SIZE = 500

const sanitizeSearchTerm = (value: string) => {
  return value
    .trim()
    .replace(/[%_]/g, match => `\\${match}`)
    .replace(/,/g, '\\,')
}

const mapRecordToApplication = (record: any): ApplicationData => ({
  application_number: record.application_number ?? '',
  full_name: record.full_name ?? '',
  email: record.email ?? '',
  phone: record.phone ?? '',
  program: record.program ?? '',
  intake: record.intake ?? '',
  institution: record.institution ?? '',
  status: record.status ?? '',
  payment_status: record.payment_status ?? '',
  application_fee: Number(record.application_fee ?? 0),
  paid_amount: Number(record.paid_amount ?? 0),
  submitted_at: record.submitted_at || record.created_at || '',
  created_at: record.created_at || record.submitted_at || '',
  grades_summary: record.grades_summary ?? '',
  total_subjects: Number(record.total_subjects ?? 0),
  average_grade: Number(record.average_grade ?? 0),
  age: Number(record.age ?? 0),
  days_since_submission: Number(record.days_since_submission ?? 0)
})

const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0))

export default function Applications() {
  const {
    filters,
    updateFilter
  } = useApplicationFilters()

  const {
    applications,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    pagination,
    hasMore,
    loadNextPage,
    updateStatus,
    updatePaymentStatus
  } = useApplicationsData(filters)

  const { showError, showSuccess, showInfo } = useToast()
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'excel' | 'pdf' | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const activeFilters = useMemo(() => ({ ...filters }), [filters])

  const createExportStream = useCallback(() => {
    const filtersSnapshot = activeFilters

    return (async function* generate() {
      let page = 0
      while (true) {
        const from = page * EXPORT_BATCH_SIZE
        const to = from + EXPORT_BATCH_SIZE - 1

        let query = supabase
          .from('admin_application_detailed')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to)

        if (filtersSnapshot.searchTerm) {
          const searchValue = sanitizeSearchTerm(filtersSnapshot.searchTerm)
          const pattern = `%${searchValue}%`
          query = query.or(
            `full_name.ilike.${pattern},email.ilike.${pattern},application_number.ilike.${pattern}`
          )
        }

        if (filtersSnapshot.statusFilter) {
          query = query.eq('status', filtersSnapshot.statusFilter)
        }

        if (filtersSnapshot.paymentFilter) {
          query = query.eq('payment_status', filtersSnapshot.paymentFilter)
        }

        if (filtersSnapshot.programFilter) {
          query = query.eq('program', filtersSnapshot.programFilter)
        }

        if (filtersSnapshot.institutionFilter) {
          query = query.eq('institution', filtersSnapshot.institutionFilter)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(error.message || 'Failed to fetch applications for export')
        }

        const rows = (data ?? []).map(mapRecordToApplication)

        if (!rows.length) {
          break
        }

        yield rows

        if (rows.length < EXPORT_BATCH_SIZE) {
          break
        }

        page += 1
        await yieldToBrowser()
      }
    })()
  }, [activeFilters])

  const handleExport = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    if (exportingFormat) {
      return
    }

    setExportingFormat(format)
    showInfo('Preparing export', 'Formatting applications for download…')

    try {
      const stream = createExportStream()
      const timestamp = new Date().toISOString().split('T')[0]
      const filenameBase = `applications_${timestamp}`

      if (format === 'csv') {
        await exportToCSV(stream, `${filenameBase}.csv`)
      } else if (format === 'excel') {
        await exportToExcel(stream, `${filenameBase}.xlsx`)
      } else {
        await exportToPDF(stream, `${filenameBase}.pdf`)
      }

      showSuccess('Export complete', 'Your applications report has been downloaded.')
    } catch (error) {
      console.error('Failed to export applications', error)
      showError('Export failed', error instanceof Error ? error.message : 'Unable to export applications right now.')
    } finally {
      setExportingFormat(null)
    }
  }, [createExportStream, exportingFormat, showError, showInfo, showSuccess])

  const isExporting = exportingFormat !== null

  const handleViewDetails = useCallback((applicationId: string) => {
    setSelectedApplication(applicationId)
    setShowDetails(true)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false)
    setSelectedApplication(null)
  }, [])

  const selectedApp = useMemo(() => {
    if (!selectedApplication) return null
    return applications.find(app => app.id === selectedApplication) || null
  }, [selectedApplication, applications])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AdminNavigation />
      <div className="container-mobile py-4 sm:py-6 lg:py-8 safe-area-bottom">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white">
            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">📄 Applications Management</h1>
                <p className="text-white/90 text-sm sm:text-base">
                  Manage student applications and review submissions
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/40 hover:bg-white/20"
                  onClick={() => { void handleExport('csv') }}
                  loading={exportingFormat === 'csv'}
                  disabled={isExporting && exportingFormat !== 'csv'}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/40 hover:bg-white/20"
                  onClick={() => { void handleExport('excel') }}
                  loading={exportingFormat === 'excel'}
                  disabled={isExporting && exportingFormat !== 'excel'}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/40 hover:bg-white/20"
                  onClick={() => { void handleExport('pdf') }}
                  loading={exportingFormat === 'pdf'}
                  disabled={isExporting && exportingFormat !== 'pdf'}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {isInitialLoading ? (
              <ApplicationsSkeleton />
            ) : (
              <div className="space-y-6">
                <MetricsHeader
                  applications={applications}
                  totalCount={pagination.totalCount}
                />

                {isRefreshing && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600">
                    <LoadingSpinner size="sm" />
                    <span>Refreshing latest applications…</span>
                  </div>
                )}

                <FiltersPanel
                  searchTerm={filters.searchTerm}
                  statusFilter={filters.statusFilter}
                  paymentFilter={filters.paymentFilter}
                  programFilter={filters.programFilter}
                  institutionFilter={filters.institutionFilter}
                  onFilterChange={updateFilter}
                />

                <ApplicationsTable
                  applications={applications}
                  totalCount={pagination.totalCount}
                  loadedCount={pagination.loadedCount}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadNextPage}
                  onStatusUpdate={updateStatus}
                  onPaymentStatusUpdate={updatePaymentStatus}
                  onViewDetails={handleViewDetails}
                />

                <ApplicationDetailModal
                  application={selectedApp}
                  show={showDetails}
                  updating={null}
                  onClose={handleCloseDetails}
                  onSendNotification={() => {}}
                  onViewDocuments={() => {}}
                  onViewHistory={() => {}}
                  onUpdateStatus={updateStatus}
                  onGenerateAcceptanceLetter={async () => {}}
                  onGenerateFinanceReceipt={async () => {}}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}