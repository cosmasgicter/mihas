import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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

export function useApplicationsData() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const loadedCount = applications.length
  const hasMore = loadedCount < totalCount

  const fetchApplications = useCallback(
    async (page: number, { replaceAll = false } = {}) => {
      const safePage = Math.max(page, 1)
      const start = replaceAll ? 0 : (safePage - 1) * pageSize
      const end = replaceAll ? safePage * pageSize - 1 : start + pageSize - 1

      const { data, count, error } = await supabase
        .from('admin_application_detailed')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, Math.max(end, start))

      if (error) throw error

      if (typeof count === 'number') {
        setTotalCount(count)
      }

      if (replaceAll) {
        setApplications(data || [])
      } else if (data && data.length > 0) {
        setApplications(prev => {
          const existingIds = new Set(prev.map(app => app.id))
          const newItems = data.filter(app => !existingIds.has(app.id))
          if (newItems.length === 0) {
            return prev
          }
          return [...prev, ...newItems]
        })
      }

      if (replaceAll || (data && data.length > 0)) {
        setCurrentPage(safePage)
      }

      return data || []
    },
    [pageSize]
  )

  const loadInitialPage = useCallback(async () => {
    setError('')
    setIsInitialLoading(true)
    try {
      await fetchApplications(1, { replaceAll: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsInitialLoading(false)
    }
  }, [fetchApplications])

  const refreshCurrentPage = useCallback(async () => {
    const pageToRefresh = currentPage || 1
    setError('')
    setIsRefreshing(true)
    try {
      await fetchApplications(pageToRefresh, { replaceAll: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [currentPage, fetchApplications])

  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setError('')
    setIsLoadingMore(true)
    try {
      await fetchApplications(currentPage + 1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentPage, fetchApplications, hasMore, isLoadingMore])

  const updateStatus = async (applicationId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications_new')
      .update({ status: newStatus })
      .eq('id', applicationId)

    if (error) throw error
    await refreshCurrentPage()
  }

  const updatePaymentStatus = async (applicationId: string, newPaymentStatus: string) => {
    const { error } = await supabase
      .from('applications_new')
      .update({ payment_status: newPaymentStatus })
      .eq('id', applicationId)

    if (error) throw error
    await refreshCurrentPage()
  }

  const hasLoadedRef = useRef(false)

  useEffect(() => {
    const runInitialLoad = async () => {
      await loadInitialPage()
      hasLoadedRef.current = true
    }

    runInitialLoad()
  }, [loadInitialPage])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    loadInitialPage()
  }, [pageSize, loadInitialPage])

  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0

  return {
    applications,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    pageSize,
    setPageSize,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    loadNextPage,
    refreshCurrentPage,
    updateStatus,
    updatePaymentStatus
  }
}