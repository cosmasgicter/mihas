import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Link } from 'react-router-dom'
import { useDashboard, useNotifications } from '../../hooks/useDashboard'
import { useApplications } from '../../hooks/useApplications'
import { useToast } from '../../hooks/use-toast'
import { 
  FileText, 
  CreditCard, 
  GraduationCap, 
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { getUserStats } = useDashboard()
  const { getNotifications } = useNotifications()
  const { getApplications } = useApplications()
  
  const [stats, setStats] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadDashboardData()
  }, [user])
  
  const loadDashboardData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const [userStats, userApplications, userNotifications] = await Promise.all([
        getUserStats(user.id),
        getApplications(user.id),
        getNotifications(user.id, 5)
      ])
      
      setStats(userStats.stats)
      setApplications(userApplications || [])
      setNotifications(userNotifications || [])
    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  
  const quickActions = [
    {
      title: 'New Application',
      description: 'Apply for Nursing Diploma',
      icon: FileText,
      link: '/applications/new',
      color: 'bg-blue-500',
      available: !applications.some(app => app.status === 'draft')
    },
    {
      title: 'View Applications',
      description: 'Check your application status',
      icon: GraduationCap,
      link: '/applications',
      color: 'bg-green-500',
      available: true
    },
    {
      title: 'Profile',
      description: 'Update your information',
      icon: Users,
      link: '/profile',
      color: 'bg-purple-500',
      available: true
    }
  ]
  
  const actualStats = [
    {
      title: 'Total Applications',
      value: stats?.totalApplications || '0',
      icon: FileText,
      trend: applications.length > 0 ? 'Active' : 'None yet',
      color: 'text-blue-600'
    },
    {
      title: 'Pending Payments',
      value: stats?.pendingPayments || 0,
      icon: CreditCard,
      trend: stats?.pendingPayments > 0 ? `${stats.pendingPayments} pending` : 'All caught up',
      color: stats?.pendingPayments > 0 ? 'text-red-600' : 'text-green-600'
    },
    {
      title: 'Application Status',
      value: applications.length > 0 ? applications[0].status?.replace('_', ' ') || 'Unknown' : 'None',
      icon: Calendar,
      trend: applications.length > 0 ? 'Latest' : 'No applications',
      color: 'text-purple-600'
    }
  ]
  
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-blue-100 text-lg">
          MIHAS Application Management System
        </p>
        <p className="text-blue-200 mt-2">
          Manage your nursing diploma application and academic journey
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {actualStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 capitalize">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.trend}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks to help you get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link key={index} to={action.link}>
                  <div className={`p-4 border border-gray-200 rounded-lg transition-colors cursor-pointer ${
                    action.available ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                    {!action.available && (
                      <p className="text-xs text-red-500 mt-1">Complete current application first</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity/Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your latest application updates and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const getIcon = (type: string) => {
                  switch (type) {
                    case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
                    case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
                    default: return <AlertCircle className="w-5 h-5 text-blue-500" />
                  }
                }
                
                return (
                  <div key={notification.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    {getIcon(notification.notification_type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No recent activity
                </h3>
                <p className="text-gray-600">
                  Start by creating your first application for the Nursing Diploma program
                </p>
                <Link to="/applications/new">
                  <Button className="mt-4">
                    Start Application
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Program Information */}
      <Card>
        <CardHeader>
          <CardTitle>Nursing Diploma Program</CardTitle>
          <CardDescription>
            Information about your program of interest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Nursing Diploma - 3 Year Program</h3>
            <p className="text-blue-800 mb-4">
              Comprehensive three-year diploma program preparing students for professional nursing practice
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-blue-900">Duration:</strong>
                <p className="text-blue-700">3 years (6 semesters)</p>
              </div>
              <div>
                <strong className="text-blue-900">Requirements:</strong>
                <p className="text-blue-700">Grade 12 with credits in English, Mathematics, and Biology</p>
              </div>
              <div>
                <strong className="text-blue-900">Application Fee:</strong>
                <p className="text-blue-700">K150 ZMW</p>
              </div>
              <div>
                <strong className="text-blue-900">Intake:</strong>
                <p className="text-blue-700">2025-2026 Academic Year</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage