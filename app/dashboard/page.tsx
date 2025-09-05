'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  GraduationCap, 
  User, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

type Application = {
  id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

const statusConfig = {
  draft: { label: 'Draft', icon: FileText, color: 'bg-gray-100 text-gray-800' },
  submitted: { label: 'Submitted', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  deferred: { label: 'Deferred', icon: AlertCircle, color: 'bg-orange-100 text-orange-800' },
}

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApplications, setLoadingApplications] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchApplications()
    }
  }, [user, loading, router])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoadingApplications(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const isAdmin = user?.email === 'jrrbqpnd@minimax.com'

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">MIHAS & KATC</h1>
                <p className="text-sm text-gray-600">Application Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? 'Administrator' : 'Applicant'}
                </p>
              </div>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user.email}!
          </h2>
          <p className="text-gray-600">
            Manage your diploma program applications and track their progress.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => router.push('/apply')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Application</span>
            </Button>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Applications
            </h3>
            {applications.length > 0 && (
              <p className="text-sm text-gray-500">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {loadingApplications ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  No applications yet
                </h4>
                <p className="text-gray-600 mb-6">
                  Start your journey by creating your first application.
                </p>
                <Button onClick={() => router.push('/apply')}>
                  Create Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {applications.map((application) => {
                const statusInfo = statusConfig[application.status]
                const StatusIcon = statusInfo.icon
                
                return (
                  <Card key={application.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-3">
                            <span>{application.program}</span>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {application.institution} • 
                            Created {new Date(application.created_at).toLocaleDateString()}
                            {application.submitted_at && (
                              <> • Submitted {new Date(application.submitted_at).toLocaleDateString()}</>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <p><strong>Application ID:</strong> {application.id.slice(0, 8)}...</p>
                          <p><strong>Last updated:</strong> {new Date(application.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div className="space-x-2">
                          {application.status === 'draft' && (
                            <Button 
                              size="sm"
                              onClick={() => router.push(`/apply/${application.id}`)}
                            >
                              Continue
                            </Button>
                          )}
                          {application.status === 'deferred' && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/apply/${application.id}`)}
                            >
                              Update
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/application/${application.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Programs Available */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Available Programs
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Nursing</CardTitle>
                <CardDescription>MIHAS Institution</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Comprehensive 3-year nursing program.
                </p>
                <p className="text-sm font-medium">Payment: MTN 0961515151</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Clinical Medicine</CardTitle>
                <CardDescription>KATC Institution</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Advanced 3-year clinical medicine program.
                </p>
                <p className="text-sm font-medium">Payment: MTN 0966992299</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600">Environmental Health</CardTitle>
                <CardDescription>KATC Institution</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Specialized 3-year environmental health program.
                </p>
                <p className="text-sm font-medium">Payment: MTN 0966992299</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}