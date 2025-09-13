import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 10

export function useApplicationsData(currentPage: number, statusFilter: string, searchTerm: string) {
  const fetchApplications = async (page: number, status: string, search: string) => {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    
    let query = supabase
      .from('applications_new')
      .select(`
        *
      `, { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
      query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,application_number.ilike.%${sanitizedSearch}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { applications: data || [], totalCount: count || 0 }
  }

  return useQuery({
    queryKey: ['applications', currentPage, statusFilter, searchTerm],
    queryFn: () => fetchApplications(currentPage, statusFilter, searchTerm),
    staleTime: 30000,
  })
}