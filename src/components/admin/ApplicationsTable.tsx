import React from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  MessageSquare, 
  Bell,
  FileImage,
  History,
  Trash2,
  Shield,
  Download,
  Edit3,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate, getStatusColor } from '@/lib/utils'
import { sanitizeText } from '@/lib/sanitize'

interface ApplicationsTableProps {
  applications: any[]
  updating: string | null
  selectedApplications: string[]
  onStatusUpdate: (id: string, status: string) => void
  onViewDetails: (app: any) => void
  onSendNotification: (app: any) => void
  onViewDocuments: (app: any) => void
  onViewHistory: (app: any) => void
  onDeleteApplication: (id: string) => void
  onToggleSelection: (id: string) => void
  onSelectAll: () => void
}

export function ApplicationsTable({ 
  applications, 
  updating,
  selectedApplications,
  onStatusUpdate, 
  onViewDetails, 
  onSendNotification,
  onViewDocuments,
  onViewHistory,
  onDeleteApplication,
  onToggleSelection,
  onSelectAll
}: ApplicationsTableProps) {
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
      case 'draft':
        return <Edit3 className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-secondary" />
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
          <tr>
            <th className="px-6 py-4 text-left">
              <input
                type="checkbox"
                checked={selectedApplications.length === applications.length && applications.length > 0}
                onChange={onSelectAll}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
              👤 Applicant
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
              🎓 Program
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
              📊 Status
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
              📅 Dates
            </th>
            <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
              📎 Documents
            </th>
            <th className="px-6 py-4 text-right text-sm font-bold text-secondary uppercase tracking-wider">
              ⚡ Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((application) => (
            <tr 
              key={application.id} 
              className={`hover:bg-blue-50 transition-colors ${
                selectedApplications.includes(application.id) ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedApplications.includes(application.id)}
                  onChange={() => onToggleSelection(application.id)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="font-bold text-secondary">{sanitizeText(application.full_name)}</div>
                  <div className="text-sm text-secondary/70">{sanitizeText(application.email)}</div>
                  <div className="text-xs text-secondary/60 font-mono">#{sanitizeText(application.application_number)}</div>
                  {application.phone && (
                    <div className="text-xs text-secondary/60">{sanitizeText(application.phone)}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="font-medium text-secondary">{sanitizeText(application.program)}</div>
                  <div className="text-sm text-secondary/70">{sanitizeText(application.intake)}</div>
                  <div className="text-xs text-secondary/60">{sanitizeText(application.institution)}</div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(application.status)}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      getStatusColor(application.status)
                    }`}>
                      {sanitizeText(application.status.replace('_', ' ').toUpperCase())}
                    </span>
                  </div>
                  {application.payment_status && (
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      application.payment_status === 'verified' ? 'bg-green-100 text-green-800' :
                      application.payment_status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      Payment: {sanitizeText(application.payment_status)}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1 text-sm text-secondary">
                  <div>
                    <span className="text-xs text-secondary/60">Created:</span><br/>
                    {formatDate(application.created_at)}
                  </div>
                  {application.submitted_at && (
                    <div>
                      <span className="text-xs text-secondary/60">Submitted:</span><br/>
                      {formatDate(application.submitted_at)}
                    </div>
                  )}
                  {application.decision_date && (
                    <div>
                      <span className="text-xs text-secondary/60">Decision:</span><br/>
                      {formatDate(application.decision_date)}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-secondary">
                    {[
                      application.result_slip_url ? 1 : 0,
                      application.extra_kyc_url ? 1 : 0,
                      application.pop_url ? 1 : 0
                    ].reduce((a, b) => a + b, 0)} files
                  </div>
                  {application.result_slip_url && <div className="w-2 h-2 bg-green-500 rounded-full" title="Result slip uploaded" />}
                  {application.extra_kyc_url && <div className="w-2 h-2 bg-blue-500 rounded-full" title="KYC document uploaded" />}
                  {application.pop_url && <div className="w-2 h-2 bg-purple-500 rounded-full" title="Proof of payment uploaded" />}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(application)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSendNotification(application)}
                    title="Send Notification"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDocuments(application)}
                    title="View Documents"
                  >
                    <FileImage className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewHistory(application)}
                    title="Status History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  
                  {application.status === 'submitted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={updating === application.id}
                      onClick={() => onStatusUpdate(application.id, 'under_review')}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      title="Start Review"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {application.status === 'under_review' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={updating === application.id}
                        onClick={() => onStatusUpdate(application.id, 'approved')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={updating === application.id}
                        onClick={() => onStatusUpdate(application.id, 'rejected')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteApplication(application.id)}
                    className="text-red-600 hover:bg-red-50"
                    title="Delete Application"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}