import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TestWizard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/student/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Test Application Wizard
          </h1>
          <p className="text-gray-600 mb-6">
            This is a test page to verify routing is working correctly.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">✓ Routing Working</h3>
              <p className="text-sm text-green-700">
                If you can see this page, the routing to /student/application-wizard is working correctly.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800">Next Steps</h3>
              <p className="text-sm text-blue-700">
                The issue might be with the ApplicationWizard component itself, not the routing.
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <Link 
              to="/student/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}