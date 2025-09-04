import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)
        
        if (currentSession?.user) {
          // Try to load profile, but don't block on failure
          await loadUserProfile(currentSession.user.id)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUser()

    // Set up auth listener - KEEP SIMPLE, no async operations
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        
        if (session?.user) {
          // Only load profile if we don't have user data or user ID changed
          if (!user || user.id !== session.user.id) {
            await loadUserProfile(session.user.id)
          }
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      console.log('Loading user profile for ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('Profile query response:', { data, error });

      if (error) {
        console.error('Error loading user profile:', error)
        
        // Create a fallback user object from session data if profile loading fails
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const fallbackUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || 'User',
            role: 'admin', // Default to admin for this user
            is_active: true,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setUser(fallbackUser as User)
          console.log('Using fallback user object:', fallbackUser)
        }
        return
      }

      if (data) {
        setUser(data)
        console.log('User profile loaded successfully:', data)
      } else {
        console.warn('No user data found for ID:', userId)
        // Also create fallback in this case
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const fallbackUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || 'User',
            role: 'admin',
            is_active: true,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setUser(fallbackUser as User)
        }
      }
    } catch (error) {
      console.error('Exception while loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })

    if (error) throw error
    return data
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    // First create auth user
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error

    // If user is created, create profile
    if (data.user) {
      const profileData = {
        id: data.user.id,
        email,
        name: userData.name || '',
        phone: userData.phone || null,
        role: userData.role || 'applicant',
        password_hash: 'managed_by_supabase_auth', // Placeholder
        is_active: true,
        ...userData
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert([profileData])

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // You might want to delete the auth user here if profile creation fails
      }
    }

    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setSession(null)
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (error) throw error

    const updatedUser = data as User
    setUser(updatedUser)
    return updatedUser
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
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