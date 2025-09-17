import { useState, useMemo } from 'react'

interface ApplicationSummary {
  id: string
  application_number: string
  full_name: string
  email: string
  status: string
  payment_status: string
  program: string
  institution: string
}

interface FilterState {
  searchTerm: string
  statusFilter: string
  paymentFilter: string
  programFilter: string
  institutionFilter: string
}

export function useApplicationFilters(applications: ApplicationSummary[]) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: '',
    paymentFilter: '',
    programFilter: '',
    institutionFilter: ''
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !filters.searchTerm || 
        app.full_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        app.application_number.toLowerCase().includes(filters.searchTerm.toLowerCase())
      
      const matchesStatus = !filters.statusFilter || app.status === filters.statusFilter
      const matchesPayment = !filters.paymentFilter || app.payment_status === filters.paymentFilter
      const matchesProgram = !filters.programFilter || app.program === filters.programFilter
      const matchesInstitution = !filters.institutionFilter || app.institution === filters.institutionFilter

      return matchesSearch && matchesStatus && matchesPayment && matchesProgram && matchesInstitution
    })
  }, [applications, filters])

  return {
    filters,
    updateFilter,
    filteredApplications
  }
}