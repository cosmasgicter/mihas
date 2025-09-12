import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, CheckCircle, ArrowRight, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'

// Wizard form schema
const wizardSchema = z.object({
  // Step 1: Basic KYC
  full_name: z.string().min(2, 'Full name is required'),
  nrc_number: z.string().optional(),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['Male', 'Female'], { required_error: 'Please select sex' }),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  residence_town: z.string().min(2, 'Residence town is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  program: z.enum(['Clinical Medicine', 'Environmental Health', 'Registered Nursing'], { 
    required_error: 'Please select a program' 
  }),
  intake: z.string().min(1, 'Please select an intake'),
  
  // Step 3: Payment
  payment_method: z.string().optional(),
  payer_name: z.string().optional(),
  payer_phone: z.string().optional(),
  amount: z.number().min(150, 'Minimum amount is K150').optional(),
  paid_at: z.string().optional(),
  momo_ref: z.string().optional()
}).refine((data) => {
  return data.nrc_number || data.passport_number
}, {
  message: "Either NRC or Passport number is required",
  path: ["nrc_number"]
})

type WizardFormData = z.infer<typeof wizardSchema>

interface Grade12Subject {
  id: string
  name: string
  code: string
}

interface SubjectGrade {
  subject_id: string
  grade: number
}

export default function ApplicationWizard() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  
  // Step 2: Education
  const [subjects, setSubjects] = useState<Grade12Subject[]>([])
  const [selectedGrades, setSelectedGrades] = useState<SubjectGrade[]>([])
  const [resultSlipFile, setResultSlipFile] = useState<File | null>(null)
  const [extraKycFile, setExtraKycFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Step 3: Payment
  const [popFile, setPopFile] = useState<File | null>(null)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      amount: 150
    }
  })

  const selectedProgram = watch('program')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-wizard')
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    // Auto-derive institution and set payment target
    if (selectedProgram) {
      const isKATC = ['Clinical Medicine', 'Environmental Health'].includes(selectedProgram)
      // This info will be shown in payment step
    }
  }, [selectedProgram])

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('grade12_subjects')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error('Error loading subjects:', err)
    }
  }

  const addGrade = () => {
    if (selectedGrades.length < 10) {
      setSelectedGrades([...selectedGrades, { subject_id: '', grade: 1 }])
    }
  }

  const removeGrade = (index: number) => {
    setSelectedGrades(selectedGrades.filter((_, i) => i !== index))
  }

  const updateGrade = (index: number, field: keyof SubjectGrade, value: string | number) => {
    const updated = [...selectedGrades]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedGrades(updated)
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileName = `applications/${user?.id}/${applicationId}/${path}/${Date.now()}-${file.name}`
    
    const { error: uploadError } = await supabase.storage
      .from('app_docs')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('app_docs')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate and save basic info
      const isValid = await handleSubmit(async (data) => {
        try {
          setLoading(true)
          setError('')
          
          const { data: app, error } = await supabase
            .from('applications_new')
            .insert({
              user_id: user?.id,
              full_name: data.full_name,
              nrc_number: data.nrc_number || null,
              passport_number: data.passport_number || null,
              date_of_birth: data.date_of_birth,
              sex: data.sex,
              phone: data.phone,
              email: data.email,
              residence_town: data.residence_town,
              guardian_name: data.guardian_name || null,
              guardian_phone: data.guardian_phone || null,
              program: data.program,
              intake: data.intake,
              status: 'draft'
            })
            .select()
            .single()

          if (error) throw error
          
          setApplicationId(app.id)
          setCurrentStep(2)
        } catch (err: any) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      })()
      
      return
    }
    
    if (currentStep === 2) {
      // Validate education step
      if (selectedGrades.length < 6) {
        setError('Minimum 6 subjects required')
        return
      }
      
      if (!resultSlipFile) {
        setError('Result slip is required')
        return
      }
      
      try {
        setUploading(true)
        setError('')
        
        // Upload files
        const resultSlipUrl = await uploadFile(resultSlipFile, 'result_slip')
        let extraKycUrl = null
        if (extraKycFile) {
          extraKycUrl = await uploadFile(extraKycFile, 'extra_kyc')
        }
        
        // Save grades
        await supabase.rpc('rpc_replace_grades', {
          p_application_id: applicationId,
          p_grades: selectedGrades
        })
        
        // Update application with file URLs
        await supabase
          .from('applications_new')
          .update({
            result_slip_url: resultSlipUrl,
            extra_kyc_url: extraKycUrl
          })
          .eq('id', applicationId)
        
        setCurrentStep(3)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setUploading(false)
      }
      
      return
    }
    
    if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const submitApplication = async (data: WizardFormData) => {
    if (!popFile) {
      setError('Proof of payment is required')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Upload POP
      const popUrl = await uploadFile(popFile, 'proof_of_payment')
      
      // Update application with payment info and submit
      await supabase
        .from('applications_new')
        .update({
          payment_method: data.payment_method,
          payer_name: data.payer_name,
          payer_phone: data.payer_phone,
          amount: data.amount,
          paid_at: data.paid_at,
          momo_ref: data.momo_ref,
          pop_url: popUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', applicationId)
      
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
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

  const getPaymentTarget = () => {
    if (!selectedProgram) return ''
    const isKATC = ['Clinical Medicine', 'Environmental Health'].includes(selectedProgram)
    return isKATC ? 'KATC MTN 0966 992 299' : 'MIHAS MTN 0961 515 151'
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
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-900">
                  {step === 1 && 'Basic KYC'}
                  {step === 2 && 'Education'}
                  {step === 3 && 'Payment'}
                  {step === 4 && 'Review & Submit'}
                </div>
                {step < 4 && <div className="flex-1 h-0.5 bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(submitApplication)} className="space-y-8">
          {/* Step 1: Basic KYC */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Basic KYC Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
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
                  <Input
                    {...register('guardian_name')}
                    label="Guardian Name (Optional)"
                    error={errors.guardian_name?.message}
                  />
                </div>
                
                <div>
                  <Input
                    {...register('guardian_phone')}
                    label="Guardian Phone (Optional)"
                    error={errors.guardian_phone?.message}
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

          {/* Step 2: Education */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Education & Documents
              </h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-900">
                      Grade 12 Subjects (Minimum 6 required)
                    </h3>
                    <Button type="button" onClick={addGrade} disabled={selectedGrades.length >= 10}>
                      Add Subject
                    </Button>
                  </div>
                  
                  {selectedGrades.map((grade, index) => (
                    <div key={index} className="flex items-center space-x-4 mb-3">
                      <select
                        value={grade.subject_id}
                        onChange={(e) => updateGrade(index, 'subject_id', e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={grade.grade}
                        onChange={(e) => updateGrade(index, 'grade', parseInt(e.target.value))}
                        className="w-20 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {[1,2,3,4,5,6,7,8,9].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeGrade(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Result Slip <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setResultSlipFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extra KYC Documents (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setExtraKycFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Payment Information
              </h2>
              
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-md font-medium text-yellow-800 mb-2">
                    Payment Instructions
                  </h3>
                  <p className="text-sm text-yellow-700 mb-2">
                    <strong>Application Fee:</strong> K150.00
                  </p>
                  <p className="text-sm text-yellow-700">
                    <strong>Pay to:</strong> {getPaymentTarget()}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Input
                      {...register('payment_method')}
                      label="Payment Method"
                      placeholder="e.g., MTN Mobile Money"
                    />
                  </div>
                  
                  <div>
                    <Input
                      {...register('payer_name')}
                      label="Payer Name"
                      placeholder="Name of person who made payment"
                    />
                  </div>
                  
                  <div>
                    <Input
                      {...register('payer_phone')}
                      label="Payer Phone"
                      placeholder="Phone number used for payment"
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="number"
                      {...register('amount', { valueAsNumber: true })}
                      label="Amount Paid"
                      defaultValue={150}
                      min={150}
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="datetime-local"
                      {...register('paid_at')}
                      label="Payment Date & Time"
                    />
                  </div>
                  
                  <div>
                    <Input
                      {...register('momo_ref')}
                      label="Mobile Money Reference (Optional)"
                      placeholder="Transaction reference number"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof of Payment <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPopFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 4: Review & Submit
              </h2>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  Please review all your information before submitting. Once submitted, you cannot make changes.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Application Summary</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Name:</strong> {watch('full_name')}</p>
                    <p><strong>Program:</strong> {watch('program')}</p>
                    <p><strong>Intake:</strong> {watch('intake')}</p>
                    <p><strong>Subjects:</strong> {selectedGrades.length} subjects selected</p>
                    <p><strong>Documents:</strong> {resultSlipFile ? '✓' : '✗'} Result slip, {extraKycFile ? '✓' : '✗'} Extra KYC</p>
                    <p><strong>Payment:</strong> {popFile ? '✓' : '✗'} Proof of payment uploaded</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input type="checkbox" id="confirm" className="mr-2" required />
                  <label htmlFor="confirm" className="text-sm text-gray-700">
                    I confirm that all information provided is accurate and complete.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            
            <div>
              {currentStep < 4 ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  loading={loading || uploading}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
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