import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sanitizeForLog } from '@/lib/sanitize'

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

  const fetchApplications = async () => {
    try {
      const start = currentPage * PAGE_SIZE
      const end = start + PAGE_SIZE - 1
      
      let query = supabase
        .from('applications_new')
        .select('*', { count: 'exact' })
        .range(start, end)

      // Apply sorting
      const orderColumn = sortBy === 'date' ? 'created_at' : 
                         sortBy === 'name' ? 'full_name' : 'status'
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      } else {
        query = query.in('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected'])
      }

      // Apply program filter
      if (programFilter !== 'all') {
        query = query.eq('program', programFilter)
      }

      // Apply institution filter
      if (institutionFilter !== 'all') {
        query = query.eq('institution', institutionFilter)
      }

      // Apply payment status filter
      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter)
      }

      // Apply date range filter
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start)
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end + 'T23:59:59')
      }

      // Apply search filter
      if (searchTerm) {
        const sanitizedSearch = searchTerm.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
        query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,application_number.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%,nrc_number.ilike.%${sanitizedSearch}%`)
      }

      const { data, error, count } = await query
      
      if (error) {
        console.error('Error fetching applications:', sanitizeForLog(error.message))
        throw new Error(`Failed to fetch applications: ${error.message}`)
      }

      return { 
        applications: data || [], 
        totalCount: count || 0 
      }
    } catch (error) {
      console.error('Applications fetch error:', error)
      throw error
    }
  }

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats')
      
      if (error) {
        console.error('Error fetching stats:', sanitizeForLog(error.message))
        // Return default stats if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('applications_new')
          .select('status, payment_status')
        
        if (fallbackError) throw fallbackError
        
        const stats = {
          total: fallbackData.length,
          draft: fallbackData.filter(app => app.status === 'draft').length,
          submitted: fallbackData.filter(app => app.status === 'submitted').length,
          under_review: fallbackData.filter(app => app.status === 'under_review').length,
          approved: fallbackData.filter(app => app.status === 'approved').length,
          rejected: fallbackData.filter(app => app.status === 'rejected').length
        }
        
        return stats
      }
      
      return {
        total: Number(data[0]?.total_applications || 0),
        draft: Number(data[0]?.draft_applications || 0),
        submitted: Number(data[0]?.submitted_applications || 0),
        under_review: Number(data[0]?.under_review_applications || 0),
        approved: Number(data[0]?.approved_applications || 0),
        rejected: Number(data[0]?.rejected_applications || 0)
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
      throw error
    }
  }

  const applicationsQuery = useQuery({
    queryKey: ['applications', currentPage, statusFilter, searchTerm, sortBy, sortOrder, programFilter, institutionFilter, paymentStatusFilter, dateRange],
    queryFn: fetchApplications,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000
  })

  const statsQuery = useQuery({
    queryKey: ['application-stats'],
    queryFn: fetchStats,
    staleTime: 60000,
    retry: 2,
    retryDelay: 1000
  })

  return {
    applications: applicationsQuery.data?.applications || [],
    totalCount: applicationsQuery.data?.totalCount || 0,
    stats: statsQuery.data,
    isLoading: applicationsQuery.isLoading,
    isStatsLoading: statsQuery.isLoading,
    error: applicationsQuery.error || statsQuery.error,
    refetch: applicationsQuery.refetch,
    refetchStats: statsQuery.refetch
  }
}