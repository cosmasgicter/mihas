import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthenticatedNavigation } from '@/components/ui/AuthenticatedNavigation'
import { formatDate, getStatusColor } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus
} from 'lucide-react'

export default function StudentDashboard() {
  const isMobile = useIsMobile()
  const { user, profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  // Listen for storage changes to update draft status
  useEffect(() => {
    const handleStorageChange = () => {
      const savedDraft = localStorage.getItem('applicationDraft')
      setHasDraft(!!savedDraft)
    }

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange)
    
    // Also check when the window gains focus (user returns from another page)
    window.addEventListener('focus', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Check for saved draft
      const savedDraft = localStorage.getItem('applicationDraft')
      setHasDraft(!!savedDraft)
      
      // Load user's applications using profile user_id
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications_new')
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
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
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

  const getProgramName = (programName: string) => {
    return programName || 'Unknown Program'
  }

  const getIntakeName = (intakeName: string) => {
    return intakeName || 'Unknown Intake'
  }

  const getDraftTimestamp = () => {
    try {
      const savedDraft = localStorage.getItem('applicationDraft')
      if (!savedDraft) return 'Unknown'
      
      const draft = JSON.parse(savedDraft)
      if (!draft || typeof draft !== 'object') {
        return 'Unknown'
      }
      
      return draft.savedAt ? formatDate(draft.savedAt) : 'Unknown'
    } catch (error) {
      console.error('Error parsing draft timestamp:', error)
      localStorage.removeItem('applicationDraft')
      return 'Unknown'
    }
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
      <AuthenticatedNavigation />

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
                  {hasDraft ? 'Continue Your Application' : 'Ready to Apply?'}
                </h2>
                <p className="text-primary">
                  {hasDraft 
                    ? 'You have a saved draft. Continue where you left off or start a new application.'
                    : 'Start your application to join programs at Kalulushi Training Centre or Mukuba Institute of Health and Applied Sciences'
                  }
                </p>
              </div>
              <div className="flex space-x-3">
                {hasDraft && (
                  <Link to="/apply">
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      <FileText className="h-4 w-4 mr-2" />
                      Continue Draft
                    </Button>
                  </Link>
                )}
                <Link to="/student/application-wizard">
                  <Button className="bg-primary hover:bg-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    {hasDraft ? 'New Wizard Application' : 'Start New Application'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 lg:grid-cols-3 gap-8'}`}>
          {/* Applications List */}
          <div className={isMobile ? '' : 'lg:col-span-2'}>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-secondary">My Applications</h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {applications.length === 0 && !hasDraft ? (
                  <div className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-secondary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-secondary mb-2">
                      No Applications Yet
                    </h3>
                    <p className="text-secondary mb-6">
                      You haven't submitted any applications. Start your journey by applying to our programs.
                    </p>
                    <Link to="/student/application-wizard">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Application
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {hasDraft && (
                      <div className="px-6 py-4 hover:bg-gray-50 bg-yellow-50 border-l-4 border-yellow-400">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Clock className="h-5 w-5 text-yellow-500" />
                              <h4 className="text-sm font-medium text-secondary">
                                Draft Application
                              </h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                DRAFT
                              </span>
                            </div>
                            
                            <div className="text-sm text-secondary space-y-1">
                              <p>You have an unsaved application draft</p>
                              <p>Last saved: {getDraftTimestamp()}</p>
                            </div>
                          </div>
                          
                          <Link to="/apply">
                            <Button variant="outline" size="sm">
                              Continue Draft
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                    {applications.map((application) => (
                      <div key={application.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStatusIcon(application.status)}
                              <h4 className="text-sm font-medium text-secondary">
                                {getProgramName(application.program)}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getStatusColor(application.status)
                              }`}>
                                {application.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="text-sm text-secondary space-y-1">
                              <p>Application #{application.application_number}</p>
                              <p>Intake: {getIntakeName(application.intake)}</p>
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
                    ))}
                  </>
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
                {hasDraft ? (
                  <>
                    <Link to="/apply" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Continue Draft
                      </Button>
                    </Link>
                    <Link to="/student/application-wizard" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        New Wizard Application
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to="/student/application-wizard" className="block">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      New Application
                    </Button>
                  </Link>
                )}
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