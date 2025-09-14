import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { sanitizeForLog, sanitizeForDisplay } from '@/lib/sanitize'
import { sessionManager, setupSessionTimeout } from '@/lib/session'

interface UserRole {
  id: string
  user_id: string
  role: string
  permissions: string[] | null
  department: string | null
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  userRole: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
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
          await loadUserRole(user.id)
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
            setTimeout(() => {
              loadUserProfile(session.user.id)
              loadUserRole(session.user.id)
            }, 200)
          }
        } else {
          setProfile(null)
          setUserRole(null)
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
          
          const { data: createdProfile, error: createError } = await supabase
            .rpc('create_user_profile_safe', {
              p_user_id: userId,
              p_full_name: sanitizeForDisplay(fullName),
              p_phone: signupData.phone ? sanitizeForDisplay(signupData.phone) : null,
              p_role: 'student'
            })
            
          if (!createError && createdProfile && createdProfile.length > 0) {
            const profileData = createdProfile[0]
            const sanitizedProfile = Object.entries(profileData).reduce((acc, [key, value]) => {
              acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
              return acc
            }, {} as UserProfile)
            setProfile(sanitizedProfile)
          } else {
            console.error('Error creating profile on first sign in:', sanitizeForLog(createError?.message || 'unknown error'))
            // Fallback: try direct insert
            try {
              const { data: fallbackProfile, error: fallbackError } = await supabase
                .from('user_profiles')
                .insert({
                  user_id: userId,
                  full_name: sanitizeForDisplay(fullName),
                  phone: signupData.phone ? sanitizeForDisplay(signupData.phone) : null,
                  role: 'student'
                })
                .select()
                .single()
              
              if (!fallbackError && fallbackProfile) {
                const sanitizedProfile = Object.entries(fallbackProfile).reduce((acc, [key, value]) => {
                  acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
                  return acc
                }, {} as UserProfile)
                setProfile(sanitizedProfile)
              } else {
                setProfile(null)
              }
            } catch (fallbackErr) {
              console.error('Fallback profile creation failed:', fallbackErr)
              setProfile(null)
            }
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
    const sanitizedUserData = Object.entries(userData).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
      return acc
    }, {} as any)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: sanitizeForDisplay(sanitizedUserData.full_name || email.split('@')[0]),
          sex: sanitizedUserData.sex, // Store sex from signup
          signup_data: JSON.stringify(sanitizedUserData)
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

  async function loadUserRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user role:', sanitizeForLog(error.code || 'unknown'))
        setUserRole(null)
        return
      }

      setUserRole(data)
    } catch (error) {
      console.error('Error loading user role:', error)
      setUserRole(null)
    }
  }

  function isAdmin(): boolean {
    const adminRoles = ['admin', 'super_admin', 'admissions_officer', 'registrar', 'finance_officer', 'academic_head']
    
    // Check userRole first (most authoritative)
    if (userRole) {
      return adminRoles.includes(userRole.role)
    }
    
    // Fallback to profile role if userRole not loaded yet
    if (profile?.role) {
      return adminRoles.includes(profile.role)
    }
    
    return false
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      throw new Error('User authentication failed, please sign in again')
    }

    // Whitelist allowed profile fields to prevent prototype pollution
    const allowedFields = ['full_name', 'phone', 'role', 'avatar_url', 'bio', 'date_of_birth', 'sex', 'nationality', 'address', 'city', 'next_of_kin_name', 'next_of_kin_phone']
    
    const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      // Validate key is safe string and allowed
      if (typeof key !== 'string' || !allowedFields.includes(key) || key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) {
        return acc
      }
      
      if (value === null || value === undefined) {
        acc[key] = value
      } else if (typeof value === 'string') {
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
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      isAdmin
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