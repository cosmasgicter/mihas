import { useState } from 'react'

export interface ApplicationFilters {
  searchTerm: string
  statusFilter: string
  paymentFilter: string
  programFilter: string
  institutionFilter: string
}

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  searchTerm: '',
  statusFilter: '',
  paymentFilter: '',
  programFilter: '',
  institutionFilter: ''
}

export function useApplicationFilters() {
  const [filters, setFilters] = useState<ApplicationFilters>({ ...DEFAULT_APPLICATION_FILTERS })

  const updateFilter = (key: keyof ApplicationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({ ...DEFAULT_APPLICATION_FILTERS })
  }

  return {
    filters,
    updateFilter,
    resetFilters
  }
}