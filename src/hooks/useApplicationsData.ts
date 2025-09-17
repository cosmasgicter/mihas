import { useQuery } from '@tanstack/react-query'
import { sanitizeForLog } from '@/lib/sanitize'
import { applicationService } from '@/services/apiClient'

const PAGE_SIZE = 15

interface ApplicationsDataParams {
  currentPage: number
  statusFilter: string
  searchTerm: string
  sortBy?: 'date' | 'name' | 'status'
  sortOrder?: 'asc' | 'desc'
  programFilter?: string
  institutionFilter?: string
  paymentStatusFilter?: string
  dateRange?: { start: string; end: string }
}

export function useApplicationsData(params: ApplicationsDataParams | { currentPage: number; statusFilter: string; searchTerm: string }) {
  // Handle both old and new parameter formats for backward compatibility
  const normalizedParams = 'sortBy' in params ? params as ApplicationsDataParams : {
    currentPage: params.currentPage,
    statusFilter: params.statusFilter,
    searchTerm: params.searchTerm,
    sortBy: 'date' as const,
    sortOrder: 'desc' as const,
    programFilter: 'all',
    institutionFilter: 'all',
    paymentStatusFilter: 'all',
    dateRange: { start: '', end: '' }
  }

  const {
    currentPage,
    statusFilter,
    searchTerm,
    sortBy = 'date',
    sortOrder = 'desc',
    programFilter = 'all',
    institutionFilter = 'all',
    paymentStatusFilter = 'all',
    dateRange = { start: '', end: '' }
  } = normalizedParams

  const applicationsQuery = useQuery({
    queryKey: ['applications', currentPage, statusFilter, searchTerm, sortBy, sortOrder, programFilter, institutionFilter, paymentStatusFilter, dateRange],
    queryFn: async () => {
      try {
        return await applicationService.list({
          page: currentPage,
          pageSize: PAGE_SIZE,
          status: statusFilter,
          search: searchTerm,
          sortBy,
          sortOrder,
          program: programFilter,
          institution: institutionFilter,
          paymentStatus: paymentStatusFilter,
          startDate: dateRange.start,
          endDate: dateRange.end,
          includeStats: true
        })
      } catch (error: any) {
        console.error('Applications fetch error:', sanitizeForLog(error?.message || error))
        throw error
      }
    },
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000
  })

  return {
    applications: applicationsQuery.data?.applications || [],
    totalCount: applicationsQuery.data?.totalCount || 0,
    stats: applicationsQuery.data?.stats,
    isLoading: applicationsQuery.isLoading,
    isStatsLoading: applicationsQuery.isLoading,
    error: applicationsQuery.error,
    refetch: applicationsQuery.refetch,
    refetchStats: applicationsQuery.refetch
  }
}