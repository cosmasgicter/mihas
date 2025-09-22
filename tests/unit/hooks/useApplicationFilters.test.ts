import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { DEFAULT_APPLICATION_FILTERS, useApplicationFilters } from '@/hooks/admin/useApplicationFilters'

const STORAGE_KEY = 'admin_applications_filters'

describe('useApplicationFilters persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/admin/applications')
  })

  it('persists filters to sessionStorage and hydrates on reload', () => {
    const { result, unmount } = renderHook(() => useApplicationFilters())

    act(() => {
      result.current.updateFilter('statusFilter', 'approved')
      result.current.updateFilter('paymentFilter', 'verified')
      result.current.updateFilter('searchTerm', 'Jane')
    })

    const storedValue = window.sessionStorage.getItem(STORAGE_KEY)
    expect(storedValue).toBeTruthy()

    const parsed = storedValue ? JSON.parse(storedValue) : null
    expect(parsed).toMatchObject({
      statusFilter: 'approved',
      paymentFilter: 'verified',
      searchTerm: 'Jane'
    })

    unmount()

    const { result: rerendered } = renderHook(() => useApplicationFilters())

    expect(rerendered.current.filters.statusFilter).toBe('approved')
    expect(rerendered.current.filters.paymentFilter).toBe('verified')
    expect(rerendered.current.filters.searchTerm).toBe('Jane')
  })

  it('hydrates from URL search params when available', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_APPLICATION_FILTERS,
        statusFilter: 'submitted',
        programFilter: 'Registered Nursing'
      })
    )

    window.history.replaceState(
      null,
      '',
      '/admin/applications?statusFilter=rejected&programFilter=Clinical%20Medicine'
    )

    const { result } = renderHook(() => useApplicationFilters())

    expect(result.current.filters.statusFilter).toBe('rejected')
    expect(result.current.filters.programFilter).toBe('Clinical Medicine')
  })
})
