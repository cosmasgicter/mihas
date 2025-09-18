import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { XCircle } from 'lucide-react'
import { applicationService } from '@/services/applications'

interface ApplicationWithDetails {
  id: string
  application_number: string
  full_name: string
  email: string
  phone?: string
  date_of_birth?: string
  sex?: string
  nrc_number?: string
  passport_number?: string
  residence_town?: string
  next_of_kin_name?: string
  program: string
  intake: string
  institution?: string
  payment_method?: string
  amount?: number
  application_fee?: number
  payer_name?: string
  payment_status?: string
  payment_verified_at?: string | null
  payment_verified_by_name?: string | null
  payment_verified_by_email?: string | null
  last_payment_audit_at?: string | null
  last_payment_audit_by_name?: string | null
  last_payment_audit_by_email?: string | null
  last_payment_audit_notes?: string | null
  last_payment_reference?: string | null
  status: string
  submitted_at?: string
  result_slip_url?: string
  extra_kyc_url?: string
  pop_url?: string
}

interface Grade {
  subject_id: string
  grade: number
  subject_name?: string
}

interface ApplicationDetailModalProps {
  application: ApplicationWithDetails | null
  show: boolean
  updating: string | null
  onClose: () => void
  onSendNotification: () => void
  onViewDocuments: () => void
  onViewHistory: () => void
  onUpdateStatus: (id: string, status: string) => void
}

function GradesDisplay({ applicationId }: { applicationId: string }) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await applicationService.getById(applicationId, { include: ['grades'] })
        const formattedGrades = response.grades?.map((g: any) => ({
          subject_id: g.subject_id,
          grade: g.grade,
          subject_name: g.subject_name || 'Unknown Subject'
        })) || []
        setGrades(formattedGrades)
      } catch (error) {
        console.error('Error fetching grades:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchGrades()
  }, [applicationId])
  
  if (loading) {
    return <div className="text-xs text-gray-500">Loading grades...</div>
  }
  
  if (grades.length === 0) {
    return <div className="text-xs text-gray-500">No grades recorded</div>
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {grades.map((grade, index) => (
        <div key={index} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
          <span className="font-medium">{grade.subject_name}</span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            grade.grade <= 3 ? 'bg-green-100 text-green-800' :
            grade.grade <= 6 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            Grade {grade.grade}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ApplicationDetailModal({
  application,
  show,
  updating,
  onClose,
  onSendNotification,
  onViewDocuments,
  onViewHistory,
  onUpdateStatus
}: ApplicationDetailModalProps) {
  if (!show || !application) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-secondary">
              Application #{application.application_number}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
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
                <span className="ml-2 font-medium">{application.full_name}</span>
              </div>
              <div>
                <span className="text-secondary">Email:</span>
                <span className="ml-2 font-medium">{application.email}</span>
              </div>
              <div>
                <span className="text-secondary">Phone:</span>
                <span className="ml-2 font-medium">{application.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-secondary">Application Date:</span>
                <span className="ml-2 font-medium">{formatDate(application.submitted_at)}</span>
              </div>
            </div>
          </div>

          {/* Program Info */}
          <div>
            <h3 className="text-lg font-medium text-secondary mb-3">Program Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-secondary">Program:</span>
                <span className="ml-2 font-medium">{application.program}</span>
              </div>
              <div>
                <span className="text-secondary">Intake:</span>
                <span className="ml-2 font-medium">{application.intake}</span>
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
                    <p><strong>Date of Birth:</strong> {application.date_of_birth || 'Not provided'}</p>
                    <p><strong>Sex:</strong> {application.sex || 'Not provided'}</p>
                    <p><strong>NRC:</strong> {application.nrc_number || 'Not provided'}</p>
                    <p><strong>Passport:</strong> {application.passport_number || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-secondary">Contact Information</h4>
                  <div className="text-xs text-secondary mt-1 space-y-1">
                    <p><strong>Phone:</strong> {application.phone || 'Not provided'}</p>
                    <p><strong>Email:</strong> {application.email || 'Not provided'}</p>
                    <p><strong>Residence:</strong> {application.residence_town || 'Not provided'}</p>
                    <p><strong>Next of Kin:</strong> {application.next_of_kin_name || 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              {/* Grades Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-secondary mb-3">Grade 12 Subjects & Grades</h4>
                <GradesDisplay applicationId={application.id} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div>
                  <h4 className="text-sm font-medium text-secondary">Payment Information</h4>
                  <div className="text-xs text-secondary mt-1 space-y-1">
                    <p><strong>Method:</strong> {application.payment_method || 'Not provided'}</p>
                    <p><strong>Amount:</strong> K{application.amount || application.application_fee || 'Not provided'}</p>
                    <p><strong>Payer:</strong> {application.payer_name || 'Not provided'}</p>
                    <p><strong>Status:</strong> {application.payment_status || 'Not provided'}</p>
                    {application.payment_verified_at && (
                      <p>
                        <strong>Verified:</strong>{' '}
                        {new Date(application.payment_verified_at).toLocaleString()}
                        {(application.payment_verified_by_name || application.payment_verified_by_email) && (
                          <>
                            {' '}by{' '}
                            {application.payment_verified_by_name || application.payment_verified_by_email}
                          </>
                        )}
                      </p>
                    )}
                    {application.last_payment_audit_at && (
                      <p>
                        <strong>Ledger Entry:</strong>{' '}
                        {new Date(application.last_payment_audit_at).toLocaleString()}
                        {application.last_payment_reference && ` • Ref: ${application.last_payment_reference}`}
                      </p>
                    )}
                    {application.last_payment_audit_notes && (
                      <p>
                        <strong>Ledger Notes:</strong> {application.last_payment_audit_notes}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-secondary">Documents</h4>
                  <div className="text-xs text-secondary mt-1 space-y-1">
                    <p><strong>Result Slip:</strong> {application.result_slip_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                    <p><strong>Extra KYC:</strong> {application.extra_kyc_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                    <p><strong>Proof of Payment:</strong> {application.pop_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={onSendNotification}
          >
            Send Notification
          </Button>
          <Button
            variant="outline"
            onClick={onViewDocuments}
          >
            View Documents
          </Button>
          <Button
            variant="outline"
            onClick={onViewHistory}
          >
            Status History
          </Button>
          {application.status === 'submitted' && (
            <Button
              loading={updating === application.id}
              onClick={() => onUpdateStatus(application.id, 'under_review')}
            >
              Start Review
            </Button>
          )}
          {application.status === 'under_review' && (
            <>
              <Button
                variant="outline"
                loading={updating === application.id}
                onClick={() => onUpdateStatus(application.id, 'approved')}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                loading={updating === application.id}
                onClick={() => onUpdateStatus(application.id, 'rejected')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}