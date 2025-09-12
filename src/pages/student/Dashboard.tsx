import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
import { 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  LogOut,
  Bell,
  Settings
} from 'lucide-react'

export default function StudentDashboard() {
  const { user, profile, signOut } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load user's applications using profile user_id
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', profile?.user_id || user?.id)
        .order('created_at', { ascending: false })

      if (applicationsError) throw applicationsError
      setApplications(applicationsData || [])

      // Load programs and intakes for reference
      const [programsResponse, intakesResponse] = await Promise.all([
        supabase.from('programs').select('*').eq('is_active', true),
        supabase.from('intakes').select('*').eq('is_active', true).order('application_deadline')
      ])

      if (programsResponse.error) throw programsResponse.error
      if (intakesResponse.error) throw intakesResponse.error

      setPrograms(programsResponse.data || [])
      setIntakes(intakesResponse.data || [])
    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-primary" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getProgramName = (programId: string) => {
    const program = programs.find(p => p.id === programId)
    return program?.name || 'Unknown Program'
  }

  const getIntakeName = (intakeId: string) => {
    const intake = intakes.find(i => i.id === intakeId)
    return intake?.name || 'Unknown Intake'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
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
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-secondary">
                    Welcome, {profile?.full_name || 'Student'}
                  </h1>
                  <p className="text-sm text-secondary">{profile?.email}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
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

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="bg-primary border border-primary/20 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary mb-2">
                  Ready to Apply?
                </h2>
                <p className="text-primary">
                  Start your application to join programs at Kalulushi Training Centre or Mukuba Institute of Health and Applied Sciences
                </p>
              </div>
              <Link to="/apply">
                <Button className="bg-primary hover:bg-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Application
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Applications List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">My Applications</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {applications.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-secondary mb-2">
                      No Applications Yet
                    </h3>
                    <p className="text-secondary mb-6">
                      You haven't submitted any applications. Start your journey by applying to our programs.
                    </p>
                    <Link to="/apply">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Application
                      </Button>
                    </Link>
                  </div>
                ) : (
                  applications.map((application) => (
                    <div key={application.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(application.status)}
                            <h4 className="text-sm font-medium text-secondary">
                              {getProgramName(application.program_id)}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getStatusColor(application.status)
                            }`}>
                              {application.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="text-sm text-secondary space-y-1">
                            <p>Application #{application.application_number}</p>
                            <p>Intake: {getIntakeName(application.intake_id)}</p>
                            <p>Submitted: {formatDate(application.submitted_at)}</p>
                          </div>
                        </div>
                        
                        <Link to={`/application/${application.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Profile Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-secondary">Full Name:</span>
                  <p className="font-medium">{profile?.full_name}</p>
                </div>
                <div>
                  <span className="text-secondary">Email:</span>
                  <p className="font-medium">{profile?.email}</p>
                </div>
                <div>
                  <span className="text-secondary">Phone:</span>
                  <p className="font-medium">{profile?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-secondary">City:</span>
                  <p className="font-medium">{profile?.city || 'Not provided'}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Update Profile
              </Button>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Upcoming Deadlines</h3>
              <div className="space-y-3">
                {intakes.slice(0, 3).map((intake) => (
                  <div key={intake.id} className="border-l-4 border-primary pl-4">
                    <p className="text-sm font-medium text-secondary">{intake.name}</p>
                    <p className="text-xs text-secondary">
                      Deadline: {formatDate(intake.application_deadline)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/apply" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Document Templates
                </Button>
                <Link to="/settings" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
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