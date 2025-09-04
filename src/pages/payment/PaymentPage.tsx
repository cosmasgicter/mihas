import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useToast } from '../../hooks/use-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useApplications } from '../../hooks/useApplications'
import { usePayments } from '../../hooks/usePayments'
import { CreditCard, Smartphone, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface PaymentFormData {
  payerName: string
  payerEmail: string
  payerPhone: string
  paymentMethod: 'card' | 'mobile_money'
  mobileProvider?: 'mtn' | 'airtel' | 'zamtel'
}

const PaymentPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { getApplication } = useApplications()
  const { initiatePayment } = usePayments()
  
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  
  const [formData, setFormData] = useState<PaymentFormData>({
    payerName: user?.name || '',
    payerEmail: user?.email || '',
    payerPhone: user?.phone || '',
    paymentMethod: 'card',
    mobileProvider: 'mtn'
  })
  
  const APPLICATION_FEE = 150 // ZMW
  
  useEffect(() => {
    if (applicationId) {
      loadApplication()
    }
  }, [applicationId])
  
  const loadApplication = async () => {
    if (!applicationId) return
    
    try {
      setLoading(true)
      const data = await getApplication(applicationId)
      setApplication(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load application details',
        variant: 'destructive'
      })
      navigate('/applications')
    } finally {
      setLoading(false)
    }
  }
  
  const updateFormData = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const validateForm = () => {
    if (!formData.payerName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your full name',
        variant: 'destructive'
      })
      return false
    }
    
    if (!formData.payerEmail.trim() || !formData.payerEmail.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      })
      return false
    }
    
    if (!formData.payerPhone.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your phone number',
        variant: 'destructive'
      })
      return false
    }
    
    return true
  }
  
  const handlePayment = async () => {
    if (!validateForm() || !applicationId) return
    
    setProcessing(true)
    setPaymentStatus('processing')
    
    try {
      // Prepare payment data
      const paymentData = {
        applicationId,
        studentEmail: formData.payerEmail,
        studentName: formData.payerName,
        phoneNumber: formData.payerPhone,
        amount: APPLICATION_FEE,
        currency: 'ZMW'
      }
      
      // Initiate payment with Flutterwave
      const response = await initiatePayment(paymentData)
      
      if (response.data?.payment_link) {
        // Redirect to Flutterwave payment page
        window.location.href = response.data.payment_link
      } else if (response.data?.payment_reference) {
        // Handle direct payment response
        setPaymentStatus('success')
        toast({
          title: 'Payment Initiated',
          description: 'Your payment has been initiated successfully. Please check your mobile device to complete the transaction.'
        })
        
        // Poll for payment status
        pollPaymentStatus(response.data.payment_reference)
      } else {
        throw new Error('Invalid payment response from server')
      }
      
    } catch (error: any) {
      console.error('Payment error:', error)
      setPaymentStatus('error')
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initiate payment. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }
  
  const pollPaymentStatus = async (paymentReference: string) => {
    let attempts = 0
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    
    const checkStatus = async () => {
      try {
        // Check payment status using your edge function
        const response = await fetch(`/api/payment-status/${paymentReference}`)
        const data = await response.json()
        
        if (data.status === 'completed') {
          setPaymentStatus('success')
          toast({
            title: 'Payment Successful!',
            description: 'Your application fee has been paid successfully.'
          })
          
          // Redirect to applications page after a delay
          setTimeout(() => {
            navigate('/applications')
          }, 3000)
          
          return true
        } else if (data.status === 'failed') {
          setPaymentStatus('error')
          toast({
            title: 'Payment Failed',
            description: 'Your payment could not be processed. Please try again.',
            variant: 'destructive'
          })
          return true
        }
        
        return false
      } catch (error) {
        console.error('Error checking payment status:', error)
        return false
      }
    }
    
    const poll = setInterval(async () => {
      attempts++
      const isComplete = await checkStatus()
      
      if (isComplete || attempts >= maxAttempts) {
        clearInterval(poll)
        if (attempts >= maxAttempts && paymentStatus === 'processing') {
          setPaymentStatus('error')
          toast({
            title: 'Payment Timeout',
            description: 'Payment verification timed out. Please check your payment status in your applications.',
            variant: 'destructive'
          })
        }
      }
    }, 10000) // Check every 10 seconds
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (!application) {
    return (
      <div className="space-y-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Application not found. Please check the application ID and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/applications')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Applications
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
          <p className="text-gray-600 mt-2">
            Complete your application fee payment for {application.academic_programs?.program_name}
          </p>
        </div>
        <Button onClick={() => navigate('/applications')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Applications
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Application Fee Payment</CardTitle>
              <CardDescription>
                Application ID: {application.app_id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Status */}
              {paymentStatus === 'processing' && (
                <Alert>
                  <Loader className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Processing your payment... Please do not close this page.
                  </AlertDescription>
                </Alert>
              )}
              
              {paymentStatus === 'success' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Payment successful! Redirecting to your applications...
                  </AlertDescription>
                </Alert>
              )}
              
              {paymentStatus === 'error' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Payment failed. Please try again or contact support if the problem persists.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Payer Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payerName">Full Name *</Label>
                    <Input
                      id="payerName"
                      value={formData.payerName}
                      onChange={(e) => updateFormData('payerName', e.target.value)}
                      placeholder="Enter your full name"
                      disabled={processing}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payerEmail">Email Address *</Label>
                    <Input
                      id="payerEmail"
                      type="email"
                      value={formData.payerEmail}
                      onChange={(e) => updateFormData('payerEmail', e.target.value)}
                      placeholder="Enter your email"
                      disabled={processing}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payerPhone">Phone Number *</Label>
                  <Input
                    id="payerPhone"
                    value={formData.payerPhone}
                    onChange={(e) => updateFormData('payerPhone', e.target.value)}
                    placeholder="Enter your phone number (e.g., +260xxxxxxxxx)"
                    disabled={processing}
                    required
                  />
                </div>
              </div>
              
              {/* Payment Method Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Payment */}
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'card' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('paymentMethod', 'card')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        formData.paymentMethod === 'card' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.paymentMethod === 'card' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        )}
                      </div>
                      <CreditCard className="w-6 h-6 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Card Payment</p>
                        <p className="text-sm text-gray-600">Visa, Mastercard, Verve</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Money */}
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.paymentMethod === 'mobile_money' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData('paymentMethod', 'mobile_money')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        formData.paymentMethod === 'mobile_money' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {formData.paymentMethod === 'mobile_money' && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                        )}
                      </div>
                      <Smartphone className="w-6 h-6 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Mobile Money</p>
                        <p className="text-sm text-gray-600">MTN, Airtel, Zamtel</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Provider Selection */}
                {formData.paymentMethod === 'mobile_money' && (
                  <div className="space-y-2">
                    <Label>Mobile Money Provider</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['mtn', 'airtel', 'zamtel'] as const).map((provider) => (
                        <button
                          key={provider}
                          type="button"
                          className={`p-3 border rounded-lg text-center transition-colors ${
                            formData.mobileProvider === provider
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => updateFormData('mobileProvider', provider)}
                          disabled={processing}
                        >
                          <div className="font-medium capitalize">{provider}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Payment Button */}
              <div className="pt-4">
                <Button
                  onClick={handlePayment}
                  disabled={processing || paymentStatus === 'success'}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Pay Application Fee - ZMW {APPLICATION_FEE}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Payment Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Application Fee</span>
                  <span className="font-medium">ZMW {APPLICATION_FEE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Fee</span>
                  <span className="font-medium">ZMW 0</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-gray-900">ZMW {APPLICATION_FEE}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Payment Information</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Payment is secure and encrypted</li>
                  <li>• You will receive a confirmation email</li>
                  <li>• Payment receipt will be available in your profile</li>
                  <li>• Contact support if you need assistance</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Application Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Program:</strong> {application.academic_programs?.program_name}</p>
                  <p><strong>Type:</strong> {application.academic_programs?.program_type}</p>
                  <p><strong>Application ID:</strong> {application.app_id}</p>
                  <p><strong>Status:</strong> <span className="capitalize">{application.status?.replace('_', ' ')}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage