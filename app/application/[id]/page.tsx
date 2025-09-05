'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GraduationCap, 
  ArrowLeft, 
  User, 
  BookOpen, 
  FileText, 
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

type ApplicationDetails = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
  submitted_at: string | null
  created_at: string
  updated_at: string
  kyc: any[]
  qualifications: any[]
  documents: any[]
  payments: any[]
  messages: any[]
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock, description: 'Your application is still in draft mode. Continue completing all sections and submit when ready.' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: FileText, description: 'Your application has been submitted and is awaiting review by the admissions team.' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock, description: 'Your application is currently being reviewed by the admissions committee.' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle, description: 'Congratulations! Your application has been approved. Please wait for further enrollment instructions.' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle, description: 'Unfortunately, your application was not successful at this time. Please see messages for feedback.' },
  deferred: { label: 'Deferred', color: 'bg-orange-100 text-orange-800', icon: AlertCircle, description: 'Your application has been deferred. Please check messages for required updates and resubmit.' },
}

export default function ApplicationViewPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && params.id) {
      fetchApplicationDetails()
    }
  }, [user, loading, params.id, router])

  const fetchApplicationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          kyc(*),
          qualifications(*),
          documents(*),
          payments(*),
          messages(*)
        `)
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
      
      if (!data) {
        toast.error('Application not found')
        router.push('/dashboard')
        return
      }

      setApplication(data)
    } catch (error: any) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
      router.push('/dashboard')
    } finally {
      setLoadingApp(false)
    }
  }

  const previewDocument = async (document: any) => {
    try {
      const bucket = document.document_type?.includes('payment') ? 'payments' : 'kyc'
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(document.file_path, 3600)

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error previewing document:', error)
      toast.error('Failed to preview document')
    }
  }

  const previewPaymentProof = async (payment: any) => {
    if (!payment.proof_of_payment_path) return
    
    try {
      const { data, error } = await supabase.storage
        .from('payments')
        .createSignedUrl(payment.proof_of_payment_path, 3600)

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error previewing payment proof:', error)
      toast.error('Failed to preview payment proof')
    }
  }

  if (loading || loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !application) {
    return null
  }

  const statusInfo = statusConfig[application.status]
  const kycData = application.kyc?.[0]
  const paymentData = application.payments?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Application Status</h1>
                  <p className="text-sm text-gray-600">
                    {application.program} • {application.institution}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {application.status === 'draft' && (
                <Button onClick={() => router.push(`/apply/${application.id}`)}>
                  Continue Application
                </Button>
              )}
              {application.status === 'deferred' && (
                <Button onClick={() => router.push(`/apply/${application.id}`)} variant="outline">
                  Update Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Status Alert */}
          <Alert className={`border-2 ${statusInfo.color.includes('green') ? 'border-green-200' : 
                                     statusInfo.color.includes('red') ? 'border-red-200' :
                                     statusInfo.color.includes('yellow') ? 'border-yellow-200' :
                                     statusInfo.color.includes('blue') ? 'border-blue-200' : 'border-gray-200'}`}>
            <div className="flex items-start space-x-3">
              <statusInfo.icon className={`h-5 w-5 mt-0.5 ${
                statusInfo.color.includes('green') ? 'text-green-600' :
                statusInfo.color.includes('red') ? 'text-red-600' :
                statusInfo.color.includes('yellow') ? 'text-yellow-600' :
                statusInfo.color.includes('blue') ? 'text-blue-600' : 'text-gray-600'
              }`} />
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold">Application Status: {statusInfo.label}</h3>
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <AlertDescription>{statusInfo.description}</AlertDescription>
              </div>
            </div>
          </Alert>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Application Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Application ID:</strong> {application.id}</p>
                      <p><strong>Program:</strong> {application.program}</p>
                      <p><strong>Institution:</strong> {application.institution}</p>
                    </div>
                    <div>
                      <p><strong>Created:</strong> {new Date(application.created_at).toLocaleDateString()}</p>
                      <p><strong>Submitted:</strong> {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Not submitted'}</p>
                      <p><strong>Last Updated:</strong> {new Date(application.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              {kycData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Personal Information</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Name:</strong> {kycData.first_name} {kycData.middle_name || ''} {kycData.last_name}</p>
                        <p><strong>Date of Birth:</strong> {new Date(kycData.date_of_birth).toLocaleDateString()}</p>
                        <p><strong>Gender:</strong> {kycData.gender}</p>
                        <p><strong>Nationality:</strong> {kycData.nationality}</p>
                        <p><strong>NRC Number:</strong> {kycData.nrc_number}</p>
                      </div>
                      <div>
                        <p><strong>Phone:</strong> {kycData.phone_number}</p>
                        <p><strong>Email:</strong> {kycData.email}</p>
                        <p><strong>Address:</strong> {kycData.address_line_1}, {kycData.city}, {kycData.province}</p>
                        {kycData.guardian_name && (
                          <p><strong>Guardian:</strong> {kycData.guardian_name} ({kycData.guardian_relationship})</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Academic Records */}
              {application.qualifications && application.qualifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>Academic Records</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {application.qualifications.map((qual: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">{qual.subject_name}</span>
                          <Badge variant="outline">{qual.grade}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              {application.documents && application.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Documents</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {application.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{doc.file_name}</p>
                            <p className="text-xs text-gray-600">
                              {doc.document_type.replace(/_/g, ' ').toUpperCase()} • 
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewDocument(doc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              {paymentData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Payment Information</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Amount:</strong> {paymentData.currency} {paymentData.amount}</p>
                        <p><strong>Recipient:</strong> {paymentData.recipient_number}</p>
                        <p><strong>Transaction Ref:</strong> {paymentData.transaction_reference || 'Not provided'}</p>
                      </div>
                      <div>
                        <p><strong>Verification Status:</strong> 
                          <Badge 
                            variant={paymentData.verification_status === 'verified' ? 'default' : 
                                    paymentData.verification_status === 'rejected' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {paymentData.verification_status}
                          </Badge>
                        </p>
                        {paymentData.proof_of_payment_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewPaymentProof(paymentData)}
                            className="mt-2"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Proof
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                      kycData ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <User className="h-4 w-4" />
                      {kycData ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">Personal Information</span>
                    </div>

                    <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                      application.qualifications?.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <BookOpen className="h-4 w-4" />
                      {application.qualifications?.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">Academic Records</span>
                    </div>

                    <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                      application.documents?.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <FileText className="h-4 w-4" />
                      {application.documents?.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">Documents</span>
                    </div>

                    <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                      paymentData ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <CreditCard className="h-4 w-4" />
                      {paymentData ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium">Payment</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {application.messages && application.messages.length > 0 ? (
                      application.messages.map((message: any, index: number) => (
                        <div key={index} className={`p-3 rounded-lg ${
                          message.sender_type === 'admin' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {message.sender_type === 'admin' ? 'Admin' : 'You'} • 
                            {new Date(message.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No messages yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>For {application.institution}:</strong></p>
                  {application.institution === 'MIHAS' ? (
                    <div>
                      <p>Payment Number: 0961515151</p>
                      <p>For assistance with your Nursing program application.</p>
                    </div>
                  ) : (
                    <div>
                      <p>Payment Number: 0966992299</p>
                      <p>For assistance with Clinical Medicine or Environmental Health applications.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}