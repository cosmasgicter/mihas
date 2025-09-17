import React from 'react'

interface ApplicationSummary {
  status: string
  payment_status: string
}

interface MetricsHeaderProps {
  applications: ApplicationSummary[]
}

export function MetricsHeader({ applications }: MetricsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-2xl font-bold text-gray-900">
          {applications.length}
        </div>
        <div className="text-sm text-gray-500">Total Applications</div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-2xl font-bold text-blue-600">
          {applications.filter(app => app.status === 'submitted').length}
        </div>
        <div className="text-sm text-gray-500">Submitted</div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-2xl font-bold text-yellow-600">
          {applications.filter(app => app.payment_status === 'pending_review').length}
        </div>
        <div className="text-sm text-gray-500">Pending Payment Review</div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-2xl font-bold text-green-600">
          {applications.filter(app => app.status === 'approved').length}
        </div>
        <div className="text-sm text-gray-500">Approved</div>
      </div>
    </div>
  )
}