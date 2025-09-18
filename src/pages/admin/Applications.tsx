import React from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import {
  FiltersPanel,
  MetricsHeader,
  ApplicationsTable,
  ApplicationsSkeleton
} from '@/components/admin/applications'
import { useApplicationsData, useApplicationFilters } from '@/hooks/admin'

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
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}