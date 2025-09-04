import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from './components/ui/toaster'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AuthCallback from './pages/auth/AuthCallback'
import DashboardPage from './pages/dashboard/DashboardPage'
import ApplicationsPage from './pages/applications/ApplicationsPage'
import NewApplicationPage from './pages/applications/NewApplicationPage'
import PaymentPage from './pages/payment/PaymentPage'
import PaymentCallbackPage from './pages/payment/PaymentCallbackPage'
import ProfilePage from './pages/profile/ProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import { useAuth } from './contexts/AuthContext'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children, requiredRoles }: { 
  children: React.ReactNode
  requiredRoles?: string[]
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// App Routes Component
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes - wrapped in Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<NewApplicationPage />} />
        <Route path="payment/:applicationId" element={<PaymentPage />} />
        <Route path="profile" element={<ProfilePage />} />
        
        {/* Admin routes */}
        <Route path="admin" element={
          <ProtectedRoute requiredRoles={['admin', 'registrar', 'academic_staff']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Payment callback (outside layout) */}
      <Route path="/payment/callback" element={<PaymentCallbackPage />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App