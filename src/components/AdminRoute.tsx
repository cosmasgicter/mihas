import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, isAdmin, profile } = useAuth()

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

  // Development mode - allow any authenticated user to access admin
  if (import.meta.env.DEV) {
    console.log('🔧 Development mode: Allowing admin access for user:', user.email)
    return <>{children}</>
  }

  // Production mode - check admin role
  if (!isAdmin()) {
    console.log('❌ Admin access denied for user:', user.email, 'Role:', profile?.role)
    return <Navigate to="/student/dashboard" replace />
  }

  return <>{children}</>
}