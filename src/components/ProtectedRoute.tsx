import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getSupabaseClient } from '@/lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return

        if (session) {
          console.log('Session validated in ProtectedRoute')
        }
      } catch (error) {
        if (active) {
          console.error('Session check failed:', error)
        }
      } finally {
        if (active) {
          setSessionChecked(true)
        }
      }
    }

    if (!loading) {
      checkSession()
    }

    return () => {
      active = false
    }
  }, [loading])

  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />
  }

  return <>{children}</>
}