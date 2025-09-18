import React from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  FiltersPanel,
  MetricsHeader,
  ApplicationsTable,
  ApplicationsSkeleton
} from '@/components/admin/applications'
import { useApplicationsData, useApplicationFilters } from '@/hooks/admin'

export default function Applications() {
  const {
    applications,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    hasMore,
    loadedCount,
    loadedPageCount,
    loadNextPage,
    refreshCurrentPage,
    updateStatus,
    updatePaymentStatus,
    setPageSize
  } = useApplicationsData()

  const {
    filters,
    updateFilter,
    filteredApplications
  } = useApplicationFilters(applications)

  const isFiltered = Object.values(filters).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Applications Management
          </h1>
          <p className="text-gray-600">
            Manage student applications and review submissions
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {isInitialLoading ? (
          <ApplicationsSkeleton />
        ) : (
          <>
            <MetricsHeader applications={applications} />

            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
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
              applications={filteredApplications}
              totalCount={totalCount}
              loadedCount={loadedCount}
              loadedPageCount={loadedPageCount}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              isFiltered={isFiltered}
              isRefreshing={isRefreshing}
              onLoadMore={loadNextPage}
              onRefresh={refreshCurrentPage}
              onPageSizeChange={setPageSize}
              onStatusUpdate={updateStatus}
              onPaymentStatusUpdate={updatePaymentStatus}
            />
          </>
        )}
      </div>
    </div>
  )
}