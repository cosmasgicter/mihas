import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { sanitizeForLog, sanitizeForDisplay } from '@/lib/sanitize'
import { sessionManager, setupSessionTimeout } from '@/lib/session'

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
        // Auth state change logged securely
        setUser(session?.user || null)
        
        if (session?.user) {
          // Only load profile after auth is fully established
          if (event === 'SIGNED_IN') {
            // Reduced delay for better user experience
            setTimeout(() => loadUserProfile(session.user.id), 200)
          }
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    // Setup session timeout management
    const cleanupTimeout = setupSessionTimeout()

    return () => {
      subscription.unsubscribe()
      cleanupTimeout()
    }
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
        console.error('Error loading user profile:', sanitizeForLog(error.code || 'unknown'))
        setProfile(null)
        return
      }

      if (data) {
        const sanitizedProfile = Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
          return acc
        }, {} as UserProfile)
        setProfile(sanitizedProfile)
      } else {
        // Create profile if it doesn't exist
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          // Get signup data from user metadata
          const signupData = user.user.user_metadata?.signup_data ? 
            JSON.parse(user.user.user_metadata.signup_data) : {}
          
          const fullName = user.user.user_metadata?.full_name || 
                          signupData.full_name || 
                          user.user.email?.split('@')[0] || 
                          'Student'
          
          const newProfile = {
            user_id: userId,
            email: user.user.email || '',
            full_name: sanitizeForDisplay(fullName),
            phone: signupData.phone ? sanitizeForDisplay(signupData.phone) : null,
            date_of_birth: signupData.date_of_birth || null,
            gender: signupData.gender ? sanitizeForDisplay(signupData.gender) : null,
            nationality: signupData.nationality ? sanitizeForDisplay(signupData.nationality) : null,
            address: signupData.address ? sanitizeForDisplay(signupData.address) : null,
            city: signupData.city ? sanitizeForDisplay(signupData.city) : null,
            country: signupData.country ? sanitizeForDisplay(signupData.country) : null,
            emergency_contact_name: signupData.emergency_contact_name ? sanitizeForDisplay(signupData.emergency_contact_name) : null,
            emergency_contact_phone: signupData.emergency_contact_phone ? sanitizeForDisplay(signupData.emergency_contact_phone) : null,
            role: 'student'
          }
          
          const { data: createdProfile, error: createError } = await supabase
            .rpc('create_user_profile_safe', {
              p_user_id: userId,
              p_email: user.user.email || '',
              p_full_name: sanitizeForDisplay(fullName),
              p_phone: signupData.phone ? sanitizeForDisplay(signupData.phone) : null,
              p_date_of_birth: signupData.date_of_birth || null,
              p_gender: signupData.gender ? sanitizeForDisplay(signupData.gender) : null,
              p_nationality: signupData.nationality ? sanitizeForDisplay(signupData.nationality) : null,
              p_address: signupData.address ? sanitizeForDisplay(signupData.address) : null,
              p_city: signupData.city ? sanitizeForDisplay(signupData.city) : null,
              p_country: signupData.country ? sanitizeForDisplay(signupData.country) : null,
              p_emergency_contact_name: signupData.emergency_contact_name ? sanitizeForDisplay(signupData.emergency_contact_name) : null,
              p_emergency_contact_phone: signupData.emergency_contact_phone ? sanitizeForDisplay(signupData.emergency_contact_phone) : null,
              p_role: 'student'
            })
            
          if (!createError && createdProfile) {
            const sanitizedProfile = Object.entries(createdProfile).reduce((acc, [key, value]) => {
              acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
              return acc
            }, {} as UserProfile)
            setProfile(sanitizedProfile)
          } else {
            console.error('Error creating profile on first sign in:', createError)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
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
        data: {
          full_name: userData.full_name || email.split('@')[0],
          signup_data: JSON.stringify(userData) // Store signup data for later profile creation
        }
      }
    })

    if (error) {
      throw error
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

    const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value === null || value === undefined) {
        acc[key] = value
      } else if (typeof value === 'string') {
        // Enhanced sanitization for profile updates
        acc[key] = sanitizeForDisplay(value.trim())
      } else {
        acc[key] = value
      }
      return acc
    }, {} as any)

    const { data, error } = await supabase
      .from('user_profiles')
      .update(sanitizedUpdates)
      .eq('user_id', currentUser.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Database update error')
      throw error
    }

    if (data) {
      const sanitizedProfile = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
        return acc
      }, {} as UserProfile)
      setProfile(sanitizedProfile)
    }
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