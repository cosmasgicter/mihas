import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Link } from 'react-router-dom'
import { FileText, Plus, Eye, Calendar, CreditCard, Loader } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApplications } from '../../hooks/useApplications'
import { useToast } from '../../hooks/use-toast'

const ApplicationsPage: React.FC = () => {
  const { user } = useAuth()
  const { getApplications } = useApplications()
  const { toast } = useToast()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const data = await getApplications(user?.id)
      setApplications(data || [])
    } catch (error: any) {
      console.error('Error loading applications:', error)
      toast({
        title: 'Error',
        description: 'Failed to load applications',
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
      payment_pending: { label: 'Payment Pending', variant: 'default' as const, color: 'bg-orange-500' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return (
      <Badge variant={config.variant} className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    )
  }
  
  const getStatusDescription = (status: string) => {
    const descriptions = {
      draft: 'Complete your application and submit for review',
      submitted: 'Your application has been submitted and is being processed',
      under_review: 'Our admissions team is reviewing your application',
      accepted: 'Congratulations! Your application has been accepted',
      rejected: 'Your application was not successful this time',
      payment_pending: 'Please complete payment to finalize your application'
    }
    
    return descriptions[status as keyof typeof descriptions] || 'Status unknown'
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">
            Track and manage your program applications
          </p>
        </div>
        <Link to="/applications/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </Link>
      </div>
      
      {/* Applications Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
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
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {applications.filter(app => ['draft', 'submitted', 'under_review'].includes(app.status)).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {applications.filter(app => ['accepted', 'rejected'].includes(app.status)).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Application History</CardTitle>
          <CardDescription>
            Review your submitted and draft applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No applications yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start your academic journey by creating your first application
              </p>
              <Link to="/applications/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Application
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.academic_programs?.program_name || 'Program Name Not Available'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Application ID: {application.app_id || application.id}
                      </p>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    {getStatusDescription(application.status)}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(application.created_at).toLocaleDateString()}</span>
                      {application.submitted_at && (
                        <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {application.status === 'draft' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Continue Application
                        </Button>
                      )}
                      {application.status === 'payment_pending' && (
                        <Link to={`/payment/${application.id}`}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Make Payment
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicationsPage