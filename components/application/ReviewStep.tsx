'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  ChevronLeft, 
  Send, 
  User, 
  BookOpen, 
  FileText, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: string
  kyc_id: string | null
  payment_id: string | null
}

interface ReviewStepProps {
  application: Application
  onPrevious: () => void
  onSubmit: () => void
}

export default function ReviewStep({ application, onPrevious, onSubmit }: ReviewStepProps) {
  const [kycData, setKycData] = useState<any>(null)
  const [qualifications, setQualifications] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [confirmSubmission, setConfirmSubmission] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    fetchApplicationData()
  }, [])

  const fetchApplicationData = async () => {
    try {
      // Fetch KYC data
      if (application.kyc_id) {
        const { data: kycData, error: kycError } = await supabase
          .from('kyc')
          .select('*')
          .eq('application_id', application.id)
          .single()

        if (kycError) throw kycError
        setKycData(kycData)
      }

      // Fetch qualifications
      const { data: qualData, error: qualError } = await supabase
        .from('qualifications')
        .select('*')
        .eq('application_id', application.id)
        .order('subject_name')

      if (qualError) throw qualError
      setQualifications(qualData || [])

      // Fetch documents
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', application.id)
        .order('document_type')

      if (docError) throw docError
      setDocuments(docData || [])

      // Fetch payment
      if (application.payment_id) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('application_id', application.id)
          .single()

        if (paymentError) throw paymentError
        setPayment(paymentData)
      }
    } catch (error: any) {
      console.error('Error fetching application data:', error)
      toast.error('Failed to load application data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitApplication = async () => {
    if (!agreedToTerms || !confirmSubmission) {
      toast.error('Please confirm all required agreements')
      return
    }

    setSubmitting(true)

    try {
      // Update application status to submitted
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id)

      if (error) throw error

      toast.success('Application submitted successfully!')
      onSubmit()
    } catch (error: any) {
      console.error('Error submitting application:', error)
      toast.error('Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const previewDocument = async (document: any) => {
    try {
      const bucket = document.document_type.includes('payment') ? 'payments' : 'kyc'
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading application data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const requiredDocuments = ['nrc_front', 'nrc_back', 'passport_photo', 'ecz_results', 'ecz_certificate']
  const uploadedDocs = documents.filter(doc => requiredDocuments.includes(doc.document_type))
  const isComplete = kycData && qualifications.length > 0 && uploadedDocs.length >= requiredDocuments.length && payment

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Submit Application</CardTitle>
          <p className="text-sm text-gray-600">
            Please review all your information carefully before submitting your application.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Application Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Application Summary</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Program:</strong> {application.program}</p>
                <p><strong>Institution:</strong> {application.institution}</p>
              </div>
              <div>
                <p><strong>Application ID:</strong> {application.id.slice(0, 8)}...</p>
                <p><strong>Status:</strong> {application.status}</p>
              </div>
            </div>
          </div>

          {/* Completion Status */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border ${
              kycData ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4" />
                {kycData ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Personal Info</span>
              </div>
              <p className={`text-xs ${
                kycData ? 'text-green-700' : 'text-red-700'
              }`}>
                {kycData ? 'Complete' : 'Incomplete'}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              qualifications.length > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="h-4 w-4" />
                {qualifications.length > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Academic Records</span>
              </div>
              <p className={`text-xs ${
                qualifications.length > 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {qualifications.length} subjects
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              uploadedDocs.length >= requiredDocuments.length ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-4 w-4" />
                {uploadedDocs.length >= requiredDocuments.length ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Documents</span>
              </div>
              <p className={`text-xs ${
                uploadedDocs.length >= requiredDocuments.length ? 'text-green-700' : 'text-red-700'
              }`}>
                {uploadedDocs.length}/{requiredDocuments.length} uploaded
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${
              payment ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-4 w-4" />
                {payment ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-sm">Payment</span>
              </div>
              <p className={`text-xs ${
                payment ? 'text-green-700' : 'text-red-700'
              }`}>
                {payment ? `ZMW ${payment.amount}` : 'Not completed'}
              </p>
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
      {qualifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Academic Records</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualifications.map((qual, index) => (
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
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Uploaded Documents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{doc.file_name}</p>
                    <p className="text-xs text-gray-600">
                      {doc.document_type.replace(/_/g, ' ').toUpperCase()} • 
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
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
      {payment && (
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
                <p><strong>Amount:</strong> {payment.currency} {payment.amount}</p>
                <p><strong>Recipient:</strong> {payment.recipient_number}</p>
              </div>
              <div>
                <p><strong>Transaction Ref:</strong> {payment.transaction_reference || 'Not provided'}</p>
                <p><strong>Status:</strong> 
                  <Badge 
                    variant={payment.verification_status === 'verified' ? 'default' : 
                            payment.verification_status === 'rejected' ? 'destructive' : 'secondary'}
                    className="ml-2"
                  >
                    {payment.verification_status}
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Confirmation */}
      <Card>
        <CardContent className="pt-6">
          {!isComplete && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required sections before submitting your application.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-5">
                I confirm that all information provided is accurate and complete. I understand that providing false information may result in the rejection of my application or termination of enrollment.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="confirm" 
                checked={confirmSubmission}
                onCheckedChange={(checked) => setConfirmSubmission(checked as boolean)}
              />
              <label htmlFor="confirm" className="text-sm text-gray-700 leading-5">
                I understand that once submitted, this application cannot be modified. I confirm that I want to submit this application for review.
              </label>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button 
              onClick={handleSubmitApplication}
              disabled={submitting || !isComplete || !agreedToTerms || !confirmSubmission}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Submit Application</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}