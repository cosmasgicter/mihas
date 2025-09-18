import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, UserProfile } from '@/lib/supabase'
import { sanitizeForLog } from '@/lib/security'
import { sanitizeForDisplay } from '@/lib/sanitize'
import { secureDisplay } from '@/lib/secureDisplay'
import { authPersistence } from '@/lib/authPersistence'

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
  validateAdminAccess: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load user on mount - optimized for speed
  useEffect(() => {
    let mounted = true
    
    async function loadUser() {
      try {
        // Get current session first - this is fast
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          console.log('Session found on mount, user authenticated')
          setUser(session.user)
          setLoading(false) // Set loading to false immediately for faster UI
          
          // Load profile and role in background after UI is ready
          setTimeout(() => {
            if (mounted) {
              Promise.all([
                loadUserProfile(session.user.id),
                loadUserRole(session.user.id)
              ]).catch(error => {
                console.warn('Background profile/role loading failed:', error)
                // Don't block the UI for this
              })
            }
          }, 50) // Very short delay to let UI render first
        } else {
          console.log('No session found on mount')
          setUser(null)
          setProfile(null)
          setUserRole(null)
          setLoading(false)
        }
        
        setHasLoaded(true)
      } catch (error) {
        console.error('Error loading user:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setUserRole(null)
          setLoading(false)
          setHasLoaded(true)
        }
      }
    }
    
    loadUser()

    // Set up auth listener with enhanced security validation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('AuthContext: Auth state change:', sanitizeForLog(event))
        
        // Handle token refresh - maintain current state
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed successfully, maintaining session')
          setUser(session.user)
          setLoading(false)
          return
        }
        
        // Handle sign in
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in successfully')
          setUser(session.user)
          // Load profile and role
          setTimeout(async () => {
            if (mounted) {
              await Promise.all([
                loadUserProfile(session.user.id),
                loadUserRole(session.user.id)
              ])
            }
          }, 100)
          setLoading(false)
          return
        }
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setUser(null)
          setProfile(null)
          setUserRole(null)
          setLoading(false)
          return
        }
        
        // Handle initial session or session recovery
        if (event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          if (session?.user) {
            console.log('Session recovered or user updated')
            setUser(session.user)
            setTimeout(async () => {
              if (mounted) {
                await Promise.all([
                  loadUserProfile(session.user.id),
                  loadUserRole(session.user.id)
                ])
              }
            }, 100)
          } else {
            setUser(null)
            setProfile(null)
            setUserRole(null)
          }
          setLoading(false)
          return
        }
        
        // Default case - set loading to false
        if (mounted && !hasLoaded) {
          setLoading(false)
          setHasLoaded(true)
        }
      }
    )

    // Initialize auth persistence
    authPersistence.init()

    return () => {
      mounted = false
      subscription.unsubscribe()
      authPersistence.cleanup()
    }
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No profile found, creating new profile')
          await createUserProfile(userId)
          return
        }
        throw new Error(`Failed to load profile: ${response.statusText}`)
      }
      
      const data = await response.json()
      const sanitizedProfile = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? secureDisplay.text(value) : value
        return acc
      }, {} as UserProfile)
      
      setProfile(sanitizedProfile)
      console.log('Profile loaded successfully:', { hasProfile: true, fields: Object.keys(sanitizedProfile) })
    } catch (error) {
      console.error('Error loading user profile:', error)
      setProfile(null)
    }
  }

  async function createUserProfile(userId: string) {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setProfile(null)
        return
      }

      // Extract signup data from user metadata
      let signupData = {}
      try {
        signupData = user.user.user_metadata?.signup_data ? 
          (typeof user.user.user_metadata.signup_data === 'string' ? 
            JSON.parse(user.user.user_metadata.signup_data) : 
            user.user.user_metadata.signup_data) : {}
      } catch (parseError) {
        console.warn('Error parsing signup data:', parseError)
        signupData = {}
      }
      
      const metadata = user.user.user_metadata || {}
      const fullName = metadata.full_name || 
                      signupData.full_name || 
                      user.user.email?.split('@')[0] || 
                      'Student'
      
      const profileData = {
        user_id: userId,
        full_name: sanitizeForDisplay(fullName),
        phone: sanitizeForDisplay(signupData.phone || metadata.phone || null),
        sex: signupData.sex || metadata.sex || null,
        date_of_birth: signupData.date_of_birth || metadata.date_of_birth || null,
        city: signupData.city || metadata.city || null,
        address: signupData.address || metadata.address || null,
        nationality: signupData.nationality || metadata.nationality || null,
        next_of_kin_name: signupData.next_of_kin_name || metadata.next_of_kin_name || null,
        next_of_kin_phone: signupData.next_of_kin_phone || metadata.next_of_kin_phone || null,
        role: 'student',
        email: user.user.email
      }
      
      console.log('Creating profile with data:', { hasSignupData: Object.keys(signupData).length > 0, hasMetadata: Object.keys(metadata).length > 0 })
      
      // Try direct insert first (simpler approach)
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()
      
      if (!insertError && newProfile) {
        const sanitizedProfile = Object.entries(newProfile).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? sanitizeForDisplay(value) : value
          return acc
        }, {} as UserProfile)
        setProfile(sanitizedProfile)
        console.log('Profile created successfully with fields:', Object.keys(sanitizedProfile))
      } else {
        console.error('Error creating profile:', insertError)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error creating user profile:', error)
      setProfile(null)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('Attempting sign in for:', sanitizeForLog(email))
      
      // Use API endpoint instead of direct Supabase for better performance
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signin', email, password })
      })
      
      const result = await response.json()
      
      if (!response.ok || result.error) {
        console.error('Sign in error:', sanitizeForLog(result.error || 'Login failed'))
        return { error: result.error || 'Login failed' }
      }
      
      if (result.session) {
        console.log('Sign in successful, session established')
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        })
        setUser(result.user)
      }
      
      return result
    } catch (error) {
      console.error('Sign in exception:', error)
      return { error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  async function signUp(email: string, password: string, userData: any) {
    const sanitizedUserData = Object.entries(userData).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? secureDisplay.text(value) : value
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
      // First check if user is super admin by email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === 'cosmas@beanola.com') {
        setUserRole({
          id: 'super-admin-override',
          user_id: userId,
          role: 'super_admin',
          permissions: ['*'],
          department: null,
          is_active: true
        })
        return
      }

      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/admin/users?id=${userId}&action=role`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      if (!response.ok) {
        if (response.status !== 404) {
          console.error('Error loading user role:', response.statusText)
        }
        setUserRole(null)
        return
      }
      
      const data = await response.json()
      setUserRole(data || null)
    } catch (error) {
      console.error('Error loading user role:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'))
      setUserRole(null)
    }
  }

  function isAdmin(): boolean {
    const adminRoles = ['admin', 'super_admin', 'admissions_officer', 'registrar', 'finance_officer', 'academic_head']
    
    // Super admin override
    if (user?.email === 'cosmas@beanola.com') {
      return true
    }
    
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

  async function validateAdminAccess(): Promise<boolean> {
    return isAdmin()
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
        acc[key] = secureDisplay.text(value.trim())
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
      isAdmin,
      validateAdminAccess
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