/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let supabaseClientMock: any

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
  })
}))

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(async () => supabaseClientMock)
}))

function createSupabaseClientMock(options: {
  queryData?: any
  queryError?: any
  insertData?: any
  insertError?: any
} = {}) {
  const {
    queryData = null,
    queryError = null,
    insertData = null,
    insertError = null
  } = options

  const maybeSingle = vi.fn().mockResolvedValue({ data: queryData, error: queryError })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  const single = vi.fn().mockResolvedValue({ data: insertData, error: insertError })
  const selectAfterInsert = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select: selectAfterInsert }))

  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
    }))
  }))

  const from = vi.fn(() => ({
    select,
    eq,
    maybeSingle,
    insert,
    update
  }))

  return {
    supabase: { from },
    from,
    select,
    eq,
    maybeSingle,
    insert,
    single
  }
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useProfileQuery', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })
  })

  afterEach(() => {
    queryClient.clear()
    supabaseClientMock = undefined
    vi.clearAllMocks()
  })

  it('loads an existing profile without hitting the admin API', async () => {
    const supabaseMock = createSupabaseClientMock({
      queryData: {
        user_id: 'user-1',
        full_name: '<script>Student</script>'
      }
    })
    supabaseClientMock = supabaseMock.supabase

    const { useProfileQuery } = await import('@/hooks/auth/useProfileQuery')

    const wrapper = createWrapper(queryClient)
    const mockUser = {
      id: 'user-1',
      email: 'student@example.com',
      user_metadata: {}
    } as unknown as User

    const { result } = renderHook(() => useProfileQuery({ user: mockUser }), { wrapper })

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull()
    })

    expect(result.current.profile?.full_name).toBe('&lt;script&gt;Student&lt;/script&gt;')
    expect(supabaseMock.maybeSingle).toHaveBeenCalledTimes(1)
    expect(supabaseMock.insert).not.toHaveBeenCalled()
  })

  it('creates a profile when none exists for the user', async () => {
    const supabaseMock = createSupabaseClientMock({
      queryData: null,
      queryError: { code: 'PGRST116', message: 'No rows' },
      insertData: {
        user_id: 'user-2',
        full_name: 'Student Two'
      }
    })
    supabaseClientMock = supabaseMock.supabase

    const { useProfileQuery } = await import('@/hooks/auth/useProfileQuery')

    const wrapper = createWrapper(queryClient)
    const mockUser = {
      id: 'user-2',
      email: 'student2@example.com',
      user_metadata: {
        full_name: '<b>Student Two</b>'
      }
    } as unknown as User

    const { result } = renderHook(() => useProfileQuery({ user: mockUser }), { wrapper })

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull()
    })

    expect(supabaseMock.insert).toHaveBeenCalledTimes(1)
    const insertedData = supabaseMock.insert.mock.calls[0][0]
    expect(insertedData.full_name).toBe('&lt;b&gt;Student Two&lt;/b&gt;')
    expect(result.current.profile?.full_name).toBe('Student Two')
  })

  it('surfaces a helpful error when the profile lookup fails', async () => {
    const supabaseMock = createSupabaseClientMock({
      queryData: null,
      queryError: { code: '42501', message: 'permission denied' }
    })
    supabaseClientMock = supabaseMock.supabase

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { useProfileQuery } = await import('@/hooks/auth/useProfileQuery')

    const wrapper = createWrapper(queryClient)
    const mockUser = {
      id: 'user-3',
      email: 'student3@example.com',
      user_metadata: {}
    } as unknown as User

    const { result } = renderHook(() => useProfileQuery({ user: mockUser }), { wrapper })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    expect(result.current.profile).toBeNull()
    expect((result.current.error as Error).message).toContain('Failed to load profile')

    consoleErrorSpy.mockRestore()
  })
})
