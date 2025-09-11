import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AdminRouteProps {
  children: React.ReactNode
}

const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'admissions_officer',
  'registrar',
  'finance_officer',
  'academic_head'
]

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading } = useAuth()

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

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}