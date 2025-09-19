import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSupabaseClient, type SupabaseFactoryOptions } from './lazySupabase'

export * from './supabaseTypes'
export type { SupabaseFactoryOptions } from './lazySupabase'

let cachedClient: SupabaseClient | null = null

export async function getSupabaseClient(options: SupabaseFactoryOptions = {}) {
  if (options.storage) {
    cachedClient = await loadSupabaseClient(options)
    return cachedClient
  }

  if (!cachedClient) {
    cachedClient = await loadSupabaseClient()
  }

  return cachedClient
}

type SupabaseCallable = (
  options?: SupabaseFactoryOptions
) => Promise<SupabaseClient>

const supabaseCallable: SupabaseCallable = async (options: SupabaseFactoryOptions = {}) => {
  return getSupabaseClient(options)
}

function resolvePath(client: SupabaseClient, path: PropertyKey[]) {
  return path.reduce((acc, key) => (acc as any)[key], client as any)
}

function createPropertyProxy(path: PropertyKey[]): any {
  const proxy = new Proxy(function () {}, {
    async apply(_target, _thisArg, args) {
      const client = await getSupabaseClient()
      const value = resolvePath(client, path)
      if (typeof value === 'function') {
        const parent = path.length > 1 ? resolvePath(client, path.slice(0, -1)) : client
        return value.apply(parent, args)
      }
      return value
    },
    get(_target, prop) {
      if (prop === 'then') {
        return undefined
      }
      return createPropertyProxy([...path, prop])
    },
    set(_target, prop, value) {
      getSupabaseClient().then(client => {
        const target = resolvePath(client, path)
        if (target && typeof target === 'object') {
          (target as any)[prop] = value
        }
      })
      return true
    }
  })

  return proxy
}

export const supabase = new Proxy(supabaseCallable, {
  apply(_target, _thisArg, args) {
    return supabaseCallable(...(args as [SupabaseFactoryOptions?]))
  },
  get(_target, prop) {
    if (prop === 'then') {
      return undefined
    }
    return createPropertyProxy([prop])
  },
  set(_target, prop, value) {
    getSupabaseClient().then(client => {
      (client as any)[prop] = value
    })
    return true
  }
}) as SupabaseClient & SupabaseCallable
