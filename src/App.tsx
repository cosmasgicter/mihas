import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'

import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { ParticleSystem } from '@/components/ui/ParticleSystem'
import { FloatingOrbs } from '@/components/ui/FloatingOrbs'
import { monitoring } from '@/lib/monitoring'
import { offlineSyncService } from '@/services/offlineSync'

// Pages
import LandingPage from '@/pages/LandingPage'
import SignInPage from '@/pages/auth/SignInPage'
import SignUpPage from '@/pages/auth/SignUpPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import StudentDashboard from '@/pages/student/Dashboard'
// import ApplicationForm from '@/pages/student/ApplicationForm' // Removed for uniformity
import ApplicationWizard from '@/pages/student/ApplicationWizard'
import ApplicationStatus from '@/pages/student/ApplicationStatus'
import { DashboardRedirect } from '@/components/DashboardRedirect'
import StudentSettings from '@/pages/student/Settings'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminApplications from '@/pages/admin/Applications'
import ApplicationsAdmin from '@/pages/admin/ApplicationsAdmin'
import AdminPrograms from '@/pages/admin/Programs'
import AdminIntakes from '@/pages/admin/Intakes'
import AdminUsers from '@/pages/admin/Users'
import AdminSettings from '@/pages/admin/Settings'
import AdminAnalytics from '@/pages/admin/Analytics'
import PublicApplicationTracker from '@/pages/PublicApplicationTracker'
import NotFoundPage from '@/pages/NotFoundPage'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  useEffect(() => {
    const trackPageLoad = () => {
      monitoring.trackMetric('page_load', 1, { 
        page: window.location.pathname
      })
    }
    
    // Defer monitoring to improve LCP
    const timer = setTimeout(() => {
      monitoring.startMonitoring()
      trackPageLoad()
      window.addEventListener('popstate', trackPageLoad)
    }, 200)
    
    return () => {
      clearTimeout(timer)
      monitoring.stopMonitoring()
      window.removeEventListener('popstate', trackPageLoad)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 relative overflow-hidden">
            <div className="relative z-10">
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/track-application" element={<PublicApplicationTracker />} />
              <Route path="/auth/signin" element={<SignInPage />} />
              <Route path="/auth/signup" element={<SignUpPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              
              {/* Dashboard redirect - routes to appropriate dashboard based on role */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              
              {/* Student routes */}
              <Route path="/student/dashboard" element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              } />
              <Route path="/apply" element={
                <ProtectedRoute>
                  <ApplicationWizard />
                </ProtectedRoute>
              } />
              <Route path="/student/application-wizard" element={
                <ProtectedRoute>
                  <ApplicationWizard />
                </ProtectedRoute>
              } />
              <Route path="/application/:id" element={
                <ProtectedRoute>
                  <ApplicationStatus />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <StudentSettings />
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/applications" element={
                <AdminRoute>
                  <AdminApplications />
                </AdminRoute>
              } />
              <Route path="/admin/applications-new" element={
                <AdminRoute>
                  <ApplicationsAdmin />
                </AdminRoute>
              } />
              <Route path="/admin/programs" element={
                <AdminRoute>
                  <AdminPrograms />
                </AdminRoute>
              } />
              <Route path="/admin/intakes" element={
                <AdminRoute>
                  <AdminIntakes />
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              <Route path="/admin/settings" element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } />
              <Route path="/admin/analytics" element={
                <AdminRoute>
                  <AdminAnalytics />
                </AdminRoute>
              } />
              
              {/* 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>

              <OfflineIndicator />
            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App