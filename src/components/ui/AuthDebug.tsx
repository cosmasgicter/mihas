import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function AuthDebug() {
  const { user, profile, userRole, loading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    async function getDebugInfo() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const { data: session } = await supabase.auth.getSession()
        
        let profileData = null
        let profileError = null
        
        if (currentUser) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle()
          
          profileData = data
          profileError = error
        }

        setDebugInfo({
          currentUser: currentUser ? {
            id: currentUser.id,
            email: currentUser.email,
            metadata: currentUser.user_metadata
          } : null,
          session: session?.session ? {
            access_token: session.session.access_token ? 'present' : 'missing',
            expires_at: session.session.expires_at
          } : null,
          profileData,
          profileError: profileError ? {
            code: profileError.code,
            message: profileError.message
          } : null,
          contextUser: user ? {
            id: user.id,
            email: user.email
          } : null,
          contextProfile: profile,
          contextUserRole: userRole,
          contextLoading: loading
        })
      } catch (error) {
        setDebugInfo({ error: error.message })
      }
    }

    getDebugInfo()
  }, [user, profile, userRole, loading])

  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-auto z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  )
}