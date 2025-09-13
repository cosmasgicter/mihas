import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
import { sanitizeForLog } from '@/lib/sanitize'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface ApplicationWithDetails {
  id: string
  application_number: string
  user_id: string
  full_name: string
  nrc_number?: string
  passport_number?: string
  date_of_birth: string
  sex: string
  phone: string
  email: string
  residence_town: string
  guardian_name?: string
  guardian_phone?: string
  program: string
  intake: string
  institution: string
  result_slip_url?: string
  extra_kyc_url?: string
  application_fee?: number
  payment_method?: string
  payer_name?: string
  payer_phone?: string
  amount?: number
  paid_at?: string
  momo_ref?: string
  pop_url?: string
  payment_status: string
  status: string
  submitted_at?: string
  public_tracking_code?: string
  created_at: string
  updated_at: string
  document_count?: number
}

const PAGE_SIZE = 20

export default function AdminApplications() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const fetchApplications = async (page: number, status: string, search: string) => {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    
    let query = supabase
      .from('applications_new')
      .select(`
        *
      `, { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
      query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,application_number.ilike.%${sanitizedSearch}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { applications: data || [], totalCount: count || 0 }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', currentPage, statusFilter, searchTerm],
    queryFn: () => fetchApplications(currentPage, statusFilter, searchTerm),
    staleTime: 30000, // 30 seconds
  })

  const applications = data?.applications || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const updateApplicationStatus = async (applicationId: string, newStatus: string, feedback?: string) => {
    try {
      setUpdating(applicationId)
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'under_review' && { review_started_at: new Date().toISOString() }),
        ...((['approved', 'rejected'].includes(newStatus)) && { decision_date: new Date().toISOString() })
      }
      
      if (feedback) {
        updateData.admin_feedback = feedback
        updateData.admin_feedback_date = new Date().toISOString()
        updateData.admin_feedback_by = user?.id
      }

      const { error } = await supabase
        .from('applications_new')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] })

      // Create status history record
      const { error: historyError } = await supabase
        .from('application_status_history')
        .insert({
          application_id: applicationId,
          status: newStatus,
          changed_by: user?.id,
          notes: feedback || null
        })
      
      if (historyError) {
        console.error('Error creating status history:', sanitizeForLog(historyError.message || 'unknown error'))
        // Continue execution as this is not critical for the main operation
      }
      
    } catch (error: any) {
      console.error('Error updating application status:', error)
    } finally {
      setUpdating(null)
    }
  }

  const submitFeedback = async () => {
    if (!selectedApplication || !feedbackText.trim()) return
    
    try {
      setFeedbackLoading(true)
      
      const { error } = await supabase
        .from('applications_new')
        .update({
          admin_feedback: feedbackText,
          admin_feedback_date: new Date().toISOString(),
          admin_feedback_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication.id)

      if (error) throw error

      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] })

      setShowFeedbackModal(false)
      setFeedbackText('')
      
    } catch (error: any) {
      console.error('Error submitting feedback:', error)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'under_review':
        return <Clock className="h-4 w-4 text-primary" />
      case 'submitted':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-secondary" />
    }
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
  }

  if (isLoading) {
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
              <Link to="/admin" className="inline-flex items-center text-primary hover:text-primary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-secondary">
                  Application Management
                </h1>
                <p className="text-sm text-secondary">
                  Review and manage student applications
                </p>
              </div>
            </div>
            <div className="text-sm text-secondary">
              {totalCount} total applications
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error.message}</div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary mb-2">
                No Applications Found
              </h3>
              <p className="text-secondary">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'No applications have been submitted yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-secondary">
                            {application.full_name}
                          </div>
                          <div className="text-sm text-secondary">
                            {application.email}
                          </div>
                          <div className="text-xs text-secondary">
                            #{application.application_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary">
                          {application.program}
                        </div>
                        <div className="text-sm text-secondary">
                          {application.intake}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(application.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusColor(application.status)
                          }`}>
                            {application.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {formatDate(application.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {(application.result_slip_url ? 1 : 0) + (application.extra_kyc_url ? 1 : 0) + (application.pop_url ? 1 : 0)} files
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application)
                              setShowFeedbackModal(true)
                            }}
                            title="Add Feedback"
                          >
                            💬
                          </Button>
                          
                          {application.status === 'submitted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={updating === application.id}
                              onClick={() => updateApplicationStatus(application.id, 'under_review')}
                            >
                              Start Review
                            </Button>
                          )}
                          
                          {application.status === 'under_review' && (
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                loading={updating === application.id}
                                onClick={() => updateApplicationStatus(application.id, 'approved')}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                loading={updating === application.id}
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-secondary">
                Showing {currentPage * PAGE_SIZE + 1} to {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of {totalCount} applications
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-secondary">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Application Details Modal */}
      {showDetails && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary">
                  Application #{selectedApplication.application_number}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Applicant Info */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Applicant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Name:</span>
                    <span className="ml-2 font-medium">{selectedApplication.full_name}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Email:</span>
                    <span className="ml-2 font-medium">{selectedApplication.email}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Phone:</span>
                    <span className="ml-2 font-medium">{selectedApplication.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Application Date:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedApplication.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {/* Program Info */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Program Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Program:</span>
                    <span className="ml-2 font-medium">{selectedApplication.program}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Intake:</span>
                    <span className="ml-2 font-medium">{selectedApplication.intake}</span>
                  </div>
                </div>
              </div>

              {/* Application Content */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Application Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Personal Details</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Date of Birth:</strong> {selectedApplication.date_of_birth || 'Not provided'}</p>
                        <p><strong>Sex:</strong> {selectedApplication.sex || 'Not provided'}</p>
                        <p><strong>NRC:</strong> {selectedApplication.nrc_number || 'Not provided'}</p>
                        <p><strong>Passport:</strong> {selectedApplication.passport_number || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Contact Information</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Phone:</strong> {selectedApplication.phone || 'Not provided'}</p>
                        <p><strong>Email:</strong> {selectedApplication.email || 'Not provided'}</p>
                        <p><strong>Residence:</strong> {selectedApplication.residence_town || 'Not provided'}</p>
                        <p><strong>Guardian:</strong> {selectedApplication.guardian_name || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Payment Information</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Method:</strong> {selectedApplication.payment_method || 'Not provided'}</p>
                        <p><strong>Amount:</strong> K{selectedApplication.amount || selectedApplication.application_fee || 'Not provided'}</p>
                        <p><strong>Payer:</strong> {selectedApplication.payer_name || 'Not provided'}</p>
                        <p><strong>Status:</strong> {selectedApplication.payment_status || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Documents</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Result Slip:</strong> {selectedApplication.result_slip_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                        <p><strong>Extra KYC:</strong> {selectedApplication.extra_kyc_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                        <p><strong>Proof of Payment:</strong> {selectedApplication.pop_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetails(false)
                  setShowFeedbackModal(true)
                }}
              >
                Add Feedback
              </Button>
              {selectedApplication.status === 'submitted' && (
                <Button
                  loading={updating === selectedApplication.id}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication.id, 'under_review')
                    setShowDetails(false)
                  }}
                >
                  Start Review
                </Button>
              )}
              {selectedApplication.status === 'under_review' && (
                <>
                  <Button
                    variant="outline"
                    loading={updating === selectedApplication.id}
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'approved')
                      setShowDetails(false)
                    }}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    loading={updating === selectedApplication.id}
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'rejected')
                      setShowDetails(false)
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary">
                  Add Feedback - {selectedApplication.application_number}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setFeedbackText('')
                  }}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-secondary mb-2">
                  <strong>Applicant:</strong> {selectedApplication.full_name}
                </p>
                <p className="text-sm text-secondary mb-4">
                  <strong>Program:</strong> {selectedApplication.program}
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Feedback Message
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide feedback to the applicant about their application status, required documents, or next steps..."
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-secondary mt-1">
                  This feedback will be visible to the applicant when they check their application status.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFeedbackModal(false)
                  setFeedbackText('')
                }}
              >
                Cancel
              </Button>
              <Button
                loading={feedbackLoading}
                onClick={submitFeedback}
                disabled={!feedbackText.trim()}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}