import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthenticatedNavigation } from '@/components/ui/AuthenticatedNavigation'
import { ContinueApplication } from '@/components/application/ContinueApplication'
import { formatDate, getStatusColor } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { applicationSessionManager } from '@/lib/applicationSession'
import { 
  User, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function StudentDashboard() {
  const isMobile = useIsMobile()
  const { user, profile } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  // Listen for storage changes to update draft status
  useEffect(() => {
    const handleStorageChange = () => {
      const savedDraft = localStorage.getItem('applicationWizardDraft')
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          setHasDraft(true)
          setDraftData(draft)
        } catch (error) {
          setHasDraft(false)
          setDraftData(null)
        }
      } else {
        setHasDraft(false)
        setDraftData(null)
      }
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
      
      // Check for saved draft in localStorage
      const savedDraft = localStorage.getItem('applicationWizardDraft')
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft)
          setHasDraft(true)
          setDraftData(draft)
        } catch (error) {
          console.error('Error parsing draft:', error)
          localStorage.removeItem('applicationWizardDraft')
          setHasDraft(false)
        }
      } else {
        setHasDraft(false)
      }
      
      // Also check for database draft
      const { data: dbDraft } = await supabase
        .rpc('get_application_draft', { p_user_id: profile?.user_id || user?.id })
      
      if (dbDraft && dbDraft.length > 0) {
        setHasDraft(true)
        setDraftData(dbDraft[0])
      }
      
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
    if (draftData?.savedAt) {
      return formatDate(draftData.savedAt)
    }
    if (draftData?.updated_at) {
      return formatDate(draftData.updated_at)
    }
    return 'Unknown'
  }

  const getDraftProgress = () => {
    if (!draftData) return 'No progress'
    
    const step = draftData.currentStep || draftData.step_completed || 1
    const steps = ['KYC Info', 'Education', 'Payment', 'Review']
    return `Step ${step}/4: ${steps[step - 1] || 'Unknown'}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <AuthenticatedNavigation />

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
                  🎓 Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-lg sm:text-xl text-white/90">
                  Track your applications and manage your profile
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl sm:text-4xl font-bold">{applications.length}</div>
                <div className="text-sm sm:text-base text-white/80">Applications</div>
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
                <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div className="text-sm sm:text-base text-red-700 font-medium">{error}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Application */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <ContinueApplication />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Applications List - Mobile First */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                  📋 My Applications
                </h3>
                <p className="text-sm text-gray-600 mt-1">Track your application progress</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {applications.length === 0 && !hasDraft ? (
                  <div className="px-6 py-16 text-center">
                    <div className="text-8xl mb-6">📋</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      No Applications Yet
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      You haven't submitted any applications. Start your journey by applying to our programs.
                    </p>
                    <Link to="/student/application-wizard">
                      <Button className="bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-lg hover:shadow-xl">
                        <Plus className="h-5 w-5 mr-2" />
                        Create First Application
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Show draft applications from database */}
                    {applications.filter(app => app.status === 'draft').map((application) => (
                      <motion.div 
                        key={`draft-${application.id}`} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-6 py-4 hover:bg-yellow-50 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 transition-all duration-300"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Clock className="h-5 w-5 text-yellow-600" />
                              <h4 className="text-base font-semibold text-gray-900">
                                📝 Draft Application
                              </h4>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-200 text-yellow-800">
                                DRAFT
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><strong>Application:</strong> #{application.application_number}</p>
                              <p><strong>Program:</strong> {application.program}</p>
                              <p><strong>Intake:</strong> {application.intake}</p>
                              <p><strong>Created:</strong> {formatDate(application.created_at)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Link to="/student/application-wizard">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full sm:w-auto text-yellow-700 border-yellow-300 hover:bg-yellow-100 font-semibold"
                              >
                                Continue Draft
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50 font-semibold"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
                                  try {
                                    // Use the centralized deletion method
                                    await applicationSessionManager.deleteDraft(profile?.user_id || user?.id)
                                    
                                    // Refresh the dashboard data
                                    loadDashboardData()
                                  } catch (error) {
                                    console.error('Error deleting draft:', error)
                                    alert('Failed to delete draft. Please try again.')
                                  }
                                }
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Show localStorage draft if exists */}
                    {hasDraft && !applications.some(app => app.status === 'draft') && (
                      <div className="px-6 py-4 hover:bg-gray-50 bg-yellow-50 border-l-4 border-yellow-400">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Clock className="h-5 w-5 text-yellow-500" />
                              <h4 className="text-sm font-medium text-secondary">
                                📝 Draft Application
                              </h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                DRAFT
                              </span>
                            </div>
                            
                            <div className="text-sm text-secondary space-y-1">
                              <p>Progress: {getDraftProgress()}</p>
                              <p>Last saved: {getDraftTimestamp()}</p>
                              {draftData?.formData?.program && (
                                <p>Program: {draftData.formData.program}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Link to="/student/application-wizard">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full sm:w-auto text-yellow-700 border-yellow-300 hover:bg-yellow-100 font-semibold"
                              >
                                Continue Draft
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50 font-semibold"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
                                  try {
                                    // Use the centralized deletion method
                                    await applicationSessionManager.deleteDraft(profile?.user_id || user?.id)
                                    
                                    // Update local state
                                    setHasDraft(false)
                                    setDraftData(null)
                                    
                                    // Refresh the dashboard data
                                    loadDashboardData()
                                  } catch (error) {
                                    console.error('Error deleting draft:', error)
                                    alert('Failed to delete draft. Please try again.')
                                  }
                                }
                              }}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Show submitted applications */}
                    {applications.filter(app => app.status !== 'draft').map((application, index) => (
                      <motion.div 
                        key={application.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="px-6 py-4 hover:bg-blue-50 transition-all duration-300 border-l-4 border-transparent hover:border-primary"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStatusIcon(application.status)}
                              <h4 className="text-base font-semibold text-gray-900">
                                {getProgramName(application.program)}
                              </h4>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                getStatusColor(application.status)
                              }`}>
                                {application.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-700 space-y-1">
                              <p><strong>Application:</strong> #{application.application_number}</p>
                              <p><strong>Intake:</strong> {getIntakeName(application.intake)}</p>
                              <p><strong>Submitted:</strong> {formatDate(application.submitted_at)}</p>
                            </div>
                          </div>
                          
                          <Link to={`/application/${application.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full sm:w-auto text-primary border-primary hover:bg-primary hover:text-white font-semibold"
                            >
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Mobile First */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                👤 Profile Summary
              </h3>
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-xs uppercase tracking-wide">Full Name</span>
                  <p className="font-semibold text-gray-900">{profile?.full_name || 'Not provided'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-xs uppercase tracking-wide">Email</span>
                  <p className="font-semibold text-gray-900 truncate">{user?.email || 'Not provided'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-xs uppercase tracking-wide">Phone</span>
                  <p className="font-semibold text-gray-900">{profile?.phone || 'Not provided'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600 text-xs uppercase tracking-wide">City</span>
                  <p className="font-semibold text-gray-900">{profile?.city || 'Not provided'}</p>
                </div>
              </div>
              <Link to="/settings">
                <Button variant="outline" size="sm" className="w-full mt-4 border-2 hover:border-primary hover:bg-primary hover:text-white font-semibold">
                  <User className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
              </Link>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                ⏰ Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {intakes.slice(0, 3).map((intake, index) => (
                  <motion.div 
                    key={intake.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="border-l-4 border-red-400 pl-4 p-3 bg-red-50 rounded-r-xl"
                  >
                    <p className="text-sm font-semibold text-gray-900">{intake.name}</p>
                    <p className="text-xs text-red-600 font-medium">
                      Deadline: {formatDate(intake.application_deadline)}
                    </p>
                  </motion.div>
                ))}
                {intakes.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-3">
                {hasDraft ? (
                  <>
                    <Link to="/student/application-wizard" className="block">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 font-semibold"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Continue Draft
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50 font-semibold"
                      onClick={async () => {
                        if (confirm('Are you sure you want to clear all drafts? This action cannot be undone.')) {
                          try {
                            // Use the centralized deletion method
                            await applicationSessionManager.deleteDraft(profile?.user_id || user?.id)
                            
                            // Update local state
                            setHasDraft(false)
                            setDraftData(null)
                            
                            // Refresh the dashboard data
                            loadDashboardData()
                          } catch (error) {
                            console.error('Error clearing drafts:', error)
                            alert('Failed to clear drafts. Please try again.')
                          }
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Draft
                    </Button>
                  </>
                ) : (
                  <Link to="/student/application-wizard" className="block">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start bg-gradient-to-r from-primary to-secondary text-white border-primary hover:from-primary/90 hover:to-secondary/90 font-semibold shadow-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Application
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start border-gray-300 hover:bg-gray-50 font-semibold"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Document Templates
                </Button>
                <Link to="/settings" className="block">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}