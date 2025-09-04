import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react'

const PaymentCallbackPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading')
  const [transactionData, setTransactionData] = useState<any>(null)
  
  useEffect(() => {
    verifyPayment()
  }, [])
  
  const verifyPayment = async () => {
    try {
      // Get payment parameters from URL
      const txRef = searchParams.get('tx_ref')
      const status = searchParams.get('status')
      const transactionId = searchParams.get('transaction_id')
      
      if (!txRef) {
        setStatus('failed')
        return
      }
      
      // Verify payment with backend
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txRef,
          status,
          transactionId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStatus('success')
        setTransactionData(data.data)
      } else {
        setStatus('failed')
      }
    } catch (error) {
      console.error('Payment verification error:', error)
      setStatus('failed')
    }
  }
  
  const handleContinue = () => {
    if (status === 'success') {
      navigate('/applications')
    } else {
      navigate('/applications')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              {status === 'loading' && (
                <div className="bg-blue-100">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="bg-green-100">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              )}
              {(status === 'failed' || status === 'cancelled') && (
                <div className="bg-red-100">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-xl">
              {status === 'loading' && 'Verifying Payment...'}
              {status === 'success' && 'Payment Successful!'}
              {status === 'failed' && 'Payment Failed'}
              {status === 'cancelled' && 'Payment Cancelled'}
            </CardTitle>
            
            <CardDescription>
              {status === 'loading' && 'Please wait while we verify your payment.'}
              {status === 'success' && 'Your application fee has been paid successfully.'}
              {status === 'failed' && 'Your payment could not be processed.'}
              {status === 'cancelled' && 'You cancelled the payment process.'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === 'success' && transactionData && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Transaction successful! Your application status has been updated.
                </AlertDescription>
              </Alert>
            )}
            
            {status === 'failed' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  If you believe this is an error, please contact our support team with your transaction reference.
                </AlertDescription>
              </Alert>
            )}
            
            {status === 'cancelled' && (
              <Alert>
                <AlertDescription>
                  You can retry the payment from your applications page whenever you're ready.
                </AlertDescription>
              </Alert>
            )}
            
            {transactionData && (
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
                <div className="space-y-1 text-gray-600">
                  {transactionData.amount && (
                    <p><strong>Amount:</strong> ZMW {transactionData.amount}</p>
                  )}
                  {transactionData.transaction_id && (
                    <p><strong>Transaction ID:</strong> {transactionData.transaction_id}</p>
                  )}
                  {transactionData.payment_method && (
                    <p><strong>Payment Method:</strong> {transactionData.payment_method}</p>
                  )}
                  {transactionData.timestamp && (
                    <p><strong>Date:</strong> {new Date(transactionData.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <Button onClick={handleContinue} className="w-full">
                {status === 'success' ? (
                  <>
                    Continue to Applications
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  'Back to Applications'
                )}
              </Button>
              
              {status === 'failed' && (
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  className="w-full"
                >
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@mihas.edu.zm" className="text-blue-600 hover:underline">
              support@mihas.edu.zm
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentCallbackPage