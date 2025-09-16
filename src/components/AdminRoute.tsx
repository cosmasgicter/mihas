import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />
  }

  // Super admin override
  if (user?.email === 'cosmas@beanola.com') {
    return <>{children}</>
  }

  if (!isAdmin()) {
    return <Navigate to="/student/dashboard" replace />
  }

  return <>{children}</>
}