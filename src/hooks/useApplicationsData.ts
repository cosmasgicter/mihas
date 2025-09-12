import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 10

export function useApplicationsData(currentPage: number, statusFilter: string, searchTerm: string) {
  const fetchApplications = async (page: number, status: string, search: string) => {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    
    let query = supabase
      .from('applications')
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        programs(name, duration_years),
        intakes(name, year)
      `, { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`user_profiles.full_name.ilike.%${search}%,user_profiles.email.ilike.%${search}%,application_number.ilike.%${search}%`)
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