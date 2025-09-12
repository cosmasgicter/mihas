import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthenticatedNavigation } from '@/components/ui/AuthenticatedNavigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { ArrowLeft, Upload, X, FileText, CheckCircle, ArrowRight, CreditCard, Phone, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DEFAULT_PROGRAMS, DEFAULT_INTAKES, applicationSchema, ApplicationFormData, UploadedFile } from '@/forms/applicationSchema'

interface StepValidation {
  isValid: boolean
  errors: string[]
}

export default function ApplicationForm() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepValidations, setStepValidations] = useState<{[key: number]: StepValidation}>({})
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const totalSteps = 11

  const stepTitles = [
    'Program Selection',
    'Personal Information', 
    'Guardian Information',
    'Health & Legal',
    'Professional Info',
    'Education',
    'Motivation',
    'Skills & References',
    'Financial Info',
    'Payment',
    'Review & Submit'
  ]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    mode: 'onChange'
  })

  const selectedProgramId = watch('program_id')
  const selectedProgram = programs.find(p => p.id === selectedProgramId)
  const paymentMethod = watch('payment_method')
  const criminalRecord = watch('criminal_record')

  useEffect(() => {
    loadPrograms()
    loadDraft()
    
    // Auto-save draft every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (currentStep > 1) {
        saveDraft()
      }
    }, 30000)
    
    return () => clearInterval(autoSaveInterval)
  }, [])

  useEffect(() => {
    if (selectedProgramId) {
      loadIntakes(selectedProgramId)
    }
  }, [selectedProgramId])

  const validateCurrentStep = useCallback(async () => {
    const stepFields = getStepFields(currentStep)
    const isValid = await trigger(stepFields)
    const stepErrors = stepFields
      .filter(field => errors[field])
      .map(field => errors[field]?.message || `${field} is required`)

    setStepValidations(prev => ({
      ...prev,
      [currentStep]: { isValid, errors: stepErrors }
    }))
  }, [currentStep, errors, trigger])

  useEffect(() => {
    validateCurrentStep()
  }, [validateCurrentStep])

  const loadPrograms = async () => {
    try {
      setProgramsLoading(true)
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      if (data && data.length > 0) {
        const filteredPrograms = data.filter(program => 
          program.name.includes('Clinical Medicine') ||
          program.name.includes('Environmental Health') ||
          program.name.includes('Nursing')
        )
        setPrograms(filteredPrograms.length > 0 ? filteredPrograms : DEFAULT_PROGRAMS)
      } else {
        setPrograms(DEFAULT_PROGRAMS)
      }
    } catch (error: any) {
      console.error('Error loading programs:', error)
      setPrograms(DEFAULT_PROGRAMS)
      setError('Failed to load programs')
    } finally {
      setProgramsLoading(false)
    }
  }

  const loadIntakes = async (programId: string) => {
    try {
      setIntakes(DEFAULT_INTAKES)
    } catch (error: any) {
      console.error('Error loading intakes:', error)
      setIntakes(DEFAULT_INTAKES)
    }
  }

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('applicationDraft')
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft)
        
        // Restore form data
        Object.keys(draftData).forEach(key => {
          if (key !== 'currentStep' && key !== 'savedAt' && key !== 'uploadedFiles') {
            setValue(key as keyof ApplicationFormData, draftData[key])
          }
        })
        
        // Restore current step
        if (draftData.currentStep) {
          setCurrentStep(draftData.currentStep)
        }
        
        // Restore uploaded files
        if (draftData.uploadedFiles) {
          setUploadedFiles(draftData.uploadedFiles)
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      localStorage.removeItem('applicationDraft')
    }
  }

  const getStepFields = (step: number): (keyof ApplicationFormData)[] => {
    switch (step) {
      case 1: return ['program_id', 'intake_id']
      case 2: return ['date_of_birth', 'gender', 'marital_status', 'nationality', 'province', 'district', 'physical_address']
      case 3: return [] // Guardian info is optional
      case 4: return ['criminal_record']
      case 5: return ['employment_status']
      case 6: return ['previous_education', 'grades_or_gpa']
      case 7: return ['motivation_letter', 'career_goals']
      case 8: return ['english_proficiency', 'computer_skills', 'references']
      case 9: return ['financial_sponsor']
      case 10: return ['payment_method']
      case 11: return ['declaration', 'information_accuracy', 'professional_conduct']
      default: return []
    }
  }

  const canProceedToNextStep = () => {
    const stepFields = getStepFields(currentStep)
    
    for (const field of stepFields) {
      const value = watch(field)
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return false
      }
    }
    
    if (currentStep === 1) return watch('program_id') && watch('intake_id')
    if (currentStep === 10) {
      const paymentMethod = watch('payment_method')
      if (!paymentMethod) return false
      if (paymentMethod === 'pay_now') {
        return watch('payment_reference') && uploadedFiles.some(f => f.name.toLowerCase().includes('payment'))
      }
      return true
    }
    
    return true
  }

  const nextStep = async () => {
    await validateCurrentStep()
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    // Only allow going to previous steps or current step
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }

  const getPaymentNumber = () => {
    if (!selectedProgram) return ''
    
    // KATC programs
    if (selectedProgram.name.includes('Clinical Medicine') || selectedProgram.name.includes('Environmental Health')) {
      return '0966992299'
    }
    // MIHAS programs  
    if (selectedProgram.name.includes('Nursing')) {
      return '0961515151'
    }
    return '0966992299' // Default
  }

  const getInstitution = () => {
    if (!selectedProgram) return ''
    
    if (selectedProgram.name.includes('Clinical Medicine') || selectedProgram.name.includes('Environmental Health')) {
      return 'KATC'
    }
    if (selectedProgram.name.includes('Nursing')) {
      return 'MIHAS'
    }
    return 'KATC'
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File is too large. Maximum size is 10MB.`)
        continue
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError(`File type not supported. Please upload JPG, PNG, or PDF files.`)
        continue
      }

      const fileId = `${file.name}-${Date.now()}`
      setUploadingFiles(prev => [...prev, fileId])
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      let progressInterval: NodeJS.Timeout | null = null

      try {
        const fileName = `${user?.id}/${Date.now()}-${file.name}`
        
        // Simulate progress with optimized intervals
        let currentProgress = 0
        const updateProgress = () => {
          currentProgress += 15
          if (currentProgress >= 90) {
            setUploadProgress(prev => ({ ...prev, [fileId]: 90 }))
            return
          }
          setUploadProgress(prev => ({ ...prev, [fileId]: currentProgress }))
          setTimeout(updateProgress, 200)
        }
        updateProgress()
        
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file)

        if (progressInterval) clearInterval(progressInterval)
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('application-documents')
          .getPublicUrl(fileName)

        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl
        }

        setUploadedFiles(prev => [...prev, newFile])
        
        setTimeout(() => {
          setUploadProgress(prev => {
            const { [fileId]: removed, ...rest } = prev
            return rest
          })
          setUploadingFiles(prev => prev.filter(id => id !== fileId))
        }, 1000)
      } catch (error: any) {
        console.error('Error uploading file:', error)
        setError(`Failed to upload ${file.name}: ${error.message || 'Upload failed'}`)
        if (progressInterval) {
          clearInterval(progressInterval)
        }
        setUploadProgress(prev => {
          const { [fileId]: removed, ...rest } = prev
          return rest
        })
        setUploadingFiles(prev => prev.filter(id => id !== fileId))
      }
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const saveDraft = async () => {
    try {
      setIsDraftSaving(true)
      const formData = getValues()
      
      // Save to localStorage with timestamp and current step
      const draftData = {
        ...formData,
        currentStep,
        savedAt: new Date().toISOString(),
        uploadedFiles
      }
      localStorage.setItem('applicationDraft', JSON.stringify(draftData))
      
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (error: any) {
      console.error('Error saving draft:', error)
      setError('Failed to save draft')
    } finally {
      setIsDraftSaving(false)
    }
  }

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      setLoading(true)
      setError('')

      const applicationNumber = `MIHAS${Date.now().toString().slice(-6)}`
      const trackingCode = `MIHAS${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          application_number: applicationNumber,
          public_tracking_code: trackingCode,
          user_id: user?.id,
          program_id: data.program_id,
          intake_id: data.intake_id,
          nrc_number: data.nrc_number || null,
          passport_number: data.passport_number || null,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          marital_status: data.marital_status,
          nationality: data.nationality,
          province: data.province,
          district: data.district,
          postal_address: data.postal_address || null,
          physical_address: data.physical_address,
          guardian_name: data.guardian_name || null,
          guardian_phone: data.guardian_phone || null,
          guardian_relationship: data.guardian_relationship || null,
          medical_conditions: data.medical_conditions || null,
          disabilities: data.disabilities || null,
          criminal_record: data.criminal_record || false,
          criminal_record_details: data.criminal_record_details || null,
          professional_registration_number: data.professional_registration_number || null,
          professional_body: data.professional_body || null,
          employment_status: data.employment_status,
          employer_name: data.employer_name || null,
          employer_address: data.employer_address || null,
          years_of_experience: data.years_of_experience || 0,
          previous_education: data.previous_education,
          grades_or_gpa: data.grades_or_gpa,
          motivation_letter: data.motivation_letter,
          career_goals: data.career_goals,
          english_proficiency: data.english_proficiency,
          computer_skills: data.computer_skills,
          references: data.references,
          financial_sponsor: data.financial_sponsor,
          sponsor_relationship: data.sponsor_relationship || null,
          additional_info: data.additional_info || null,
          payment_amount: 150,
          payment_status: data.payment_method === 'pay_now' ? 'pending' : 'deferred',
          payment_reference: data.payment_reference || null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (applicationError) throw applicationError

      if (uploadedFiles.length > 0) {
        const documentInserts = uploadedFiles.map(file => ({
          application_id: application.id,
          document_type: file.name.toLowerCase().includes('payment') ? 'payment_proof' : 'supporting_document',
          document_name: file.name,
          file_name: file.name,
          file_path: file.url || '',
          file_size: file.size,
          mime_type: file.type,
          uploader_id: user?.id
        }))

        const { error: documentsError } = await supabase
          .from('documents')
          .insert(documentInserts)

        if (documentsError) {
          console.error('Error saving document records:', documentsError)
        }
      }

      // Clear draft
      localStorage.removeItem('applicationDraft')
      setSuccess(true)
    } catch (error: any) {
      console.error('Error submitting application:', error)
      setError(error.message || 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-secondary mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-secondary mb-6">
              Your application has been received and will be reviewed by our admissions team.
            </p>
            <div className="space-y-3">
              <Link to="/student/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/track-application">
                <Button variant="outline" className="w-full">
                  Track Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthenticatedNavigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-primary hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Application Form
          </h1>
          <p className="text-secondary">
            Complete your application for admission to our programs
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">
              Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
            </h2>
            <div className="flex items-center space-x-4">
              {draftSaved && (
                <span className="text-sm text-green-600 flex items-center animate-pulse">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Draft saved automatically
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveDraft}
                loading={isDraftSaving}
                className="hover:bg-primary/10"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              {localStorage.getItem('applicationDraft') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('applicationDraft')
                    window.location.reload()
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  Clear Draft
                </Button>
              )}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center overflow-x-auto">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1
              const isActive = stepNumber === currentStep
              const isCompleted = stepNumber < currentStep
              const canAccess = stepNumber <= currentStep
              
              return (
                <div 
                  key={index} 
                  className={`flex flex-col items-center cursor-pointer min-w-0 flex-1 ${
                    canAccess ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                  onClick={() => canAccess && goToStep(stepNumber)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <span className={`text-xs mt-1 text-center ${
                    isActive ? 'text-primary font-medium' : 'text-gray-500'
                  }`}>
                    {title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Program Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Program Selection
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Program <span className="text-red-500">*</span>
                  </label>
                  {programsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {programs.map((program) => (
                        <label 
                          key={program.id}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            selectedProgramId === program.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            {...register('program_id')}
                            value={program.id}
                            className="sr-only"
                          />
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedProgramId === program.id 
                                ? 'border-primary bg-primary' 
                                : 'border-gray-300'
                            }`}>
                              {selectedProgramId === program.id && (
                                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-secondary">{program.name}</p>
                              <p className="text-sm text-secondary">{program.description}</p>
                              <p className="text-xs text-gray-500">Duration: {program.duration_years} years</p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {errors.program_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.program_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Intake <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {intakes.map((intake) => (
                      <label 
                        key={intake.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          watch('intake_id') === intake.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('intake_id')}
                          value={intake.id}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            watch('intake_id') === intake.id 
                              ? 'border-primary bg-primary' 
                              : 'border-gray-300'
                          }`}>
                            {watch('intake_id') === intake.id && (
                              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-secondary">{intake.name}</p>
                            <p className="text-sm text-secondary">{intake.semester}</p>
                            <p className="text-xs text-gray-500">
                              Deadline: {new Date(intake.application_deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.intake_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.intake_id.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('date_of_birth')}
                  type="date"
                  label="Date of Birth"
                  required
                  error={errors.date_of_birth?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('gender')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Marital Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('marital_status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                  {errors.marital_status && (
                    <p className="mt-1 text-sm text-red-600">{errors.marital_status.message}</p>
                  )}
                </div>

                <Input
                  {...register('nationality')}
                  label="Nationality"
                  required
                  defaultValue="Zambian"
                  error={errors.nationality?.message}
                />

                <Input
                  {...register('province')}
                  label="Province"
                  required
                  error={errors.province?.message}
                />

                <Input
                  {...register('district')}
                  label="District"
                  required
                  error={errors.district?.message}
                />

                <Input
                  {...register('nrc_number')}
                  label="NRC Number"
                  placeholder="e.g., 123456/78/9"
                  error={errors.nrc_number?.message}
                />

                <Input
                  {...register('passport_number')}
                  label="Passport Number (if applicable)"
                  error={errors.passport_number?.message}
                />
              </div>

              <div className="mt-6">
                <Input
                  {...register('postal_address')}
                  label="Postal Address"
                  error={errors.postal_address?.message}
                />
              </div>

              <div className="mt-6">
                <TextArea
                  {...register('physical_address')}
                  label="Physical Address"
                  required
                  rows={3}
                  error={errors.physical_address?.message}
                />
              </div>
            </div>
          )}

          {/* Step 3: Guardian Information */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Guardian/Next of Kin Information
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This information is optional but recommended for emergency contact purposes.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('guardian_name')}
                  label="Guardian/Next of Kin Name"
                  error={errors.guardian_name?.message}
                />

                <Input
                  {...register('guardian_phone')}
                  label="Guardian Phone Number"
                  error={errors.guardian_phone?.message}
                />

                <Input
                  {...register('guardian_relationship')}
                  label="Relationship"
                  placeholder="e.g., Parent, Spouse, Sibling"
                  error={errors.guardian_relationship?.message}
                />
              </div>
            </div>
          )}

          {/* Step 4: Health & Legal */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Health & Legal Information
              </h2>
              
              <div className="space-y-6">
                <TextArea
                  {...register('medical_conditions')}
                  label="Medical Conditions"
                  placeholder="Please list any medical conditions or write 'None' if not applicable"
                  rows={3}
                  error={errors.medical_conditions?.message}
                />

                <TextArea
                  {...register('disabilities')}
                  label="Disabilities or Special Needs"
                  placeholder="Please describe any disabilities or special accommodations needed, or write 'None' if not applicable"
                  rows={3}
                  error={errors.disabilities?.message}
                />

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Criminal Record <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="criminal_record"
                        value="false"
                        onChange={(e) => setValue('criminal_record', e.target.value === 'true')}
                        checked={watch('criminal_record') === false}
                        className="mr-2"
                      />
                      No, I have no criminal record
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="criminal_record"
                        value="true"
                        onChange={(e) => setValue('criminal_record', e.target.value === 'true')}
                        checked={watch('criminal_record') === true}
                        className="mr-2"
                      />
                      Yes, I have a criminal record
                    </label>
                  </div>
                  {errors.criminal_record && (
                    <p className="mt-1 text-sm text-red-600">{errors.criminal_record.message}</p>
                  )}
                </div>

                {criminalRecord && (
                  <TextArea
                    {...register('criminal_record_details')}
                    label="Criminal Record Details"
                    placeholder="Please provide details of your criminal record"
                    rows={3}
                    error={errors.criminal_record_details?.message}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 5: Professional Information */}
          {currentStep === 5 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Professional Information
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Employment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('employment_status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Employment Status</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Employed">Employed</option>
                    <option value="Self-employed">Self-employed</option>
                    <option value="Student">Student</option>
                  </select>
                  {errors.employment_status && (
                    <p className="mt-1 text-sm text-red-600">{errors.employment_status.message}</p>
                  )}
                </div>

                {(watch('employment_status') === 'Employed' || watch('employment_status') === 'Self-employed') && (
                  <>
                    <Input
                      {...register('employer_name')}
                      label="Employer/Company Name"
                      error={errors.employer_name?.message}
                    />

                    <TextArea
                      {...register('employer_address')}
                      label="Employer Address"
                      rows={2}
                      error={errors.employer_address?.message}
                    />

                    <Input
                      {...register('years_of_experience', { valueAsNumber: true })}
                      type="number"
                      label="Years of Experience"
                      min="0"
                      error={errors.years_of_experience?.message}
                    />
                  </>
                )}

                <Input
                  {...register('professional_registration_number')}
                  label="Professional Registration Number (if applicable)"
                  placeholder="e.g., NMCZ, HPCZ registration number"
                  error={errors.professional_registration_number?.message}
                />

                <Input
                  {...register('professional_body')}
                  label="Professional Body"
                  placeholder="e.g., NMCZ, HPCZ, ECZ"
                  error={errors.professional_body?.message}
                />
              </div>
            </div>
          )}

          {/* Step 6: Education */}
          {currentStep === 6 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Educational Background
              </h2>
              
              <div className="space-y-6">
                <TextArea
                  {...register('previous_education')}
                  label="Previous Education"
                  required
                  placeholder="Describe your educational background including schools attended, qualifications obtained, etc."
                  rows={4}
                  error={errors.previous_education?.message}
                />

                <Input
                  {...register('grades_or_gpa')}
                  label="Grades/GPA"
                  required
                  placeholder="e.g., Grade 12 Certificate with 6 credits, GPA 3.5"
                  error={errors.grades_or_gpa?.message}
                />
              </div>
            </div>
          )}

          {/* Step 7: Motivation */}
          {currentStep === 7 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Motivation & Goals
              </h2>
              
              <div className="space-y-6">
                <TextArea
                  {...register('motivation_letter')}
                  label="Motivation Letter"
                  required
                  placeholder="Why do you want to study this program? What motivates you to pursue this career?"
                  rows={5}
                  error={errors.motivation_letter?.message}
                />

                <TextArea
                  {...register('career_goals')}
                  label="Career Goals"
                  required
                  placeholder="What are your career aspirations after completing this program?"
                  rows={4}
                  error={errors.career_goals?.message}
                />
              </div>
            </div>
          )}

          {/* Step 8: Skills & References */}
          {currentStep === 8 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Skills & References
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    English Proficiency <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('english_proficiency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select English Proficiency Level</option>
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Fluent">Fluent</option>
                  </select>
                  {errors.english_proficiency && (
                    <p className="mt-1 text-sm text-red-600">{errors.english_proficiency.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Computer Skills <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('computer_skills')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Computer Skills Level</option>
                    <option value="Basic">Basic</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  {errors.computer_skills && (
                    <p className="mt-1 text-sm text-red-600">{errors.computer_skills.message}</p>
                  )}
                </div>

                <TextArea
                  {...register('references')}
                  label="References"
                  required
                  placeholder="Provide at least one reference (name, position, contact information)"
                  rows={4}
                  error={errors.references?.message}
                />
              </div>
            </div>
          )}

          {/* Step 9: Financial Information */}
          {currentStep === 9 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Financial Information
              </h2>
              
              <div className="space-y-6">
                <Input
                  {...register('financial_sponsor')}
                  label="Financial Sponsor"
                  required
                  placeholder="Who will sponsor your studies? (e.g., Self, Parents, Government, Employer)"
                  error={errors.financial_sponsor?.message}
                />

                <Input
                  {...register('sponsor_relationship')}
                  label="Relationship to Sponsor"
                  placeholder="e.g., Self, Parent, Employer"
                  error={errors.sponsor_relationship?.message}
                />

                <TextArea
                  {...register('additional_info')}
                  label="Additional Information"
                  placeholder="Any additional information you would like to share"
                  rows={3}
                  error={errors.additional_info?.message}
                />
              </div>
            </div>
          )}

          {/* Step 10: Payment */}
          {currentStep === 10 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold text-secondary">
                  Application Fee Payment
                </h2>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-secondary">Application Fee: K150</p>
                    <p className="text-sm text-secondary">One-time payment for all programs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary">Institution: {getInstitution()}</p>
                    <div className="flex items-center space-x-1">
                      <Phone className="h-4 w-4 text-primary" />
                      <p className="font-mono text-primary font-bold">{getPaymentNumber()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-3">
                    Payment Option <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === 'pay_now' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        {...register('payment_method')}
                        value="pay_now"
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          paymentMethod === 'pay_now' 
                            ? 'border-primary bg-primary' 
                            : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'pay_now' && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-secondary">Pay Now</p>
                          <p className="text-sm text-secondary">Complete payment via MTN Money</p>
                        </div>
                      </div>
                    </label>

                    <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === 'pay_later' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        {...register('payment_method')}
                        value="pay_later"
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          paymentMethod === 'pay_later' 
                            ? 'border-primary bg-primary' 
                            : 'border-gray-300'
                        }`}>
                          {paymentMethod === 'pay_later' && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-secondary">Pay Later</p>
                          <p className="text-sm text-secondary">Submit application, pay before deadline</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {errors.payment_method && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                  )}
                </div>

                {paymentMethod === 'pay_now' && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-medium text-yellow-800 mb-2">Payment Instructions:</h3>
                      <ol className="text-sm text-yellow-700 space-y-1">
                        <li>1. Send K150 to MTN Money number: <strong>{getPaymentNumber()}</strong></li>
                        <li>2. Take a screenshot of the transaction confirmation</li>
                        <li>3. Upload the screenshot as payment proof below</li>
                        <li>4. Enter the transaction reference number</li>
                      </ol>
                    </div>

                    <Input
                      {...register('payment_reference')}
                      label="Transaction Reference Number"
                      placeholder="Enter MTN Money transaction ID"
                      error={errors.payment_reference?.message}
                    />

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-2">
                        Payment Proof Screenshot
                      </label>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 cursor-pointer transition-colors">
                          <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                          <p className="text-sm text-secondary">
                            Upload payment screenshot
                          </p>
                          <p className="text-xs text-secondary">
                            JPG, JPEG, PNG up to 10MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Supporting Documents
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload any supporting documents (certificates, transcripts, etc.)
                  </p>
                  
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-secondary">
                        Click to upload documents
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG, PDF up to 10MB each
                      </p>
                    </div>
                  </label>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-secondary">{file.name.replace(/[<>"'&]/g, '')}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="mt-4 space-y-2">
                      {Object.entries(uploadProgress).map(([fileId, progress]) => (
                        <div key={fileId} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-secondary">Uploading...</span>
                            <span className="text-sm text-secondary">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Review & Submit */}
          {currentStep === 11 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Review & Submit
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Declaration</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Please read and accept the following declarations before submitting your application:
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('declaration')}
                        className="mt-1"
                      />
                      <span className="text-sm text-blue-700">
                        I declare that all information provided in this application is true and accurate to the best of my knowledge.
                      </span>
                    </label>
                    {errors.declaration && (
                      <p className="text-sm text-red-600">{errors.declaration.message}</p>
                    )}

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('information_accuracy')}
                        className="mt-1"
                      />
                      <span className="text-sm text-blue-700">
                        I understand that providing false information may result in the rejection of my application or cancellation of admission.
                      </span>
                    </label>
                    {errors.information_accuracy && (
                      <p className="text-sm text-red-600">{errors.information_accuracy.message}</p>
                    )}

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register('professional_conduct')}
                        className="mt-1"
                      />
                      <span className="text-sm text-blue-700">
                        I agree to abide by the professional conduct standards and regulations of the institution and relevant professional bodies.
                      </span>
                    </label>
                    {errors.professional_conduct && (
                      <p className="text-sm text-red-600">{errors.professional_conduct.message}</p>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">Application Summary</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Program:</strong> {selectedProgram?.name}</p>
                    <p><strong>Intake:</strong> {intakes.find(i => i.id === watch('intake_id'))?.name}</p>
                    <p><strong>Payment Method:</strong> {paymentMethod === 'pay_now' ? 'Pay Now' : 'Pay Later'}</p>
                    <p><strong>Documents Uploaded:</strong> {uploadedFiles.length} files</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {currentStep < totalSteps ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                  className={`${!canProceedToNextStep() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  loading={loading}
                  disabled={!canProceedToNextStep()}
                  className={`${!canProceedToNextStep() ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  Submit Application
                </Button>
              )}
              {!canProceedToNextStep() && (
                <p className="text-sm text-red-600 flex items-center">
                  Please complete all required fields to continue
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}