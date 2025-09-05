'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

const paymentSchema = z.object({
  amount: z.number().min(1, 'Amount is required'),
  currency: z.string().min(1, 'Currency is required'),
  recipient_number: z.string().min(1, 'Recipient number is required'),
  transaction_reference: z.string().optional(),
})

type PaymentData = z.infer<typeof paymentSchema>

type Payment = {
  id?: string
  application_id: string
  amount: number
  currency: string
  recipient_number: string
  transaction_reference: string | null
  proof_of_payment_path: string | null
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at?: string
}

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: string
  payment_id: string | null
}

interface PaymentStepProps {
  application: Application
  onComplete: () => void
  onNext: () => void
  onPrevious: () => void
}

// Payment routing based on program
const getPaymentDetails = (program: string, institution: string) => {
  if (program === 'Nursing' && institution === 'MIHAS') {
    return {
      recipient: '0961515151',
      amount: 0, // To be filled by user
      currency: 'ZMW',
      institution: 'MIHAS'
    }
  }
  
  if ((program === 'Clinical Medicine' || program === 'Environmental Health') && institution === 'KATC') {
    return {
      recipient: '0966992299',
      amount: 0, // To be filled by user
      currency: 'ZMW',
      institution: 'KATC'
    }
  }
  
  return {
    recipient: '',
    amount: 0,
    currency: 'ZMW',
    institution: ''
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function PaymentStep({ application, onComplete, onNext, onPrevious }: PaymentStepProps) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [loading, setLoading] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const supabase = createSupabaseBrowserClient()
  
  const paymentDetails = getPaymentDetails(application.program, application.institution)
  
  const form = useForm<PaymentData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      currency: paymentDetails.currency,
      recipient_number: paymentDetails.recipient,
      transaction_reference: '',
    },
  })

  useEffect(() => {
    if (application.payment_id) {
      fetchExistingPayment()
    }
    
    // Set the recipient number from payment routing
    form.setValue('recipient_number', paymentDetails.recipient)
    form.setValue('currency', paymentDetails.currency)
  }, [application.payment_id, paymentDetails, form])

  const fetchExistingPayment = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('application_id', application.id)
        .single()

      if (error) throw error
      
      if (data) {
        setPayment(data)
        // Populate form with existing data
        form.setValue('amount', data.amount)
        form.setValue('currency', data.currency)
        form.setValue('recipient_number', data.recipient_number)
        form.setValue('transaction_reference', data.transaction_reference || '')
      }
    } catch (error: any) {
      console.error('Error fetching payment data:', error)
    }
  }

  const uploadProofOfPayment = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return null
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not allowed. Please upload JPG, PNG, or PDF files only.')
      return null
    }

    setUploadingProof(true)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${application.id}/payment_proof_${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('payments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      return fileName
    } catch (error: any) {
      console.error('Error uploading proof:', error)
      toast.error('Failed to upload proof of payment')
      return null
    } finally {
      setUploadingProof(false)
    }
  }

  const deleteProofOfPayment = async () => {
    if (!payment?.proof_of_payment_path) return

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('payments')
        .remove([payment.proof_of_payment_path])

      if (storageError) throw storageError

      // Update payment record
      const { error: dbError } = await supabase
        .from('payments')
        .update({
          proof_of_payment_path: null,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)

      if (dbError) throw dbError

      setPayment({ ...payment, proof_of_payment_path: null, verification_status: 'pending' })
      toast.success('Proof of payment deleted successfully')
    } catch (error: any) {
      console.error('Error deleting proof:', error)
      toast.error('Failed to delete proof of payment')
    }
  }

  const previewProofOfPayment = async () => {
    if (!payment?.proof_of_payment_path) return

    try {
      const { data, error } = await supabase.storage
        .from('payments')
        .createSignedUrl(payment.proof_of_payment_path, 3600)

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error previewing proof:', error)
      toast.error('Failed to preview proof of payment')
    }
  }

  const onSubmit = async (data: PaymentData) => {
    setLoading(true)

    try {
      let proofPath = payment?.proof_of_payment_path
      
      // Upload new proof if selected
      if (proofFile) {
        // Delete old proof if exists
        if (proofPath) {
          await supabase.storage
            .from('payments')
            .remove([proofPath])
        }
        
        proofPath = await uploadProofOfPayment(proofFile)
        if (!proofPath) {
          setLoading(false)
          return
        }
      }

      if (payment) {
        // Update existing payment record
        const { error } = await supabase
          .from('payments')
          .update({
            ...data,
            proof_of_payment_path: proofPath,
            verification_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id)

        if (error) throw error
        
        setPayment({ ...payment, ...data, proof_of_payment_path: proofPath })
      } else {
        // Create new payment record
        const { data: paymentData, error } = await supabase
          .from('payments')
          .insert({
            application_id: application.id,
            ...data,
            proof_of_payment_path: proofPath,
            verification_status: 'pending',
          })
          .select()
          .single()

        if (error) throw error

        // Update application with payment ID
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            payment_id: paymentData.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', application.id)

        if (updateError) throw updateError
        
        setPayment(paymentData)
      }

      toast.success('Payment information saved successfully!')
      onComplete()
      onNext()
    } catch (error: any) {
      console.error('Error saving payment:', error)
      toast.error('Failed to save payment information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
        <p className="text-sm text-gray-600">
          Complete your application fee payment and upload proof of payment for verification.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Instructions */}
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Instructions for {application.program}</strong>
            <div className="mt-2 space-y-1">
              <p>• <strong>Institution:</strong> {application.institution}</p>
              <p>• <strong>Payment Method:</strong> MTN Money</p>
              <p>• <strong>Recipient Number:</strong> {paymentDetails.recipient}</p>
              <p>• <strong>Reference:</strong> Your name and program</p>
            </div>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (ZMW) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="Enter amount paid" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="recipient_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Number *</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="transaction_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter transaction ID/reference (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Proof of Payment */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Proof of Payment</h3>
                {payment?.verification_status && (
                  <Badge 
                    variant={payment.verification_status === 'verified' ? 'default' : 
                            payment.verification_status === 'rejected' ? 'destructive' : 'secondary'}
                  >
                    {payment.verification_status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {payment.verification_status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {payment.verification_status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {payment.verification_status.charAt(0).toUpperCase() + payment.verification_status.slice(1)}
                  </Badge>
                )}
              </div>

              {payment?.proof_of_payment_path ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">Proof of payment uploaded</p>
                      <p className="text-xs text-green-700">
                        Uploaded {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'Recently'} • 
                        Status: {payment.verification_status}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={previewProofOfPayment}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deleteProofOfPayment}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {uploadingProof ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-gray-600">Uploading proof...</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Upload proof of payment
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          JPG, PNG, or PDF (max 10MB)
                        </p>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setProofFile(file)
                            }
                          }}
                          className="hidden"
                          id="proof-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('proof-file')?.click()}
                        >
                          Select File
                        </Button>
                        {proofFile && (
                          <p className="text-xs text-green-600 mt-2">
                            Selected: {proofFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Important Notes */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Ensure you make payment to the correct number for your chosen program</li>
                  <li>Keep your transaction receipt as proof of payment</li>
                  <li>Upload a clear photo or scan of your payment receipt</li>
                  <li>Payment verification may take 1-3 business days</li>
                  <li>Contact the institution directly for payment issues</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button type="button" variant="outline" onClick={onPrevious}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button 
                type="submit" 
                disabled={loading || form.getValues('amount') <= 0}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Save & Continue</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}