import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { applicationService } from '@/services/applications'
import { ApplicationFilters, DEFAULT_APPLICATION_FILTERS } from './useApplicationFilters'

interface ApplicationSummary {
  id: string
  application_number: string
  full_name: string
  email: string
  phone: string
  program: string
  intake: string
  institution: string
  status: string
  payment_status: string
  payment_verified_at: string | null
  payment_verified_by: string | null
  payment_verified_by_name: string | null
  payment_verified_by_email: string | null
  last_payment_audit_id: number | null
  last_payment_audit_at: string | null
  last_payment_audit_by_name: string | null
  last_payment_audit_by_email: string | null
  last_payment_audit_notes: string | null
  last_payment_reference: string | null
  application_fee: number
  paid_amount: number
  submitted_at: string
  created_at: string
  result_slip_url: string
  extra_kyc_url: string
  pop_url: string
  grades_summary: string
  total_subjects: number
  average_grade: number
  age: number
  days_since_submission: number
}

interface PaginationState {
  pageSize: number
  currentPage: number
  totalCount: number
  loadedCount: number
  hasMore: boolean
}

const DEFAULT_PAGE_SIZE = 25

type LoadMode = 'initial' | 'loadMore' | 'refresh'

const sanitizeSearchTerm = (value: string) => {
  return value
    .trim()
    .replace(/[%_]/g, match => `\\${match}`)
    .replace(/,/g, '\\,')
}

export function useApplicationsData(filters: ApplicationFilters = DEFAULT_APPLICATION_FILTERS) {
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadPage = useCallback(async (page: number, mode: LoadMode) => {
    const safePage = Math.max(page, 1)
    const activeFilters = filters || DEFAULT_APPLICATION_FILTERS

    const isInitial = mode === 'initial'
    const isLoadMore = mode === 'loadMore'
    const isRefresh = mode === 'refresh'

    const from = isRefresh ? 0 : (safePage - 1) * pageSize
    const to = isRefresh ? (safePage * pageSize) - 1 : from + pageSize - 1

    try {
      setError('')

      if (isInitial) {
        setIsInitialLoading(true)
        setApplications([])
      } else if (isLoadMore) {
        setIsLoadingMore(true)
      } else if (isRefresh) {
        setIsRefreshing(true)
      }

      let query = supabase
        .from('admin_application_detailed')
        .select('*', { count: 'exact' })

      if (activeFilters.searchTerm) {
        const searchValue = sanitizeSearchTerm(activeFilters.searchTerm)
        const pattern = `%${searchValue}%`
        query = query.or(
          `full_name.ilike.${pattern},email.ilike.${pattern},application_number.ilike.${pattern}`
        )
      }

      if (activeFilters.statusFilter) {
        query = query.eq('status', activeFilters.statusFilter)
      }

      if (activeFilters.paymentFilter) {
        query = query.eq('payment_status', activeFilters.paymentFilter)
      }

      if (activeFilters.programFilter) {
        query = query.eq('program', activeFilters.programFilter)
      }

      if (activeFilters.institutionFilter) {
        query = query.eq('institution', activeFilters.institutionFilter)
      }

      const { data, error: queryError, count } = await query
        .order('created_at', { ascending: false })
        .range(Math.max(from, 0), Math.max(to, Math.max(from, 0)))

      if (queryError) throw queryError

      setTotalCount(count ?? 0)

      if (isLoadMore) {
        setApplications(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const newRecords = (data || []).filter(item => !existingIds.has(item.id))
          return [...prev, ...newRecords]
        })
        setCurrentPage(safePage)
      } else if (isRefresh) {
        setApplications(data || [])
      } else {
        setApplications(data || [])
        setCurrentPage(safePage)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load applications.')

      if (mode === 'loadMore') {
        setCurrentPage(prev => Math.max(prev - 1, 1))
      }
    } finally {
      if (isInitial) {
        setIsInitialLoading(false)
      }
      if (isLoadMore) {
        setIsLoadingMore(false)
      }
      if (isRefresh) {
        setIsRefreshing(false)
      }
    }
  }, [filters, pageSize])

  useEffect(() => {
    setApplications([])
    setTotalCount(0)
    setCurrentPage(1)
    void loadPage(1, 'initial')
  }, [loadPage])

  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || isInitialLoading) return

    const totalLoaded = applications.length
    if (totalCount !== 0 && totalLoaded >= totalCount) return

    const nextPage = currentPage + 1
    await loadPage(nextPage, 'loadMore')
  }, [applications.length, currentPage, isInitialLoading, isLoadingMore, loadPage, totalCount])

  const refreshCurrentPage = useCallback(async () => {
    await loadPage(currentPage, 'refresh')
  }, [currentPage, loadPage])

  const loadApplications = useCallback(async () => {
    await loadPage(1, 'initial')
  }, [loadPage])

  const pagination: PaginationState = useMemo(() => ({
    pageSize,
    currentPage,
    totalCount,
    loadedCount: applications.length,
    hasMore: applications.length < totalCount
  }), [applications.length, currentPage, pageSize, totalCount])

  const updateStatus = useCallback(async (applicationId: string, newStatus: string) => {
    await applicationService.updateStatus(applicationId, newStatus)
    await refreshCurrentPage()
  }, [refreshCurrentPage])

  const updatePaymentStatus = useCallback(async (
    applicationId: string,
    newPaymentStatus: string,
    verificationNotes?: string
  ) => {
    await applicationService.updatePaymentStatus(applicationId, newPaymentStatus, verificationNotes)
    await refreshCurrentPage()
  }, [refreshCurrentPage])

  return {
    applications,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    pagination,
    hasMore: pagination.hasMore,
    loadNextPage,
    refreshCurrentPage,
    loadApplications,
    updateStatus,
    updatePaymentStatus
  }
}
