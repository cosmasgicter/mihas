import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate, getStatusColor } from '@/lib/utils'
import { 
  Search, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  FileText,
  Calendar,
  User,
  ArrowLeft,
  Eye
} from 'lucide-react'

interface PublicApplicationStatus {
  public_tracking_code: string
  application_number: string
  status: string
  submitted_at: string
  updated_at: string
  program_name: string
  intake_name: string
  admin_feedback?: string
  admin_feedback_date?: string
}

export default function PublicApplicationTracker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [application, setApplication] = useState<PublicApplicationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const searchApplication = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an application number or tracking code')
      return
    }

    try {
      setLoading(true)
      setError('')
      setApplication(null)

      // Search by application number or tracking code
      const { data, error: searchError } = await supabase
        .from('public_application_status')
        .select('*')
        .or(`application_number.ilike.%${searchTerm}%,public_tracking_code.ilike.%${searchTerm}%`)
        .single()

      if (searchError) {
        if (searchError.code === 'PGRST116') {
          setError('Application not found. Please check your application number or tracking code.')
        } else {
          throw searchError
        }
        return
      }

      setApplication(data)
      setSearched(true)
    } catch (error: any) {
      console.error('Error searching application:', error)
      setError('An error occurred while searching. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'under_review':
        return <Clock className="h-6 w-6 text-primary" />
      case 'submitted':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />
      default:
        return <Clock className="h-6 w-6 text-secondary" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Your application has been received and is awaiting initial review.'
      case 'under_review':
        return 'Your application is currently being reviewed by our admissions team.'
      case 'approved':
        return 'Congratulations! Your application has been approved. You will receive further instructions via email.'
      case 'rejected':
        return 'Unfortunately, your application was not successful this time. You may apply for future intakes.'
      default:
        return 'Application status is being updated.'
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchApplication()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="inline-flex items-center text-primary hover:text-primary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-secondary">
                  Track Your Application
                </h1>
                <p className="text-sm text-secondary">
                  Check the status of your application without logging in
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-secondary mb-4">
            Find Your Application
          </h2>
          <p className="text-sm text-secondary mb-6">
            Enter your application number (e.g., MIHAS123456) or tracking code to check your application status.
          </p>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter application number or tracking code"
                className="w-full"
              />
            </div>
            <Button 
              onClick={searchApplication}
              loading={loading}
              className="px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
        </div>

        {/* Application Status */}
        {application && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Status Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    📋 Application #{application.application_number}
                  </h3>
                  <p className="text-white/90 text-lg font-medium">
                    {application.program_name}
                  </p>
                  <p className="text-white/80">
                    📅 {application.intake_name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(application.status)}
                    <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white font-bold text-lg">
                      {application.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/80">
                    🕒 Last updated: {formatDate(application.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Status */}
                <div className="lg:col-span-2">
                  <h4 className="text-lg font-medium text-secondary mb-4">
                    Current Status
                  </h4>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start space-x-4">
                      <div className="text-3xl">
                        {getStatusIcon(application.status)}
                      </div>
                      <div>
                        <p className="font-bold text-xl text-secondary mb-2">
                          {application.status.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-secondary text-lg leading-relaxed">
                          {getStatusMessage(application.status)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Admin Feedback */}
                  {application.admin_feedback && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                      <h5 className="font-bold text-green-900 mb-3 text-lg flex items-center">
                        💬 Feedback from Admissions Team
                      </h5>
                      <p className="text-green-800 mb-3 text-lg leading-relaxed">
                        {application.admin_feedback}
                      </p>
                      {application.admin_feedback_date && (
                        <p className="text-green-600 font-medium">
                          📅 Provided on {formatDate(application.admin_feedback_date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Application Info */}
                <div>
                  <h4 className="text-lg font-medium text-secondary mb-4">
                    Application Details
                  </h4>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="font-medium text-secondary">Application Number</p>
                        <p className="text-secondary">{application.application_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="font-medium text-secondary">Program</p>
                        <p className="text-secondary">{application.program_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="font-medium text-secondary">Intake</p>
                        <p className="text-secondary">{application.intake_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="font-medium text-secondary">Submitted</p>
                        <p className="text-secondary">{formatDate(application.submitted_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <p className="text-sm text-secondary">
                Need help? Contact our admissions office for assistance.
              </p>
              <div className="flex space-x-3">
                <Link to="/apply">
                  <Button variant="outline" size="sm">
                    Submit New Application
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {searched && !application && !loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary mb-2">
              No Application Found
            </h3>
            <p className="text-secondary mb-6">
              We couldn't find an application with that number or tracking code. 
              Please check your information and try again.
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setSearched(false)
                  setError('')
                }}
              >
                Try Again
              </Button>
              <Link to="/apply">
                <Button>
                  Submit New Application
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">
            Need Help?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-secondary mb-2">
                Where to find your application number?
              </h4>
              <ul className="text-secondary space-y-1">
                <li>• Check your email confirmation after submitting</li>
                <li>• Look for format: MIHAS123456</li>
                <li>• Contact admissions if you can't find it</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-secondary mb-2">
                Application Status Meanings
              </h4>
              <ul className="text-secondary space-y-1">
                <li>• <strong>Submitted:</strong> Application received</li>
                <li>• <strong>Under Review:</strong> Being evaluated</li>
                <li>• <strong>Approved:</strong> Accepted for admission</li>
                <li>• <strong>Rejected:</strong> Not accepted this time</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-secondary">
              <strong>Contact Information:</strong> For questions about your application, 
              contact our admissions office at admissions@mihas.edu.zm or call +260 XXX XXX XXX
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}