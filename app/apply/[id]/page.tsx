'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  GraduationCap, 
  ArrowLeft, 
  User, 
  BookOpen, 
  FileText, 
  CreditCard, 
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { toast } from 'sonner'

// Step Components
import KYCStep from '@/components/application/KYCStep'
import AcademicStep from '@/components/application/AcademicStep'
import DocumentStep from '@/components/application/DocumentStep'
import PaymentStep from '@/components/application/PaymentStep'
import ReviewStep from '@/components/application/ReviewStep'

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
  submitted_at: string | null
  created_at: string
  updated_at: string
  kyc_id: string | null
  payment_id: string | null
}

const steps = [
  { id: 'kyc', title: 'Personal Information', icon: User },
  { id: 'academic', title: 'Academic Records', icon: BookOpen },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'payment', title: 'Payment', icon: CreditCard },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle },
]

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [loadingApp, setLoadingApp] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && params.id) {
      fetchApplication()
    }
  }, [user, loading, params.id, router])

  const fetchApplication = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
      
      if (!data) {
        router.push('/dashboard')
        return
      }

      setApplication(data)
      
      // Check which steps are completed
      const completed = []
      if (data.kyc_id) completed.push('kyc')
      if (data.payment_id) completed.push('payment')
      // Add other completion checks based on your data structure
      
      setCompletedSteps(completed)
    } catch (error: any) {
      console.error('Error fetching application:', error)
      toast.error('Failed to load application')
      router.push('/dashboard')
    } finally {
      setLoadingApp(false)
    }
  }

  const handleStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    if (!application) return null

    switch (steps[currentStep].id) {
      case 'kyc':
        return (
          <KYCStep 
            application={application} 
            onComplete={() => handleStepComplete('kyc')}
            onNext={handleNext}
          />
        )
      case 'academic':
        return (
          <AcademicStep 
            application={application} 
            onComplete={() => handleStepComplete('academic')}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 'documents':
        return (
          <DocumentStep 
            application={application} 
            onComplete={() => handleStepComplete('documents')}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 'payment':
        return (
          <PaymentStep 
            application={application} 
            onComplete={() => handleStepComplete('payment')}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 'review':
        return (
          <ReviewStep 
            application={application} 
            onPrevious={handlePrevious}
            onSubmit={() => {
              toast.success('Application submitted successfully!')
              router.push('/dashboard')
            }}
          />
        )
      default:
        return null
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {application.program} Application
                </h1>
                <p className="text-sm text-gray-600">
                  {application.institution} • Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isCompleted = completedSteps.includes(step.id)
              const isAccessible = index <= currentStep
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isAccessible && setCurrentStep(index)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isAccessible
                        ? 'border-gray-300 bg-white text-gray-500 hover:border-primary'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isAccessible}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      completedSteps.includes(step.id) || index < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 mt-1">
              Complete this step to continue with your application
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {renderStep()}
        </div>

        {/* Auto-save indicator */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Auto-saving...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}