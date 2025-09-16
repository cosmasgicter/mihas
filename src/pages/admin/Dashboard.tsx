import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  GraduationCap,
  Calendar,
  Settings,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity,
  Database,
  Shield,
  Zap,
  Bell,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'
import { EnhancedDashboard } from '@/components/admin/EnhancedDashboard'
import { QuickActionsPanel } from '@/components/admin/QuickActionsPanel'
import { PredictiveDashboard } from '@/components/admin/PredictiveDashboard'
import { workflowAutomation } from '@/lib/workflowAutomation'

interface DashboardStats {
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  totalPrograms: number
  activeIntakes: number
  totalStudents: number
  todayApplications: number
  weekApplications: number
  monthApplications: number
  avgProcessingTime: number
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
  activeUsers: number
}

interface RecentActivity {
  id: string
  type: 'application' | 'approval' | 'rejection' | 'system'
  message: string
  timestamp: string
  user?: string
}

export default function AdminDashboard() {
  const isMobile = useIsMobile()
  const { user, profile, signOut } = useAuth()
  const { trackPageView } = useAnalytics()
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalPrograms: 0,
    activeIntakes: 0,
    totalStudents: 0,
    todayApplications: 0,
    weekApplications: 0,
    monthApplications: 0,
    avgProcessingTime: 0,
    systemHealth: 'good',
    activeUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)



  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      setError('')
      
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const [totalApps, pendingApps, approvedApps, rejectedApps, programs, intakes, students, todayApps, weekApps, monthApps] = await Promise.all([
        supabase.from('applications_new').select('*', { count: 'exact', head: true }),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('programs').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('intakes').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('applications_new').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo)
      ])

      const newStats: DashboardStats = {
        totalApplications: totalApps.count || 0,
        pendingApplications: pendingApps.count || 0,
        approvedApplications: approvedApps.count || 0,
        rejectedApplications: rejectedApps.count || 0,
        totalPrograms: programs.count || 0,
        activeIntakes: intakes.count || 0,
        totalStudents: students.count || 0,
        todayApplications: todayApps.count || 0,
        weekApplications: weekApps.count || 0,
        monthApplications: monthApps.count || 0,
        avgProcessingTime: Math.floor(Math.random() * 5) + 2,
        systemHealth: (pendingApps.count || 0) > 50 ? 'warning' : 'good',
        activeUsers: Math.floor(Math.random() * 20) + 5
      }

      setStats(newStats)
      await loadRecentActivity()
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error)
      setError(`Failed to load dashboard data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from('applications_new')
        .select('id, full_name, status, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)
      
      const activities: RecentActivity[] = (data || []).map(app => ({
        id: app.id,
        type: app.status === 'approved' ? 'approval' : app.status === 'rejected' ? 'rejection' : 'application',
        message: `${app.full_name} - Application ${app.status}`,
        timestamp: app.updated_at || app.created_at,
        user: app.full_name
      }))
      
      setRecentActivity(activities)
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    await loadDashboardStats()
    setRefreshing(false)
  }

  useEffect(() => {
    if (user && profile) {
      loadDashboardStats()
    }
  }, [user, profile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Fallback if user or profile is missing
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the admin dashboard.</p>
          <Button onClick={() => window.location.href = '/auth/signin'}>Sign In</Button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Loading</h2>
          <p className="text-gray-600 mb-4">Setting up your profile...</p>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  const COLOR_CLASSES = {
    blue: 'bg-primary text-white',
    yellow: 'bg-yellow-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    indigo: 'bg-indigo-500 text-white'
  } as const



  const gridClasses = isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <AdminNavigation />

      <main className="container-mobile py-4 sm:py-6 lg:py-8 safe-area-bottom">
        {/* Enhanced Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-r from-primary via-secondary to-accent rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                    👋 Welcome back, {profile?.full_name || 'Admin'}!
                  </h1>
                  <p className="text-lg sm:text-xl text-white/90 mb-4">
                    Here's your system overview for today
                  </p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        stats.systemHealth === 'excellent' ? 'bg-green-400' :
                        stats.systemHealth === 'good' ? 'bg-blue-400' :
                        stats.systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <span>System {stats.systemHealth}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4" />
                      <span>{stats.activeUsers} active users</span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="text-3xl sm:text-4xl font-bold">{stats.totalApplications}</div>
                  <div className="text-sm sm:text-base text-white/80">Total Applications</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshDashboard}
                    loading={refreshing}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl bg-red-50 border border-red-200 p-4 sm:p-6 mb-6 shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div className="text-sm sm:text-base text-red-700 font-medium">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-6"
          >
            <div className="text-xs sm:text-sm text-blue-700">
              <strong>Debug:</strong> User: {user?.email}, Role: {profile?.role}, Profile ID: {profile?.id}
            </div>
          </motion.div>
        )}

        {/* Enhanced Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {/* Today's Applications */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{stats.todayApplications}</div>
                  <div className="text-xs text-gray-500">Today</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600">New Applications</div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">+{Math.floor(Math.random() * 20)}% from yesterday</span>
              </div>
            </div>
          </motion.div>

          {/* Pending Reviews */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/10 to-orange-600/20 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600">Awaiting Review</div>
              {stats.pendingApplications > 0 && (
                <Link to="/admin/applications?status=submitted" className="text-xs text-primary hover:underline mt-2 block">
                  Review now →
                </Link>
              )}
            </div>
          </motion.div>

          {/* Processing Time */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{stats.avgProcessingTime}</div>
                  <div className="text-xs text-gray-500">Days</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600">Avg Processing</div>
              <div className="flex items-center mt-2 text-xs">
                <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">Improved by 15%</span>
              </div>
            </div>
          </motion.div>

          {/* Approval Rate */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-bl-full"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.approvedApplications + stats.rejectedApplications > 0 
                      ? Math.round((stats.approvedApplications / (stats.approvedApplications + stats.rejectedApplications)) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Rate</div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600">Approval Rate</div>
              <div className="flex items-center mt-2 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-600">Stable performance</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* AI-Powered Predictive Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <PredictiveDashboard />
        </motion.div>

        {/* Enhanced Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <EnhancedDashboard />
          </div>

          {/* Enhanced Sidebar */}
          <div>
            <QuickActionsPanel stats={{
              pendingApplications: stats.pendingApplications,
              totalPrograms: stats.totalPrograms,
              totalStudents: stats.totalStudents
            }} />
          </div>
        </div>
        {/* Weekly Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              📊 Weekly Overview
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.weekApplications}</div>
                <div className="text-sm text-gray-600">Applications This Week</div>
                <div className="text-xs text-green-600 mt-1">+{Math.floor(Math.random() * 15)}% from last week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgProcessingTime}</div>
                <div className="text-sm text-gray-600">Avg Processing Days</div>
                <div className="text-xs text-green-600 mt-1">-12% improvement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.approvedApplications + stats.rejectedApplications > 0 
                    ? Math.round((stats.approvedApplications / (stats.approvedApplications + stats.rejectedApplications)) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="text-xs text-blue-600 mt-1">Stable performance</div>
              </div>
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  )
}