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
import { checkEligibility, getRecommendedSubjects } from '@/lib/eligibility'
import { ArrowLeft, CheckCircle, ArrowRight, X, Sparkles, FileText, CreditCard, Send, XCircle, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const wizardSchema = z.object({
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
  
  const [subjects, setSubjects] = useState<Grade12Subject[]>([])
  const [selectedGrades, setSelectedGrades] = useState<SubjectGrade[]>([])
  const [resultSlipFile, setResultSlipFile] = useState<File | null>(null)
  const [extraKycFile, setExtraKycFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [uploadedFiles, setUploadedFiles] = useState<{[key: string]: boolean}>({})
  const [popFile, setPopFile] = useState<File | null>(null)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [sessionWarning, setSessionWarning] = useState<any>(null)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { amount: 150 }
  })

  const selectedProgram = watch('program')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-wizard')
    }
  }, [user, authLoading, navigate])

  // Auto-populate form with user data
  useEffect(() => {
    if (user) {
      setValue('email', user.email || '')
      
      // Auto-populate from user metadata if available
      const metadata = user.user_metadata
      if (metadata) {
        if (metadata.full_name) setValue('full_name', metadata.full_name)
        if (metadata.sex) setValue('sex', metadata.sex)
        
        // Also check signup_data for additional fields
        if (metadata.signup_data) {
          try {
            const signupData = JSON.parse(metadata.signup_data)
            if (signupData.phone) setValue('phone', signupData.phone)
            if (signupData.date_of_birth) setValue('date_of_birth', signupData.date_of_birth)
            // nationality field not in schema, skipping
            if (signupData.city) setValue('residence_town', signupData.city)
          } catch (e) {
            console.log('Could not parse signup data')
          }
        }
      }
    }
  }, [user, setValue])

  // Load saved application draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('applicationWizardDraft')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        if (draft.formData) {
          Object.keys(draft.formData).forEach(key => {
            setValue(key as keyof WizardFormData, draft.formData[key])
          })
        }
        if (draft.selectedGrades) {
          setSelectedGrades(draft.selectedGrades)
        }
        if (draft.currentStep) {
          setCurrentStep(draft.currentStep)
        }
        if (draft.applicationId) {
          setApplicationId(draft.applicationId)
        }
      } catch (error) {
        console.error('Error loading draft:', error)
        localStorage.removeItem('applicationWizardDraft')
      }
    }
  }, [])

  // Save draft on form changes
  // Auto-save on form changes with debouncing
  useEffect(() => {
    const subscription = watch(() => {
      if (currentStep > 1) {
        const timeoutId = setTimeout(() => {
          saveDraft()
        }, 2000)
        return () => clearTimeout(timeoutId)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, currentStep])

  const saveDraft = async () => {
    if (!user || isDraftSaving) return
    try {
      setIsDraftSaving(true)
      const formData = watch()
      const draft = {
        formData,
        selectedGrades,
        currentStep,
        applicationId,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem('applicationWizardDraft', JSON.stringify(draft))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsDraftSaving(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

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

  // Get eligibility check with enhanced subject data
  const eligibilityCheck = selectedProgram ? checkEligibility(
    selectedProgram, 
    selectedGrades.map(g => {
      const subject = subjects.find(s => s.id === g.subject_id)
      return {
        subject_id: g.subject_id,
        subject_name: subject?.name || '',
        grade: g.grade
      }
    })
  ) : null

  const recommendedSubjects = selectedProgram ? getRecommendedSubjects(selectedProgram) : []

  const getUsedSubjects = () => {
    return selectedGrades.map(g => g.subject_id).filter(Boolean)
  }

  const removeGrade = (index: number) => {
    setSelectedGrades(selectedGrades.filter((_, i) => i !== index))
  }

  const updateGrade = (index: number, field: keyof SubjectGrade, value: string | number) => {
    const updated = [...selectedGrades]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedGrades(updated)
  }

  const uploadFileWithProgress = async (file: File, path: string): Promise<string> => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB')
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF, JPG, JPEG, and PNG files are allowed')
    }

    const fileName = `${user?.id}/${applicationId}/${path}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[path] || 0
        if (current < 90) {
          return { ...prev, [path]: current + 10 }
        }
        return prev
      })
    }, 200)
    
    try {
      // Use app_docs bucket instead of application-documents
      const { error: uploadError } = await supabase.storage
        .from('app_docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setUploadProgress(prev => ({ ...prev, [path]: 100 }))
      
      const { data: { publicUrl } } = supabase.storage
        .from('app_docs')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[path]
          return newProgress
        })
      }, 2000)
    }
  }

  const nextStep = async () => {
    saveDraft() // Auto-save when moving to next step
    if (currentStep === 1) {
      // Validate form first
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
        
        // Generate application number and tracking code
        const applicationNumber = `APP${Date.now().toString().slice(-8)}`
        const trackingCode = `TRK${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        
        // Determine institution based on program
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
            guardian_name: formData.guardian_name || null,
            guardian_phone: formData.guardian_phone || null,
            program: formData.program,
            intake: formData.intake,
            institution: institution,
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
      return
    }
    
    if (currentStep === 2) {
      if (selectedGrades.length < 5) {
        setError('Minimum 5 subjects required')
        return
      }
      
      // Check eligibility (advisory only, don't block)
      if (selectedProgram && eligibilityCheck && !eligibilityCheck.eligible) {
        // Show warning but allow to continue
        console.log('Eligibility advisory:', eligibilityCheck.message)
      }
      
      if (!resultSlipFile) {
        setError('Result slip is required')
        return
      }
      
      try {
        setUploading(true)
        setError('')
        
        setUploadProgress({ result_slip: 0 })
        const resultSlipUrl = await uploadFileWithProgress(resultSlipFile, 'result_slip')
        setUploadedFiles(prev => ({ ...prev, result_slip: true }))
        
        let extraKycUrl = null
        if (extraKycFile) {
          setUploadProgress(prev => ({ ...prev, extra_kyc: 0 }))
          extraKycUrl = await uploadFileWithProgress(extraKycFile, 'extra_kyc')
          setUploadedFiles(prev => ({ ...prev, extra_kyc: true }))
        }
        
        // Save grades with duplicate prevention
        for (const grade of selectedGrades) {
          if (grade.subject_id) {
            const { error: gradeError } = await supabase
              .from('application_grades')
              .insert({
                application_id: applicationId,
                subject_id: grade.subject_id,
                grade: grade.grade
              })
            if (gradeError && !gradeError.message.includes('duplicate')) {
              throw gradeError
            }
          }
        }
        
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
      saveDraft() // Auto-save when moving to previous step
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
      
      setUploadProgress({ proof_of_payment: 0 })
      const popUrl = await uploadFileWithProgress(popFile, 'proof_of_payment')
      setUploadedFiles(prev => ({ ...prev, proof_of_payment: true }))
      
      const { error: updateError } = await supabase
        .from('applications_new')
        .update({
          payment_method: data.payment_method || null,
          payer_name: data.payer_name || null,
          payer_phone: data.payer_phone || null,
          amount: data.amount || 150,
          paid_at: data.paid_at ? new Date(data.paid_at).toISOString() : null,
          momo_ref: data.momo_ref || null,
          pop_url: popUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', applicationId)
      
      if (updateError) throw updateError
      
      // Clear saved draft on successful submission
      localStorage.removeItem('applicationWizardDraft')
      setSuccess(true)
    } catch (err: any) {
      const sanitizedMessage = err instanceof Error ? err.message.replace(/[\r\n\t]/g, ' ') : 'Unknown error'
      console.error('Submission error:', sanitizedMessage)
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
          <motion.div 
            className="bg-white rounded-lg shadow p-8 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application has been submitted and is now under review.
            </p>
            <Link to="/student/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </motion.div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Student Application
            </h1>
            <p className="text-gray-600">
              Complete the 4-step application process
            </p>
            {user && (
              <div className="mt-2 text-sm text-gray-600">
                Logged in as: {user.email}
              </div>
            )}
          </motion.div>
        </div>

        {/* Progress Steps with Save Status */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Step {currentStep} of 4: {['Basic KYC', 'Education', 'Payment', 'Submit'][currentStep - 1]}
            </h2>
            <div className="flex items-center space-x-4">
              {isDraftSaving && (
                <motion.div 
                  className="flex items-center space-x-2 text-sm text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Saving...</span>
                </motion.div>
              )}
              {draftSaved && (
                <motion.div 
                  className="flex items-center space-x-2 text-sm text-green-600"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved</span>
                </motion.div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveDraft}
                disabled={isDraftSaving}
                className="hover:bg-blue-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center justify-between relative overflow-x-auto pb-2 sm:pb-0">
              {[
                { num: 1, title: 'Basic KYC', icon: FileText },
                { num: 2, title: 'Education', icon: Sparkles },
                { num: 3, title: 'Payment', icon: CreditCard },
                { num: 4, title: 'Submit', icon: Send }
              ].map((step) => {
                const Icon = step.icon
                const isActive = step.num <= currentStep
                const isCompleted = step.num < currentStep
                
                return (
                  <motion.div 
                    key={step.num} 
                    className="flex flex-col items-center bg-gray-50 relative min-w-0 flex-shrink-0 px-2 sm:px-0"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: step.num * 0.1 }}
                  >
                    <motion.div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-green-500 border-green-500 text-white shadow-lg' 
                          : isActive 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' 
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </motion.div>
                    <div className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {error && (
          <motion.div 
            className="rounded-md bg-red-50 p-4 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm text-red-700">{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(submitApplication)} className="space-y-6 lg:space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic KYC */}
            {currentStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-100"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Step 1: Basic KYC Information
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
                  <motion.div 
                    className="mt-4 p-4 bg-blue-50 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <p className="text-sm text-blue-800">
                      <strong>Institution:</strong> {['Clinical Medicine', 'Environmental Health'].includes(selectedProgram) ? 'KATC' : 'MIHAS'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2: Education */}
            {currentStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-100"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Step 2: Education & Documents
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                      <h3 className="text-md font-medium text-gray-900">
                        Grade 12 Subjects (Minimum 5 required)
                      </h3>
                      <Button 
                        type="button" 
                        onClick={addGrade} 
                        disabled={selectedGrades.length >= 10}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                      >
                        + Add New Subject
                      </Button>
                    </div>
                    
                    {/* Eligibility Status */}
                    {eligibilityCheck && selectedGrades.length >= 5 && (
                      <motion.div 
                        className={`mb-4 p-4 rounded-lg border ${
                          eligibilityCheck.eligible 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center mb-2">
                          {eligibilityCheck.eligible ? (
                            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                          )}
                          <span className={`font-medium ${
                            eligibilityCheck.eligible ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {eligibilityCheck.eligible ? '✓ Meets Basic Requirements for ' + selectedProgram : '⚠ Advisory for ' + selectedProgram}
                          </span>
                          {eligibilityCheck.score && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Score: {eligibilityCheck.score}%
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${
                          eligibilityCheck.eligible ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          {eligibilityCheck.message}
                        </p>
                        {!eligibilityCheck.eligible && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs text-blue-800 font-medium">
                              ℹ️ You can still proceed with your application. Please consult with the institution for guidance on requirements.
                            </p>
                          </div>
                        )}
                        {eligibilityCheck.recommendations && eligibilityCheck.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {eligibilityCheck.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="mr-1">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                    
                    {/* Recommended Subjects */}
                    {selectedProgram && recommendedSubjects.length > 0 && (
                      <motion.div 
                        className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Recommended subjects for {selectedProgram}:
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {recommendedSubjects.map((subject, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {subject}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    
                    {selectedGrades.length > 0 && (
                      <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <div className="col-span-8">Subject</div>
                        <div className="col-span-2">Grade</div>
                        <div className="col-span-2">Action</div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {selectedGrades.map((grade, index) => (
                        <motion.div 
                          key={index} 
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1 sm:hidden">
                              Subject
                            </label>
                            <select
                              value={grade.subject_id}
                              onChange={(e) => updateGrade(index, 'subject_id', e.target.value)}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select subject</option>
                              {subjects.map((subject) => {
                                const isUsed = getUsedSubjects().includes(subject.id) && grade.subject_id !== subject.id
                                return (
                                  <option key={subject.id} value={subject.id} disabled={isUsed}>
                                    {subject.name} {isUsed ? '(Already selected)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                          
                          <div className="w-full sm:w-24">
                            <label className="block text-xs font-medium text-gray-700 mb-1 sm:hidden">
                              Grade
                            </label>
                            <select
                              value={grade.grade}
                              onChange={(e) => updateGrade(index, 'grade', parseInt(e.target.value))}
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {[1,2,3,4,5,6,7,8,9].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="w-full sm:w-auto">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeGrade(index)}
                              className="w-full sm:w-auto"
                            >
                              <X className="h-4 w-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Remove</span>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Result Slip <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setResultSlipFile(e.target.files?.[0] || null)}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {resultSlipFile && (
                          <div className="mt-2 flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {resultSlipFile.name}
                          </div>
                        )}
                        {uploadProgress.result_slip !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Uploading...</span>
                              <span>{uploadProgress.result_slip}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div 
                                className="bg-blue-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress.result_slip}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                        {uploadedFiles.result_slip && (
                          <motion.div 
                            className="mt-2 text-sm text-green-600"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            ✓ Upload complete!
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Extra KYC Documents (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setExtraKycFile(e.target.files?.[0] || null)}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {extraKycFile && (
                          <div className="mt-2 flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {extraKycFile.name}
                          </div>
                        )}
                        {uploadProgress.extra_kyc !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Uploading...</span>
                              <span>{uploadProgress.extra_kyc}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div 
                                className="bg-blue-600 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress.extra_kyc}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                        {uploadedFiles.extra_kyc && (
                          <motion.div 
                            className="mt-2 text-sm text-green-600"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            ✓ Upload complete!
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-100"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Step 3: Payment Information
                </h2>
                
                <div className="space-y-6">
                  <motion.div 
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-5 w-5 text-yellow-600 mr-2" />
                      <h3 className="text-md font-medium text-yellow-800">
                        Payment Instructions
                      </h3>
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">
                      <strong>Application Fee:</strong> K150.00
                    </p>
                    <p className="text-sm text-yellow-700">
                      <strong>Pay to:</strong> {getPaymentTarget()}
                    </p>
                  </motion.div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPopFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {popFile && (
                        <div className="mt-2 flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {popFile.name}
                        </div>
                      )}
                      {uploadProgress.proof_of_payment !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress.proof_of_payment}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div 
                              className="bg-blue-600 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress.proof_of_payment}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                      {uploadedFiles.proof_of_payment && (
                        <motion.div 
                          className="mt-2 text-sm text-green-600"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          ✓ Upload complete!
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-100"
              >
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
                      {eligibilityCheck && (
                        <div>
                          <p><strong>Eligibility:</strong> 
                            <span className={eligibilityCheck.eligible ? 'text-green-600' : 'text-yellow-600'}>
                              {eligibilityCheck.eligible ? ' ✓ Meets Requirements' : ' ⚠ Advisory Only'}
                            </span>
                            {eligibilityCheck.score && (
                              <span className="ml-2 text-blue-600">({eligibilityCheck.score}%)</span>
                            )}
                          </p>
                          {!eligibilityCheck.eligible && (
                            <p className="text-sm text-yellow-600 mt-1">{eligibilityCheck.message}</p>
                          )}
                        </div>
                      )}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="order-2 sm:order-1">
              {currentStep > 1 && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="w-full sm:w-auto"
                    disabled={loading || uploading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                </motion.div>
              )}
            </div>
            
            <div className="order-1 sm:order-2">
              {currentStep < 4 ? (
                <motion.div
                  whileHover={{ scale: loading || uploading ? 1 : 1.05 }}
                  whileTap={{ scale: loading || uploading ? 1 : 0.95 }}
                >
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    loading={loading || uploading}
                    disabled={loading || uploading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || uploading ? (
                      <>
                        Processing...
                      </>
                    ) : (
                      <>
                        Next Step
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                >
                  <Button 
                    type="submit" 
                    loading={loading}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  )
}