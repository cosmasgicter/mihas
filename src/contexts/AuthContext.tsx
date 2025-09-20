import React, { createContext, useContext, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { useSessionListener, type SignInResult, type SignUpResult, AUTH_CONFIGURATION_MESSAGE } from '@/hooks/auth/useSessionListener'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SupabaseConfigError } from '@/components/SupabaseConfigError'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (email: string, password: string, userData: any) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, signUp, signOut } = useSessionListener()

  const disabledValue = useMemo<AuthContextType>(() => ({
    user: null,
    loading: false,
    signIn: async () => ({ error: AUTH_CONFIGURATION_MESSAGE }),
    signUp: async () => ({ error: AUTH_CONFIGURATION_MESSAGE }),
    signOut: async () => {}
  }), [])

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, loading, signIn, signUp, signOut])

  if (!isSupabaseConfigured) {
    return (
      <AuthContext.Provider value={disabledValue}>
        <SupabaseConfigError />
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
