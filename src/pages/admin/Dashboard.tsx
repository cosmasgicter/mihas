import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  GraduationCap,
  Calendar,
  Settings,
  LogOut,
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
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Get all stats directly from database
      const [applicationsResponse, programsResponse, intakesResponse, profilesResponse] = await Promise.all([
        supabase.from('applications').select('status', { count: 'exact' }),
        supabase.from('programs').select('count', { count: 'exact' }).eq('is_active', true),
        supabase.from('intakes').select('count', { count: 'exact' }).eq('is_active', true),
        supabase.from('user_profiles').select('count', { count: 'exact' }).eq('role', 'student')
      ])

      // Calculate application stats
      const applications = applicationsResponse.data || []
      const totalApplications = applications.length
      const pendingApplications = applications.filter(app => app.status === 'pending').length
      const approvedApplications = applications.filter(app => app.status === 'approved').length
      const rejectedApplications = applications.filter(app => app.status === 'rejected').length

      setStats({
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalPrograms: programsResponse.count || 0,
        activeIntakes: intakesResponse.count || 0,
        totalStudents: profilesResponse.count || 0
      })
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: FileText,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingApplications,
      icon: Clock,
      color: 'yellow',
      change: '+5%'
    },
    {
      title: 'Approved',
      value: stats.approvedApplications,
      icon: CheckCircle,
      color: 'green',
      change: '+8%'
    },
    {
      title: 'Rejected',
      value: stats.rejectedApplications,
      icon: XCircle,
      color: 'red',
      change: '-2%'
    },
    {
      title: 'Active Programs',
      value: stats.totalPrograms,
      icon: GraduationCap,
      color: 'purple',
      change: '0%'
    },
    {
      title: 'Active Intakes',
      value: stats.activeIntakes,
      icon: Calendar,
      color: 'indigo',
      change: '+1%'
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-primary text-white'
      case 'yellow': return 'bg-yellow-500 text-white'
      case 'green': return 'bg-green-500 text-white'
      case 'red': return 'bg-red-500 text-white'
      case 'purple': return 'bg-purple-500 text-white'
      case 'indigo': return 'bg-indigo-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-secondary">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-secondary">
                    Welcome back, {profile?.full_name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-secondary capitalize">
                Role: {profile?.role?.replace('_', ' ')}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary">{stat.title}</p>
                    <p className="text-3xl font-bold text-secondary">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${getColorClasses(stat.color)}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">{stat.change}</span>
                  <span className="text-secondary ml-1">from last month</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">Quick Actions</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div className="flex items-start space-x-3 p-3 bg-primary rounded-lg">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Upcoming Deadline
                    </p>
                    <p className="text-xs text-primary">
                      May 2025 application deadline in 30 days
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