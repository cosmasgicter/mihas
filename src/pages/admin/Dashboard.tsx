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
  BarChart3
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'

interface DashboardStats {
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  totalPrograms: number
  activeIntakes: number
  totalStudents: number
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
    totalStudents: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')



  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Load stats with graceful error handling
        const statsPromises = [
          supabase.from('applications_new').select('*', { count: 'exact', head: true }).then(r => ({ type: 'total_apps', count: r.count || 0, error: r.error })),
          supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'submitted').then(r => ({ type: 'pending_apps', count: r.count || 0, error: r.error })),
          supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'approved').then(r => ({ type: 'approved_apps', count: r.count || 0, error: r.error })),
          supabase.from('applications_new').select('*', { count: 'exact', head: true }).eq('status', 'rejected').then(r => ({ type: 'rejected_apps', count: r.count || 0, error: r.error })),
          supabase.from('programs').select('*', { count: 'exact', head: true }).eq('is_active', true).then(r => ({ type: 'programs', count: r.count || 0, error: r.error })),
          supabase.from('intakes').select('*', { count: 'exact', head: true }).eq('is_active', true).then(r => ({ type: 'intakes', count: r.count || 0, error: r.error })),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').then(r => ({ type: 'students', count: r.count || 0, error: r.error }))
        ]

        const results = await Promise.allSettled(statsPromises)
        const newStats = { ...stats }
        const errors: string[] = []

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { type, count, error } = result.value
            if (error) {
              errors.push(`${type}: ${error.message}`)
            } else {
              switch (type) {
                case 'total_apps':
                  newStats.totalApplications = count
                  break
                case 'pending_apps':
                  newStats.pendingApplications = count
                  break
                case 'approved_apps':
                  newStats.approvedApplications = count
                  break
                case 'rejected_apps':
                  newStats.rejectedApplications = count
                  break
                case 'programs':
                  newStats.totalPrograms = count
                  break
                case 'intakes':
                  newStats.activeIntakes = count
                  break
                case 'students':
                  newStats.totalStudents = count
                  break
              }
            }
          } else {
            errors.push(`Query ${index + 1} failed: ${result.reason}`)
          }
        })

        setStats(newStats)
        
        if (errors.length > 0) {
          setError(`Some data could not be loaded: ${errors.join(', ')}`)
        }
      } catch (error: any) {
        console.error('Error loading dashboard stats:', error)
        setError(`Failed to load dashboard data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    // Add a small delay to ensure auth is fully loaded
    const timer = setTimeout(loadDashboardStats, 100)
    return () => clearTimeout(timer)
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

  const statCards = [
    { title: 'Total Applications', value: stats.totalApplications, icon: FileText, color: 'blue' as const },
    { title: 'Pending Reviews', value: stats.pendingApplications, icon: Clock, color: 'yellow' as const },
    { title: 'Approved', value: stats.approvedApplications, icon: CheckCircle, color: 'green' as const },
    { title: 'Rejected', value: stats.rejectedApplications, icon: XCircle, color: 'red' as const },
    { title: 'Active Programs', value: stats.totalPrograms, icon: GraduationCap, color: 'purple' as const },
    { title: 'Active Intakes', value: stats.activeIntakes, icon: Calendar, color: 'indigo' as const }
  ]

  const gridClasses = isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <AdminNavigation />

      <main className="container-mobile py-4 sm:py-6 lg:py-8 safe-area-bottom">
        {/* Welcome Section - Mobile First */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                  👋 Welcome back, {profile?.full_name || 'Admin'}!
                </h1>
                <p className="text-lg sm:text-xl text-white/90">
                  Here's what's happening with your applications today
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-bold">{stats.totalApplications}</div>
                <div className="text-sm sm:text-base text-white/80">Total Applications</div>
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

        {/* Enhanced Stats Grid - Mobile First */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                    {stat.title === 'Pending Reviews' && stat.value > 0 && (
                      <Link to="/admin/applications?status=submitted" className="text-xs text-primary hover:underline mt-1 block">
                        View pending →
                      </Link>
                    )}
                  </div>
                  <div className={`p-3 sm:p-4 rounded-2xl ${COLOR_CLASSES[stat.color]} shadow-lg`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Quick Actions - Mobile First */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                  ⚡ Quick Actions
                </h3>
                <p className="text-sm text-gray-600 mt-1">Manage your system efficiently</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link to="/admin/applications">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group"
                    >
                      <Button className="w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                        <FileText className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm sm:text-base">Manage Applications</span>
                        {stats.pendingApplications > 0 && (
                          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                            {stats.pendingApplications} pending
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </Link>
                  
                  <Link to="/admin/programs">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group"
                    >
                      <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300">
                        <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm sm:text-base">Manage Programs</span>
                        <span className="text-xs text-gray-500">{stats.totalPrograms} active</span>
                      </Button>
                    </motion.div>
                  </Link>
                  
                  <Link to="/admin/intakes">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group"
                    >
                      <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-secondary hover:bg-secondary/5 transition-all duration-300">
                        <Calendar className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm sm:text-base">Manage Intakes</span>
                        <span className="text-xs text-gray-500">{stats.activeIntakes} active</span>
                      </Button>
                    </motion.div>
                  </Link>
                  
                  <Link to="/admin/users">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group"
                    >
                      <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300">
                        <Users className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm sm:text-base">Manage Users</span>
                        <span className="text-xs text-gray-500">{stats.totalStudents} students</span>
                      </Button>
                    </motion.div>
                  </Link>
                  
                  <Link to="/admin/analytics" className="sm:col-span-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group"
                    >
                      <Button variant="outline" className="w-full h-20 sm:h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-green-500 hover:bg-green-50 transition-all duration-300">
                        <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm sm:text-base">Analytics & Reports</span>
                        <span className="text-xs text-gray-500">View insights</span>
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Alerts & System Status - Mobile First */}
          <div className="space-y-6">
            {/* Alerts */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  🚨 Alerts
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start space-x-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200"
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800">
                      Pending Reviews
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      {stats.pendingApplications} applications need review
                    </p>
                    {stats.pendingApplications > 0 && (
                      <Link to="/admin/applications?status=submitted" className="text-xs text-yellow-700 hover:underline mt-2 block font-medium">
                        Review now →
                      </Link>
                    )}
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                >
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-800">
                      Upcoming Deadlines
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Check intake deadlines in the Intakes section
                    </p>
                    <Link to="/admin/intakes" className="text-xs text-blue-700 hover:underline mt-2 block font-medium">
                      View intakes →
                    </Link>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* System Status */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  💚 System Status
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Application System</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                    ✓ Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Document Upload</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                    ✓ Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                    ✓ Active
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Settings */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  ⚙️ Quick Settings
                </h3>
              </div>
              
              <div className="p-6">
                <Link to="/admin/settings">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" className="w-full h-12 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300">
                      <Settings className="h-5 w-5 mr-2" />
                      <span className="font-semibold">System Settings</span>
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}