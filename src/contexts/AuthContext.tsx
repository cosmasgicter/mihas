import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { sanitizeForLog } from '@/lib/sanitize'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user on mount
  useEffect(() => {
    async function loadUser() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          await loadUserProfile(user.id)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    loadUser()

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email ? sanitizeForLog(session.user.email) : 'no email')
        setUser(session?.user || null)
        
        if (session?.user) {
          // Only load profile after auth is fully established
          if (event === 'SIGNED_IN') {
            setTimeout(() => loadUserProfile(session.user.id), 2000)
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error.message, error.code)
        setProfile(null)
        return
      }

      if (data) {
        console.log('Profile loaded for user:', sanitizeForLog(userId))
        setProfile(data)
      } else {
        console.log('No profile found for user:', sanitizeForLog(userId))
        setProfile(null)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      setProfile(null)
    }
  }

  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signUp(email: string, password: string, userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`
      }
    })

    if (error) {
      throw error
    }

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          full_name: userData.full_name,
          phone: userData.phone,
          date_of_birth: userData.date_of_birth,
          gender: userData.gender,
          nationality: userData.nationality,
          address: userData.address,
          city: userData.city,
          country: userData.country,
          emergency_contact_name: userData.emergency_contact_name,
          emergency_contact_phone: userData.emergency_contact_phone,
          role: 'student'
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      throw new Error('User authentication failed, please sign in again')
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', currentUser.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Database update error:', error)
      throw error
    }

    setProfile(data)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile
    }}>
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