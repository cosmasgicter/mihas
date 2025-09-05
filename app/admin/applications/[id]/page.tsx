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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  GraduationCap, 
  ArrowLeft, 
  User, 
  BookOpen, 
  FileText, 
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare
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
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: FileText },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  deferred: { label: 'Deferred', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
}

export default function ApplicationDetailsPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!loading && (!user || user.email !== 'jrrbqpnd@minimax.com')) {
      router.push('/dashboard')
      return
    }

    if (user?.email === 'jrrbqpnd@minimax.com' && params.id) {
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
        .single()

      if (error) throw error
      
      if (!data) {
        toast.error('Application not found')
        router.push('/admin')
        return
      }

      setApplication(data)
    } catch (error: any) {
      console.error('Error fetching application details:', error)
      toast.error('Failed to load application details')
      router.push('/admin')
    } finally {
      setLoadingApp(false)
    }
  }

  const updateApplicationStatus = async (newStatus: string) => {
    if (!application) return
    
    setUpdatingStatus(true)
    
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id)

      if (error) throw error

      setApplication({ ...application, status: newStatus as any })
      
      // Send system message about status change
      await supabase
        .from('messages')
        .insert({
          application_id: application.id,
          message: `Application status changed to: ${newStatus}`,
          sender_type: 'admin',
          sender_id: user?.id,
        })

      toast.success(`Application status updated to ${newStatus}`)
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error('Failed to update application status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !application) return
    
    setSendingMessage(true)
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          application_id: application.id,
          message: newMessage,
          sender_type: 'admin',
          sender_id: user?.id,
        })

      if (error) throw error

      // Refresh messages
      fetchApplicationDetails()
      setNewMessage('')
      toast.success('Message sent successfully')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
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

  if (!user || user.email !== 'jrrbqpnd@minimax.com' || !application) {
    return null
  }

  const statusInfo = statusConfig[application.status]
  const kycData = application.kyc?.[0]
  const paymentData = application.payments?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Application Details</h1>
                  <p className="text-sm text-gray-600">
                    {application.program} • {application.institution}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <p><strong>Status:</strong> 
                      <Badge className={`${statusInfo.color} ml-2`}>
                        {statusInfo.label}
                      </Badge>
                    </p>
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
                      <p><strong>Status:</strong> 
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
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.status === 'submitted' && (
                  <>
                    <Button 
                      className="w-full" 
                      onClick={() => updateApplicationStatus('under_review')}
                      disabled={updatingStatus}
                    >
                      Mark Under Review
                    </Button>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => updateApplicationStatus('approved')}
                      disabled={updatingStatus}
                    >
                      Approve Application
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={() => updateApplicationStatus('rejected')}
                      disabled={updatingStatus}
                    >
                      Reject Application
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => updateApplicationStatus('deferred')}
                      disabled={updatingStatus}
                    >
                      Defer Application
                    </Button>
                  </>
                )}
                
                {application.status === 'under_review' && (
                  <>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => updateApplicationStatus('approved')}
                      disabled={updatingStatus}
                    >
                      Approve Application
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={() => updateApplicationStatus('rejected')}
                      disabled={updatingStatus}
                    >
                      Reject Application
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => updateApplicationStatus('deferred')}
                      disabled={updatingStatus}
                    >
                      Defer Application
                    </Button>
                  </>
                )}
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
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.sender_type === 'admin' ? 'Admin' : 'Applicant'} • 
                          {new Date(message.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No messages yet</p>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <Label htmlFor="message">Send Message to Applicant</Label>
                  <Textarea
                    id="message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                  />
                  <Button 
                    className="w-full" 
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                  >
                    {sendingMessage ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}