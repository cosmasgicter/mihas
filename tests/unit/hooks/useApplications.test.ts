import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

import { useApplications } from '@/hooks/useApiServices'
import type { Application } from '@/lib/supabase'
import { applicationService, type PaginatedApplicationsResponse } from '@/services/applications'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: async () => ({}),
    signUp: async () => ({}),
    signOut: async () => {}
  })
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } })
    }
  })
}))

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient, children })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useApplications', () => {
  it('returns applications array when service resolves paginated response', async () => {
    const mockApplication: Application = {
      id: 'app-1',
      application_number: 'APP-001',
      user_id: 'user-1',
      full_name: 'John Doe',
      date_of_birth: '1990-01-01',
      sex: 'Male',
      phone: '+26000000000',
      email: 'john.doe@example.com',
      residence_town: 'Lusaka',
      program: 'Clinical Medicine',
      intake: 'January 2025',
      institution: 'MIHAS',
      application_fee: 150,
      payment_status: 'pending_review',
      status: 'submitted',
      public_tracking_code: 'TRACK-001',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z'
    }

    const mockResponse: PaginatedApplicationsResponse = {
      applications: [mockApplication],
      totalCount: 1,
      page: 0,
      pageSize: 25
    }

    const getAllSpy = vi
      .spyOn(applicationService, 'getAll')
      .mockResolvedValue(mockResponse)

    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useApplications(), { wrapper })

    try {
      await waitFor(() => {
        expect(result.current.data).toEqual(mockResponse.applications)
      })

      expect(getAllSpy).toHaveBeenCalledTimes(1)
    } finally {
      queryClient.clear()
    }
  })
})
