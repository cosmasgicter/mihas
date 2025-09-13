import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SimpleButton as Button } from '@/components/ui/SimpleButton'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const wizardSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  nrc_number: z.string().optional(),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['Male', 'Female'], { required_error: 'Please select sex' }),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  residence_town: z.string().min(2, 'Residence town is required'),
  program: z.enum(['Clinical Medicine', 'Environmental Health', 'Registered Nursing'], { 
    required_error: 'Please select a program' 
  }),
  intake: z.string().min(1, 'Please select an intake')
}).refine((data) => {
  return data.nrc_number || data.passport_number
}, {
  message: "Either NRC or Passport number is required",
  path: ["nrc_number"]
})

type WizardFormData = z.infer<typeof wizardSchema>

export default function ApplicationWizardSimple() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema)
  })

  const selectedProgram = watch('program')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-wizard')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      setValue('email', user.email || '')
    }
  }, [user, setValue])

  const nextStep = async () => {
    if (currentStep === 1) {
      const formData = watch()
      const requiredFields = ['full_name', 'date_of_birth', 'sex', 'phone', 'email', 'residence_town', 'program', 'intake']
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`)
        return
      }
      
      if (!formData.nrc_number && !formData.passport_number) {
        setError('Either NRC or Passport number is required')
        return
      }
      
      try {
        setLoading(true)
        setError('')
        
        const applicationNumber = `APP${Date.now().toString().slice(-8)}`
        const trackingCode = `TRK${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        const institution = ['Clinical Medicine', 'Environmental Health'].includes(formData.program) ? 'KATC' : 'MIHAS'
        
        const { data: app, error } = await supabase
          .from('applications_new')
          .insert({
            application_number: applicationNumber,
            public_tracking_code: trackingCode,
            user_id: user?.id,
            full_name: formData.full_name,
            nrc_number: formData.nrc_number || null,
            passport_number: formData.passport_number || null,
            date_of_birth: formData.date_of_birth,
            sex: formData.sex,
            phone: formData.phone,
            email: formData.email,
            residence_town: formData.residence_town,
            program: formData.program,
            intake: formData.intake,
            institution: institution,
            status: 'draft'
          })
          .select()
          .single()

        if (error) throw error
        
        setCurrentStep(2)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const submitApplication = async (data: WizardFormData) => {
    try {
      setLoading(true)
      setError('')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) return null

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application has been submitted and is now under review.
            </p>
            <Link to="/student/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Student Application
          </h1>
          <p className="text-gray-600">
            Complete the 4-step application process
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Step {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(submitApplication)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Basic Information
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <Input
                    {...register('full_name')}
                    label="Full Name"
                    error={errors.full_name?.message}
                    required
                  />
                </div>
                
                <div>
                  <Input
                    {...register('nrc_number')}
                    label="NRC Number"
                    placeholder="123456/12/1"
                    error={errors.nrc_number?.message}
                  />
                </div>
                
                <div>
                  <Input
                    {...register('passport_number')}
                    label="Passport Number"
                    placeholder="Enter passport number"
                    error={errors.passport_number?.message}
                  />
                </div>
                
                <div>
                  <Input
                    type="date"
                    {...register('date_of_birth')}
                    label="Date of Birth"
                    error={errors.date_of_birth?.message}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('sex')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.sex && (
                    <p className="mt-1 text-sm text-red-600">{errors.sex.message}</p>
                  )}
                </div>
                
                <div>
                  <Input
                    {...register('phone')}
                    label="Phone Number"
                    placeholder="0977123456"
                    error={errors.phone?.message}
                    required
                  />
                </div>
                
                <div>
                  <Input
                    type="email"
                    {...register('email')}
                    label="Email Address"
                    error={errors.email?.message}
                    required
                  />
                </div>
                
                <div>
                  <Input
                    {...register('residence_town')}
                    label="Residence Town"
                    error={errors.residence_town?.message}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('program')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select program</option>
                    <option value="Clinical Medicine">Clinical Medicine</option>
                    <option value="Environmental Health">Environmental Health</option>
                    <option value="Registered Nursing">Registered Nursing</option>
                  </select>
                  {errors.program && (
                    <p className="mt-1 text-sm text-red-600">{errors.program.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intake <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('intake')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select intake</option>
                    <option value="January 2026">January 2026</option>
                    <option value="July 2026">July 2026</option>
                  </select>
                  {errors.intake && (
                    <p className="mt-1 text-sm text-red-600">{errors.intake.message}</p>
                  )}
                </div>
              </div>
              
              {selectedProgram && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Institution:</strong> {['Clinical Medicine', 'Environmental Health'].includes(selectedProgram) ? 'KATC' : 'MIHAS'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Steps 2-4 placeholders */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Education & Documents
              </h2>
              <p className="text-gray-600">Education details and document upload will go here.</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Payment Information
              </h2>
              <p className="text-gray-600">Payment details will go here.</p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 4: Review & Submit
              </h2>
              <p className="text-gray-600">Review all information before submitting.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6">
            <div>
              {currentStep > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            
            <div>
              {currentStep < 4 ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  loading={loading}
                  disabled={loading}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  loading={loading}
                  disabled={loading}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}