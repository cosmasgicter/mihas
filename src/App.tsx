import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'

// Pages
import LandingPage from '@/pages/LandingPage'
import SignInPage from '@/pages/auth/SignInPage'
import SignUpPage from '@/pages/auth/SignUpPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import StudentDashboard from '@/pages/student/Dashboard'
import ApplicationForm from '@/pages/student/ApplicationForm'
import ApplicationStatus from '@/pages/student/ApplicationStatus'
import { DashboardRedirect } from '@/components/DashboardRedirect'
import StudentSettings from '@/pages/student/Settings'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminApplications from '@/pages/admin/Applications'
import AdminPrograms from '@/pages/admin/Programs'
import AdminIntakes from '@/pages/admin/Intakes'
import AdminUsers from '@/pages/admin/Users'
import AdminSettings from '@/pages/admin/Settings'
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
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
                  <ApplicationForm />
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
              
              {/* 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App