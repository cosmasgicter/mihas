import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { sanitizeForLog } from '@/lib/security'
import { authPersistence } from '@/lib/authPersistence'
import { secureDisplay } from '@/lib/secureDisplay'
import { sanitizeForDisplay } from '@/lib/sanitize'

export type SignInResult = {
  session?: any
  user?: User
  error?: string
}

export type SignUpResult = {
  user?: User | null
  session?: any
  error?: string
}

export function useSessionListener() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    let mounted = true
    let authSubscription: { unsubscribe: () => void } | null = null

    async function initializeSession() {
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return

          console.log('Auth session event:', sanitizeForLog(event))

          if (event === 'SIGNED_OUT') {
            setUser(null)
            setLoading(false)
            return
          }

          if (session?.user) {
            setUser(session.user)
          }

          if (!['INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
            setLoading(false)
          }
        })

        authSubscription = subscription
      } catch (error) {
        console.error('Session initialization failed:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    authPersistence.init()

    return () => {
      mounted = false
      authSubscription?.unsubscribe()
      authPersistence.cleanup()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      console.log('Attempting sign in for:', sanitizeForLog(email))
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', sanitizeForLog(error.message))
        return { error: error.message }
      }

      if (data.session && data.user) {
        setUser(data.user)
        return { session: data.session, user: data.user }
      }

      return { error: 'Login failed' }
    } catch (error) {
      console.error('Sign in exception:', error)
      return { error: error instanceof Error ? error.message : 'Login failed' }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, userData: any): Promise<SignUpResult> => {
    const sanitizedUserData = Object.entries(userData || {}).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? secureDisplay.text(value) : value
      return acc
    }, {} as any)

    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: sanitizeForDisplay(sanitizedUserData.full_name || email.split('@')[0]),
          sex: sanitizedUserData.sex,
          signup_data: JSON.stringify(sanitizedUserData)
        }
      }
    })

    if (error) {
      return { error: error.message }
    }

    return data
  }, [])

  const signOut = useCallback(async () => {
    const supabase = await getSupabaseClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }
}
