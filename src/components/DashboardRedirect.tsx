import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function DashboardRedirect() {
  const { user, profile, userRole, loading, isAdmin } = useAuth()
  const [profileTimeout, setProfileTimeout] = useState(false)

  // Set timeout for profile loading
  useEffect(() => {
    if (!loading && user && !profile && !profileTimeout) {
      const timer = setTimeout(() => {
        setProfileTimeout(true)
      }, 2000) // 2 second timeout for profile loading
      
      return () => clearTimeout(timer)
    }
  }, [loading, user, profile, profileTimeout])

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

  // If profile loading times out or we have a profile, proceed with redirect
  if (!profile && !profileTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Check if user has admin role
  if (isAdmin()) {
    return <Navigate to="/admin" replace />
  }

  // Default to student dashboard for students and unknown roles
  return <Navigate to="/student/dashboard" replace />
}
