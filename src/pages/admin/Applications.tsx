import React from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FiltersPanel, MetricsHeader, ApplicationsTable } from '@/components/admin/applications'
import { useApplicationsData, useApplicationFilters } from '@/hooks/admin'

export default function Applications() {
  const { 
    applications, 
    loading, 
    error, 
    updateStatus, 
    updatePaymentStatus 
  } = useApplicationsData()

  const { 
    filters, 
    updateFilter, 
    filteredApplications 
  } = useApplicationFilters(applications)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

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

        <MetricsHeader applications={applications} />

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
          onStatusUpdate={updateStatus}
          onPaymentStatusUpdate={updatePaymentStatus}
        />
      </div>
    </div>
  )
}