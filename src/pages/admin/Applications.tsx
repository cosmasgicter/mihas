import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
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
  Download
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
}

export default function AdminApplications() {
  const { user, profile } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          user_profiles!inner(full_name, email, phone),
          programs(name, duration_years),
          intakes(name, year),
          documents(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Count documents for each application
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

      setApplications(applicationsWithCounts)
    } catch (error: any) {
      console.error('Error loading applications:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      setUpdating(applicationId)
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'under_review' && { review_started_at: new Date().toISOString() }),
          ...((['approved', 'rejected'].includes(newStatus)) && { decision_date: new Date().toISOString() })
        })
        .eq('id', applicationId)

      if (error) throw error

      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus as Application['status'], updated_at: new Date().toISOString() }
            : app
        )
      )

      // TODO: Send notification to applicant
      
    } catch (error: any) {
      console.error('Error updating application status:', error)
      setError(error.message)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'under_review':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'submitted':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.programs?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusCounts = () => {
    return {
      all: applications.length,
      submitted: applications.filter(app => app.status === 'submitted').length,
      under_review: applications.filter(app => app.status === 'under_review').length,
      approved: applications.filter(app => app.status === 'approved').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    }
  }

  const statusCounts = getStatusCounts()

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
              <Link to="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Application Management
                </h1>
                <p className="text-sm text-gray-500">
                  Review and manage student applications
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {filteredApplications.length} of {applications.length} applications
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

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status ({statusCounts.all})</option>
                <option value="submitted">Submitted ({statusCounts.submitted})</option>
                <option value="under_review">Under Review ({statusCounts.under_review})</option>
                <option value="approved">Approved ({statusCounts.approved})</option>
                <option value="rejected">Rejected ({statusCounts.rejected})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Applications Found
              </h3>
              <p className="text-gray-500">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.user_profiles?.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.user_profiles?.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            #{application.application_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {application.programs?.name}
                        </div>
                        <div className="text-sm text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(application.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
        </div>
      </main>

      {/* Application Details Modal */}
      {showDetails && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
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
                <h3 className="text-lg font-medium text-gray-900 mb-3">Applicant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.full_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{selectedApplication.user_profiles?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Application Date:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedApplication.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {/* Program Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Program Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Program:</span>
                    <span className="ml-2 font-medium">{selectedApplication.programs?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Intake:</span>
                    <span className="ml-2 font-medium">{selectedApplication.intakes?.name}</span>
                  </div>
                </div>
              </div>

              {/* Application Content */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Application Content</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Personal Statement</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedApplication.personal_statement}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Educational Background</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedApplication.previous_education}</p>
                  </div>
                  {selectedApplication.work_experience && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Work Experience</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedApplication.work_experience}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">English Proficiency</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedApplication.english_proficiency}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Computer Skills</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedApplication.computer_skills}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">References</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedApplication.references}</p>
                  </div>
                  {selectedApplication.additional_info && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
                      <p className="text-sm text-gray-600 mt-1">{selectedApplication.additional_info}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
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
    </div>
  )
}