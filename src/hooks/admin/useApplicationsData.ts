import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  const [pages, setPages] = useState<Record<number, ApplicationSummary[]>>({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const applications = useMemo(() => {
    return Object.keys(pages)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((page) => pages[page] ?? [])
  }, [pages])
  const loadedPageNumbers = useMemo(
    () =>
      Object.keys(pages)
        .map(Number)
        .sort((a, b) => a - b),
    [pages]
  )
  const loadedPageCount = loadedPageNumbers.length
  const loadedCount = applications.length
  const hasMore = loadedCount < totalCount
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0
  const latestLoadedPage = loadedPageNumbers[loadedPageNumbers.length - 1] ?? 0

  const findPageForApplication = useCallback(
    (applicationId: string) => {
      for (const [page, pageItems] of Object.entries(pages)) {
        if (pageItems.some(app => app.id === applicationId)) {
          return Number(page)
        }
      }
      return null
    },
    [pages]
  )

  const fetchPage = useCallback(
    async (page: number, { reset = false, updateCurrentPage = true } = {}) => {
      const safePage = Math.max(page, 1)
      const start = (safePage - 1) * pageSize
      const end = start + pageSize - 1

      if (reset) {
        setPages({})
        setCurrentPage(0)
        setTotalCount(0)
      }

      const { data, count, error: fetchError } = await supabase
        .from('admin_application_detailed')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, Math.max(end, start))

      if (fetchError) throw fetchError

      if (typeof count === 'number') {
        setTotalCount(count)
      }

      const pageData = data ?? []

      setPages(prevPages => {
        const nextPages: Record<number, ApplicationSummary[]> = reset
          ? {}
          : { ...prevPages }
        nextPages[safePage] = pageData
        return nextPages
      })

      if (updateCurrentPage) {
        setCurrentPage(safePage)
      }

      return pageData
    },
    [pageSize]
  )

  const loadInitialPage = useCallback(async () => {
    setError('')
    setIsInitialLoading(true)
    try {
      await fetchPage(1, { reset: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsInitialLoading(false)
    }
  }, [fetchPage])

  const refreshCurrentPage = useCallback(async () => {
    if (loadedPageCount === 0) {
      await loadInitialPage()
      return
    }

    setError('')
    setIsRefreshing(true)
    try {
      for (const pageNumber of loadedPageNumbers) {
        const isLastPage = pageNumber === latestLoadedPage
        await fetchPage(pageNumber, {
          updateCurrentPage: isLastPage
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchPage, latestLoadedPage, loadInitialPage, loadedPageCount, loadedPageNumbers])

  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setError('')
    setIsLoadingMore(true)
    try {
      const nextPage = latestLoadedPage === 0 ? 1 : latestLoadedPage + 1
      await fetchPage(nextPage, { updateCurrentPage: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoadingMore(false)
    }
  }, [fetchPage, hasMore, isLoadingMore, latestLoadedPage])

  const updateStatus = async (applicationId: string, newStatus: string) => {
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('applications_new')
        .update({ status: newStatus })
        .eq('id', applicationId)

      if (updateError) throw updateError

      const pageToRefresh = findPageForApplication(applicationId)
      const targetPage = pageToRefresh ?? (latestLoadedPage || 1)
      await fetchPage(targetPage, {
        updateCurrentPage: pageToRefresh === null ? true : targetPage >= latestLoadedPage
      })
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updatePaymentStatus = async (applicationId: string, newPaymentStatus: string) => {
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('applications_new')
        .update({ payment_status: newPaymentStatus })
        .eq('id', applicationId)

      if (updateError) throw updateError

      const pageToRefresh = findPageForApplication(applicationId)
      const targetPage = pageToRefresh ?? (latestLoadedPage || 1)
      await fetchPage(targetPage, {
        updateCurrentPage: pageToRefresh === null ? true : targetPage >= latestLoadedPage
      })
    } catch (err: any) {
      setError(err.message)
      throw err
    }
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
    loadedCount,
    loadedPageCount,
    loadNextPage,
    refreshCurrentPage,
    updateStatus,
    updatePaymentStatus
  }
}