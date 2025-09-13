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
  AlertTriangle
} from 'lucide-react'
import { Link } from 'react-router-dom'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AdminNavigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="rounded-md bg-blue-50 p-4 mb-6">
            <div className="text-sm text-blue-700">
              <strong>Debug:</strong> User: {user?.email}, Role: {profile?.role}, Profile ID: {profile?.id}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`grid ${gridClasses} mb-8`}>
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary">{stat.title}</p>
                    <p className="text-3xl font-bold text-secondary">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${COLOR_CLASSES[stat.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 lg:grid-cols-3 gap-8'}`}>
          {/* Quick Actions */}
          <div className={isMobile ? '' : 'lg:col-span-2'}>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">Quick Actions</h3>
              </div>
              
              <div className="p-6">
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                  <Link to="/admin/applications">
                    <Button className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-6 w-6" />
                      <span>Manage Applications</span>
                    </Button>
                  </Link>
                  
                  <Link to="/admin/programs">
                    <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                      <GraduationCap className="h-6 w-6" />
                      <span>Manage Programs</span>
                    </Button>
                  </Link>
                  
                  <Link to="/admin/intakes">
                    <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                      <Calendar className="h-6 w-6" />
                      <span>Manage Intakes</span>
                    </Button>
                  </Link>
                  
                  <Link to="/admin/users">
                    <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                      <Users className="h-6 w-6" />
                      <span>Manage Users</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Alerts */}
          <div className="space-y-6">
            {/* Alerts */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">Alerts</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Pending Reviews
                    </p>
                    <p className="text-xs text-yellow-600">
                      {stats.pendingApplications} applications need review
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Upcoming Deadline
                    </p>
                    <p className="text-xs text-blue-600">
                      Check intake deadlines in the Intakes section
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">System Status</h3>
              </div>
              
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Application System</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Document Upload</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary">Email Notifications</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">Quick Settings</h3>
              </div>
              
              <div className="p-6">
                <Link to="/admin/settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    System Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}