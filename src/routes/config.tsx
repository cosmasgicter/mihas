import React from 'react'

// Lazy load all page components
const LandingPage = React.lazy(() => import('@/pages/LandingPage'))
const SignInPage = React.lazy(() => import('@/pages/auth/SignInPage'))
const SignUpPage = React.lazy(() => import('@/pages/auth/SignUpPage'))
const AuthCallbackPage = React.lazy(() => import('@/pages/auth/AuthCallbackPage'))
const StudentDashboard = React.lazy(() => import('@/pages/student/Dashboard'))
const ApplicationWizard = React.lazy(() => import('@/pages/student/ApplicationWizard'))
const ApplicationStatus = React.lazy(() => import('@/pages/student/ApplicationStatus'))
const StudentSettings = React.lazy(() => import('@/pages/student/Settings'))
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'))
const AdminApplications = React.lazy(() => import('@/pages/admin/Applications'))
const ApplicationsAdmin = React.lazy(() => import('@/pages/admin/ApplicationsAdmin'))
const AdminPrograms = React.lazy(() => import('@/pages/admin/Programs'))
const AdminIntakes = React.lazy(() => import('@/pages/admin/Intakes'))
const AdminUsers = React.lazy(() => import('@/pages/admin/Users'))
const AdminSettings = React.lazy(() => import('@/pages/admin/Settings'))
const AdminAnalytics = React.lazy(() => import('@/pages/admin/Analytics'))
const AIInsights = React.lazy(() => import('@/pages/admin/AIInsights'))
const WorkflowAutomation = React.lazy(() => import('@/pages/admin/WorkflowAutomation'))
const PublicApplicationTracker = React.lazy(() => import('@/pages/PublicApplicationTracker'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))

// Special components that don't need lazy loading
import { DashboardRedirect } from '@/components/DashboardRedirect'
import { Navigate } from 'react-router-dom'

export type RouteGuard = 'public' | 'auth' | 'admin'

export interface RouteConfig {
  path: string
  element: React.ComponentType | React.ReactElement
  guard: RouteGuard
  lazy?: boolean
}

export const routes: RouteConfig[] = [
  // Public routes
  { path: '/', element: LandingPage, guard: 'public', lazy: true },
  { path: '/track-application', element: PublicApplicationTracker, guard: 'public', lazy: true },
  { path: '/auth/signin', element: SignInPage, guard: 'public', lazy: true },
  { path: '/signin', element: SignInPage, guard: 'public', lazy: true },
  { path: '/login', element: SignInPage, guard: 'public', lazy: true },
  { path: '/auth/signup', element: SignUpPage, guard: 'public', lazy: true },
  { path: '/auth/callback', element: AuthCallbackPage, guard: 'public', lazy: true },
  
  // Dashboard redirect (no lazy loading needed)
  { path: '/dashboard', element: <DashboardRedirect />, guard: 'public' },
  
  // Student routes
  { path: '/student/dashboard', element: StudentDashboard, guard: 'auth', lazy: true },
  { path: '/apply', element: ApplicationWizard, guard: 'auth', lazy: true },
  { path: '/student/application-wizard', element: ApplicationWizard, guard: 'auth', lazy: true },
  { path: '/application/:id', element: ApplicationStatus, guard: 'auth', lazy: true },
  { path: '/settings', element: StudentSettings, guard: 'auth', lazy: true },
  
  // Admin routes
  { path: '/admin', element: AdminDashboard, guard: 'admin', lazy: true },
  { path: '/admin/applications', element: AdminApplications, guard: 'admin', lazy: true },
  { path: '/admin/applications-new', element: ApplicationsAdmin, guard: 'admin', lazy: true },
  { path: '/admin/programs', element: AdminPrograms, guard: 'admin', lazy: true },
  { path: '/admin/intakes', element: AdminIntakes, guard: 'admin', lazy: true },
  { path: '/admin/users', element: AdminUsers, guard: 'admin', lazy: true },
  { path: '/admin/settings', element: AdminSettings, guard: 'admin', lazy: true },
  { path: '/admin/analytics', element: AdminAnalytics, guard: 'admin', lazy: true },
  { path: '/admin/ai-insights', element: AIInsights, guard: 'admin', lazy: true },
  { path: '/admin/workflow', element: WorkflowAutomation, guard: 'admin', lazy: true },
  
  // 404 routes
  { path: '/404', element: NotFoundPage, guard: 'public', lazy: true },
  { path: '*', element: <Navigate to="/404" replace />, guard: 'public' },
]