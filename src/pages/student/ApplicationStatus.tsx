import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react'

interface ApplicationWithDetails extends Application {
  programs?: Program
  intakes?: Intake
  documents?: any[]
}

interface ApplicationTimeline {
  status: string
  date: string
  description: string
  completed: boolean
}

export default function ApplicationStatus() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [application, setApplication] = useState<ApplicationWithDetails | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadApplicationDetails = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load application with program and intake details
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications_new')
        .select(`
          *
        `)
        .eq('id', id)
        .eq('user_id', user?.id) // Ensure user can only see their own applications
        .single()

      if (applicationError) {
        throw new Error('Application not found or access denied')
      }

      setApplication(applicationData)


    } catch (error: any) {
      console.error('Error loading application details:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    if (id && user) {
      loadApplicationDetails()
    }
  }, [id, user, loadApplicationDetails])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-primary" />
      case 'submitted':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-secondary" />
    }
  }

  const getTimeline = (): ApplicationTimeline[] => {
    if (!application) return []

    const timeline: ApplicationTimeline[] = [
      {
        status: 'submitted',
        date: application.submitted_at || application.created_at,
        description: 'Application submitted successfully',
        completed: true
      }
    ]

    if (application.status === 'under_review' || application.status === 'approved' || application.status === 'rejected') {
      timeline.push({
        status: 'under_review',
        date: application.review_started_at || application.updated_at,
        description: 'Application under review by admissions team',
        completed: true
      })
    }

    if (application.status === 'approved') {
      timeline.push({
        status: 'approved',
        date: application.decision_date || application.updated_at,
        description: 'Application approved - Congratulations!',
        completed: true
      })
    } else if (application.status === 'rejected') {
      timeline.push({
        status: 'rejected',
        date: application.decision_date || application.updated_at,
        description: 'Application not successful this time',
        completed: true
      })
    } else {
      // Add pending steps
      timeline.push({
        status: 'decision',
        date: '',
        description: 'Final decision pending',
        completed: false
      })
    }

    return timeline
  }



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-secondary mb-2">
              Application Not Found
            </h2>
            <p className="text-secondary mb-6">
              {error || 'The application you are looking for does not exist or you do not have permission to view it.'}
            </p>
            <Link to="/student/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const timeline = getTimeline()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-primary hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-secondary mb-2">
                  Application #{application.application_number}
                </h1>
                <p className="text-lg text-secondary mb-1">
                  {application.program}
                </p>
                <p className="text-sm text-secondary">
                  {application.intake} • Submitted on {formatDate(application.submitted_at)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(application.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  getStatusColor(application.status)
                }`}>
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">
                Application Progress
              </h2>
              <div className="space-y-6">
                {timeline.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-secondary'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-secondary">
                        {step.description}
                      </div>
                      {step.date && (
                        <div className="text-sm text-secondary mt-1">
                          {formatDate(step.date)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">
                Application Details
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Personal Information</h3>
                    <div className="text-secondary text-sm space-y-1">
                      <p><strong>Full Name:</strong> {application.full_name}</p>
                      <p><strong>Date of Birth:</strong> {application.date_of_birth}</p>
                      <p><strong>Sex:</strong> {application.sex}</p>
                      <p><strong>Phone:</strong> {application.phone}</p>
                      <p><strong>Email:</strong> {application.email}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Contact Information</h3>
                    <div className="text-secondary text-sm space-y-1">
                      <p><strong>Residence:</strong> {application.residence_town}</p>
                      <p><strong>NRC:</strong> {application.nrc_number || 'Not provided'}</p>
                      <p><strong>Passport:</strong> {application.passport_number || 'Not provided'}</p>
                      <p><strong>Guardian:</strong> {application.guardian_name || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-secondary mb-2">Payment Information</h3>
                  <div className="text-secondary text-sm space-y-1">
                    <p><strong>Payment Method:</strong> {application.payment_method || 'Not provided'}</p>
                    <p><strong>Amount Paid:</strong> K{application.amount || application.application_fee || 'Not provided'}</p>
                    <p><strong>Payment Status:</strong> {application.payment_status}</p>
                    <p><strong>Payer:</strong> {application.payer_name || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">
                Supporting Documents
              </h2>
              <div className="space-y-3">
                {application.result_slip_url && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-secondary">Result Slip</p>
                        <p className="text-xs text-secondary">Uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(application.result_slip_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {application.extra_kyc_url && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-secondary">Extra KYC Documents</p>
                        <p className="text-xs text-secondary">Uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(application.extra_kyc_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {application.pop_url && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-secondary">Proof of Payment</p>
                        <p className="text-xs text-secondary">Uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(application.pop_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {!application.result_slip_url && !application.extra_kyc_url && !application.pop_url && (
                  <p className="text-secondary text-center py-6">
                    No documents uploaded
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Application ID:</span>
                  <span className="font-medium">#{application.application_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Program:</span>
                  <span className="font-medium text-right">{application.program}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Intake:</span>
                  <span className="font-medium">{application.intake}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Submitted:</span>
                  <span className="font-medium">{formatDate(application.submitted_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Last Updated:</span>
                  <span className="font-medium">{formatDate(application.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Actions</h3>
              <div className="space-y-3">
                <Link to="/apply">
                  <Button variant="outline" className="w-full">
                    Submit New Application
                  </Button>
                </Link>
                <Link to="/student/dashboard">
                  <Button variant="ghost" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Contact Info */}
            {application.status === 'under_review' && (
              <div className="bg-primary border border-primary/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-primary mb-2">
                  Application Under Review
                </h4>
                <p className="text-xs text-primary">
                  Your application is being reviewed by our admissions team. 
                  You will be notified via email once a decision is made.
                </p>
              </div>
            )}

            {application.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">
                  Congratulations!
                </h4>
                <p className="text-xs text-green-700">
                  Your application has been approved. You will receive further 
                  instructions via email regarding enrollment and next steps.
                </p>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-900 mb-2">
                  Application Update
                </h4>
                <p className="text-xs text-red-700">
                  Unfortunately, your application was not successful this time. 
                  You may submit a new application for future intakes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}