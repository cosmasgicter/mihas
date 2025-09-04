import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboard } from '../../hooks/useDashboard'
import { useToast } from '../../hooks/use-toast'
import { 
  Users, 
  FileText, 
  CreditCard, 
  GraduationCap, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Edit,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3
} from 'lucide-react'
import { Input } from '../../components/ui/input'

interface DashboardStats {
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  totalStudents: number
  activeStudents: number
  totalPayments: number
  pendingPayments: number
  totalRevenue: number
  recentApplications: any[]
  recentPayments: any[]
  systemHealth: {
    database: 'healthy' | 'warning' | 'error'
    storage: 'healthy' | 'warning' | 'error'
    payments: 'healthy' | 'warning' | 'error'
  }
}

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { getDashboardData } = useDashboard()
  const { toast } = useToast()
  
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  
  useEffect(() => {
    loadDashboardData()
  }, [])
  
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await getDashboardData()
      setDashboardData(data.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, color: 'bg-gray-500' },
      submitted: { label: 'Submitted', variant: 'default' as const, color: 'bg-blue-500' },
      under_review: { label: 'Under Review', variant: 'default' as const, color: 'bg-yellow-500' },
      accepted: { label: 'Accepted', variant: 'default' as const, color: 'bg-green-500' },
      rejected: { label: 'Rejected', variant: 'destructive' as const, color: 'bg-red-500' },
      payment_pending: { label: 'Payment Pending', variant: 'default' as const, color: 'bg-orange-500' },
      enrolled: { label: 'Enrolled', variant: 'default' as const, color: 'bg-purple-500' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted
    return (
      <Badge variant={config.variant} className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    )
  }
  
  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Administrative tools and system overview for {user?.role?.replace('_', ' ')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh Data
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
      
      {/* System Health Status */}
      {dashboardData?.systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Database</span>
                <div className="flex items-center space-x-2">
                  {getHealthIcon(dashboardData.systemHealth.database)}
                  <span className="capitalize text-sm">{dashboardData.systemHealth.database}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Storage</span>
                <div className="flex items-center space-x-2">
                  {getHealthIcon(dashboardData.systemHealth.storage)}
                  <span className="capitalize text-sm">{dashboardData.systemHealth.storage}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Payments</span>
                <div className="flex items-center space-x-2">
                  {getHealthIcon(dashboardData.systemHealth.payments)}
                  <span className="capitalize text-sm">{dashboardData.systemHealth.payments}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData?.totalApplications || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData?.activeStudents || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-3xl font-bold text-gray-900">{dashboardData?.pendingPayments || 0}</p>
                <p className="text-sm text-yellow-600 mt-1">Pending review</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">ZMW {dashboardData?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-1 md:grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Latest application submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.recentApplications?.slice(0, 5).map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{application.user_name}</p>
                        <p className="text-sm text-gray-600">{application.program_name}</p>
                        <p className="text-xs text-gray-500">{new Date(application.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(application.status)}
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )) || []}
                  {(!dashboardData?.recentApplications || dashboardData.recentApplications.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No recent applications</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.recentPayments?.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payment.payer_name}</p>
                        <p className="text-sm text-gray-600">ZMW {payment.amount}</p>
                        <p className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )) || []}
                  {(!dashboardData?.recentPayments || dashboardData.recentPayments.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No recent payments</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Application Management</CardTitle>
                  <CardDescription>Review and manage student applications</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Application list would go here */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Application management interface will be populated with real data from the backend.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>Manage enrolled students and their records</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Student management interface coming soon. This will include student enrollment, academic records, and profile management.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>Monitor and manage all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment management interface coming soon. This will include payment tracking, refund processing, and financial reporting.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboardPage