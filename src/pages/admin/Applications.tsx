import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
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

interface ApplicationWithDetails extends Application {
  user_profiles?: {
    full_name: string
    email: string
    phone?: string
  }
  programs?: Program
  intakes?: Intake
  document_count?: number
  date_of_birth?: string
  gender?: string
  nationality?: string
  province?: string
  physical_address?: string
  postal_address?: string
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
      .from('applications')
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        programs(name, duration_years),
        intakes(name, year)
      `, { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`user_profiles.full_name.ilike.%${search}%,user_profiles.email.ilike.%${search}%,application_number.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    // Get document counts for this page
    const applicationsWithCounts = await Promise.all(
      (data || []).map(async (app) => {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('application_id', app.id)
        
        return {
          ...app,
          document_count: count || 0
        }
      })
    )

    return { applications: applicationsWithCounts, totalCount: count || 0 }
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
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] })

      // Create status history record
      await supabase
        .from('application_status_history')
        .insert({
          application_id: applicationId,
          status: newStatus,
          changed_by: user?.id,
          notes: feedback || null
        })
      
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
        .from('applications')
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
                            {application.user_profiles?.full_name}
                          </div>
                          <div className="text-sm text-secondary">
                            {application.user_profiles?.email}
                          </div>
                          <div className="text-xs text-secondary">
                            #{application.application_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary">
                          {application.programs?.name}
                        </div>
                        <div className="text-sm text-secondary">
                          {application.intakes?.name}
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
                        {application.document_count || 0} files
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
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.full_name}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Email:</span>
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.email}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Phone:</span>
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.phone || 'Not provided'}</span>
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
                    <span className="ml-2 font-medium">{selectedApplication.programs?.name}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Intake:</span>
                    <span className="ml-2 font-medium">{selectedApplication.intakes?.name}</span>
                  </div>
                </div>
              </div>

              {/* Application Content */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Application Content</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-secondary">Personal Statement</h4>
                    <p className="text-sm text-secondary mt-1">{selectedApplication.personal_statement}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-secondary">Educational Background</h4>
                    <p className="text-sm text-secondary mt-1">{selectedApplication.previous_education}</p>
                  </div>
                  {selectedApplication.work_experience && (
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Work Experience</h4>
                      <p className="text-sm text-secondary mt-1">{selectedApplication.work_experience}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">English Proficiency</h4>
                      <p className="text-sm text-secondary mt-1">{selectedApplication.english_proficiency}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Computer Skills</h4>
                      <p className="text-sm text-secondary mt-1">{selectedApplication.computer_skills}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-secondary">References</h4>
                    <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{selectedApplication.references}</p>
                  </div>
                  {selectedApplication.additional_info && (
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Additional Information</h4>
                      <p className="text-sm text-secondary mt-1 whitespace-pre-wrap">{selectedApplication.additional_info}</p>
                    </div>
                  )}
                  
                  {/* Enhanced Application Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Personal Details</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Date of Birth:</strong> {selectedApplication.date_of_birth || 'Not provided'}</p>
                        <p><strong>Gender:</strong> {selectedApplication.gender || 'Not provided'}</p>
                        <p><strong>Nationality:</strong> {selectedApplication.nationality || 'Not provided'}</p>
                        <p><strong>Province:</strong> {selectedApplication.province || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Contact Information</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Phone:</strong> {selectedApplication.user_profiles?.phone || 'Not provided'}</p>
                        <p><strong>Physical Address:</strong> {selectedApplication.physical_address || 'Not provided'}</p>
                        <p><strong>Postal Address:</strong> {selectedApplication.postal_address || 'Not provided'}</p>
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
                  <strong>Applicant:</strong> {selectedApplication.user_profiles?.full_name}
                </p>
                <p className="text-sm text-secondary mb-4">
                  <strong>Program:</strong> {selectedApplication.programs?.name}
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