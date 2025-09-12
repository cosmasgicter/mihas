import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

export default function AdminUsers() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-secondary">Admin Users</h1>
        </div>
        <p className="text-secondary">Admin users management will be implemented here.</p>
      </div>
    </div>
  )
}