import React from 'react'
import { sanitizeHtml } from '@/lib/sanitizer'

interface ApplicationSummary {
  id: string
  application_number: string
  full_name: string
  email: string
  phone: string
  program: string
  intake: string
  institution: string
  status: string
  payment_status: string
  payment_verified_at: string | null
  payment_verified_by: string | null
  payment_verified_by_name: string | null
  payment_verified_by_email: string | null
  last_payment_audit_id: number | null
  last_payment_audit_at: string | null
  last_payment_audit_by_name: string | null
  last_payment_audit_by_email: string | null
  last_payment_audit_notes: string | null
  last_payment_reference: string | null
  application_fee: number
  paid_amount: number
  submitted_at: string
  created_at: string
  result_slip_url: string
  extra_kyc_url: string
  pop_url: string
  grades_summary: string
  total_subjects: number
}

interface ApplicationsTableProps {
  applications: ApplicationSummary[]
  onStatusUpdate: (id: string, status: string) => void
  onPaymentStatusUpdate: (id: string, status: string) => void
}

export function ApplicationsTable({
  applications,
  onStatusUpdate,
  onPaymentStatusUpdate
}: ApplicationsTableProps) {
  const formatDateTime = (value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getPaymentBadge = (paymentStatus: string) => {
    const colors = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[paymentStatus as keyof typeof colors] || colors.pending_review}`}>
        {paymentStatus.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Application
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subjects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {app.application_number}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {app.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {app.email}
                  </div>
                  <div className="text-sm text-gray-500">
                    {app.phone}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {app.program}
                  </div>
                  <div className="text-sm text-gray-500">
                    {app.institution} • {app.intake}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-2">
                    {getStatusBadge(app.status)}
                    <select
                      value={app.status}
                      onChange={(e) => onStatusUpdate(app.id, e.target.value)}
                      className="block w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-2">
                    {getPaymentBadge(app.payment_status)}
                    <div className="text-xs text-gray-500">
                      K{app.paid_amount || 0} / K{app.application_fee}
                    </div>
                    {app.payment_status === 'verified' && (() => {
                      const verifiedAt = formatDateTime(app.payment_verified_at)
                      const ledgerAt = formatDateTime(app.last_payment_audit_at)
                      if (!verifiedAt && !ledgerAt) return null

                      return (
                        <div className="text-xs text-green-700 space-y-1">
                          {verifiedAt && (
                            <div>
                              Verified {verifiedAt}
                              {(app.payment_verified_by_name || app.payment_verified_by_email) && (
                                <>
                                  {' '}by{' '}
                                  {app.payment_verified_by_name || app.payment_verified_by_email}
                                </>
                              )}
                            </div>
                          )}
                          {ledgerAt && (
                            <div className="text-xs text-gray-500">
                              Ledger entry: {ledgerAt}
                              {app.last_payment_reference && (
                                <>
                                  {' '}
                                  <span className="text-gray-400">(Ref: {app.last_payment_reference})</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    <select
                      value={app.payment_status}
                      onChange={(e) => onPaymentStatusUpdate(app.id, e.target.value)}
                      className="block w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pending_review">Pending Review</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {app.total_subjects} subjects
                  </div>
                  {app.grades_summary && (
                    <div className="text-xs text-gray-500 max-w-xs truncate" title={sanitizeHtml(app.grades_summary)}>
                      {sanitizeHtml(app.grades_summary)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                  <div className="flex flex-col space-y-1">
                    {app.result_slip_url && (
                      <a
                        href={app.result_slip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-xs"
                      >
                        Result Slip
                      </a>
                    )}
                    {app.extra_kyc_url && (
                      <a
                        href={app.extra_kyc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-xs"
                      >
                        Extra KYC
                      </a>
                    )}
                    {app.pop_url && (
                      <a
                        href={app.pop_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-xs"
                      >
                        Proof of Payment
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {applications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No applications found matching your criteria.</div>
        </div>
      )}
    </div>
  )
}