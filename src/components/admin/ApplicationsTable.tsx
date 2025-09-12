import React from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, Eye, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ApplicationsTableProps {
  applications: any[]
  updating: string | null
  onStatusUpdate: (id: string, status: string) => void
  onViewDetails: (app: any) => void
  onAddFeedback: (app: any) => void
}

export function ApplicationsTable({ 
  applications, 
  updating, 
  onStatusUpdate, 
  onViewDetails, 
  onAddFeedback 
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
      default:
        return <Clock className="h-4 w-4 text-secondary" />
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              Application
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              Program
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((application) => (
            <tr key={application.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-secondary">
                  {application.application_number}
                </div>
                <div className="text-sm text-secondary">
                  {new Date(application.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-secondary">
                  {application.user_profiles?.full_name}
                </div>
                <div className="text-sm text-secondary">
                  {application.user_profiles?.email}
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
                <div className="flex items-center">
                  {getStatusIcon(application.status)}
                  <span className="ml-2 text-sm capitalize">
                    {application.status.replace('_', ' ')}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(application)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddFeedback(application)}
                  >
                    <MessageSquare className="h-4 w-4" />
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