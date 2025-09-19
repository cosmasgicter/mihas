import type { SupabaseClient, SupportedStorage } from '@supabase/supabase-js'
import { sanitizeForLog } from './security'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const AUTH_STORAGE_KEY = 'mihas-auth-token'

export interface SupabaseFactoryOptions {
  storage?: SupportedStorage
}

let supabaseClient: SupabaseClient | null = null
let clientPromise: Promise<SupabaseClient> | null = null
let usingServerStorage = false
let authHandlersInitialized = false
let sessionInterval: NodeJS.Timeout | null = null
let refreshRetryCount = 0

const MAX_REFRESH_RETRIES = 3

function createMemoryStorage(): SupportedStorage {
  const store = new Map<string, string>()

  return {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: key => {
      store.delete(key)
    },
    isServer: true
  }
}

function resolveStorage(adapter?: SupportedStorage) {
  if (adapter) {
    return { storage: adapter, isServerStorage: adapter.isServer === true }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const localStorageAdapter: SupportedStorage = {
      getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => {
        window.localStorage.setItem(key, value)
      },
      removeItem: key => {
        window.localStorage.removeItem(key)
      },
      isServer: false
    }
    return { storage: localStorageAdapter, isServerStorage: false }
  }

  const memoryStorage = createMemoryStorage()
  return { storage: memoryStorage, isServerStorage: true }
}

async function instantiateClient(options: SupabaseFactoryOptions = {}) {
  const { storage, isServerStorage } = resolveStorage(options.storage)
  const shouldRecreateClient = !supabaseClient || (!isServerStorage && usingServerStorage)

  if (shouldRecreateClient) {
    if (sessionInterval) {
      clearInterval(sessionInterval)
      sessionInterval = null
    }

    const { createClient } = await import('@supabase/supabase-js')

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage,
        storageKey: AUTH_STORAGE_KEY,
        debug: false
      },
      global: {
        headers: {
          'x-client-info': 'mihas-app@1.0.0'
        },
        fetch: (url, options = {}) => {
          const isAuthRequest = url.includes('/auth/') || url.includes('/token')
          const timeout = isAuthRequest ? 30000 : 8000

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => {
            clearTimeout(timeoutId)
          })
        }
      }
    })

    usingServerStorage = isServerStorage
    authHandlersInitialized = false
    refreshRetryCount = 0
  }

  if (typeof window !== 'undefined' && supabaseClient && !authHandlersInitialized) {
    initializeBrowserAuthHandlers(supabaseClient, storage)
  }

  return supabaseClient!
}

function initializeBrowserAuthHandlers(client: SupabaseClient, storage: SupportedStorage) {
  if (authHandlersInitialized || typeof window === 'undefined') {
    return
  }

  client.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', sanitizeForLog(event))

    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully')
      refreshRetryCount = 0
    }

    if (event === 'SIGNED_OUT') {
      console.log('User signed out')
      await Promise.resolve(storage.removeItem(AUTH_STORAGE_KEY))
    }

    if (event === 'SIGNED_IN' && session) {
      console.log('User signed in:', sanitizeForLog(session.user?.id || ''))
      startSessionMonitoring(client)
    }
  })

  authHandlersInitialized = true
}

function startSessionMonitoring(client: SupabaseClient) {
  if (typeof window === 'undefined') {
    return
  }

  if (sessionInterval) clearInterval(sessionInterval)

  sessionInterval = setInterval(async () => {
    try {
      const { data: { session }, error } = await client.auth.getSession()

      if (!session || error) return

      const timeUntilExpiry = session.expires_at! * 1000 - Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
        await retryTokenRefresh(client)
      }
    } catch (error) {
      console.warn('Session check failed:', error)
    }
  }, 60000)
}

async function retryTokenRefresh(client: SupabaseClient) {
  for (let i = 0; i < MAX_REFRESH_RETRIES; i++) {
    try {
      const { error } = await client.auth.refreshSession()
      if (!error) {
        console.log('Token refresh successful')
        return
      }
      console.warn(`Token refresh attempt ${i + 1} failed:`, error.message)
    } catch (error) {
      console.warn(`Token refresh attempt ${i + 1} error:`, error)
    }

    if (i < MAX_REFRESH_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
    }
  }
  console.error('All token refresh attempts failed')
}

export async function loadSupabaseClient(options: SupabaseFactoryOptions = {}) {
  if (options.storage) {
    return instantiateClient(options)
  }

  if (!clientPromise) {
    clientPromise = instantiateClient(options)
  }

  return clientPromise
}
