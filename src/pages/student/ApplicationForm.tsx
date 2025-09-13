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
import { SaveStatus } from '@/components/ui/SaveStatus'
import { ConflictResolution } from '@/components/ui/ConflictResolution'
import { SaveNotification } from '@/components/ui/SaveNotification'
import { SessionWarning } from '@/components/application/SessionWarning'
import { useIsMobile } from '@/hooks/use-mobile'
import { ArrowLeft, Upload, X, FileText, CheckCircle, ArrowRight, CreditCard, Phone, Save, AlertTriangle, Edit, Eye } from 'lucide-react'
import { useErrorHandling } from '@/hooks/useErrorHandling'
import { Link } from 'react-router-dom'
import { DEFAULT_PROGRAMS, DEFAULT_INTAKES, applicationSchema, ApplicationFormData, UploadedFile, Subject, ProfileData } from '@/forms/applicationSchema'
import { DataPopulationConfirmation } from '@/components/ui/DataPopulationConfirmation'
import { SubjectSelection } from '@/components/ui/SubjectSelection'
import { applicationSessionManager, SessionWarning as SessionWarningType } from '@/lib/applicationSession'
import { SubmissionStatus as Status, SubmissionResult } from '@/types/submission'
import { submitWithRetry, generateReferenceNumber, generateTrackingCode, validateSubmissionData, sendEmailReceipt, saveSubmissionStatus } from '@/lib/submissionUtils'
import { SubmissionStatus } from '@/components/ui/SubmissionStatus'
import { SubmissionConfirmation } from '@/components/ui/SubmissionConfirmation'
import { EligibilityChecker } from '@/components/application/EligibilityChecker'
import { EligibilityAssessment } from '@/lib/eligibilityEngine'
import { useAnalytics } from '@/hooks/useAnalytics'

interface StepValidation {
  isValid: boolean
  errors: string[]
}

interface ValidationError {
  field: string
  message: string
  step: number
  stepTitle: string
}

interface CompletionItem {
  id: string
  title: string
  completed: boolean
  required: boolean
}

export default function ApplicationForm() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const { trackFormStart, trackFormSubmit, trackDocumentUpload } = useAnalytics()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application')
    }
  }, [user, authLoading, navigate])
  
  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  
  // Don't render form if not authenticated
  if (!user) {
    return null
  }
  const [loading, setLoading] = useState(false)
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const { executeWithErrorHandling, errorState, clearError, retryLastOperation } = useErrorHandling()
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [stepValidations, setStepValidations] = useState<{[key: number]: StepValidation}>({})
  const [sessionWarning, setSessionWarning] = useState<SessionWarningType | null>(null)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | undefined>()
  const [showConflict, setShowConflict] = useState(false)
  const [conflictData, setConflictData] = useState<{ serverVersion: number; localVersion: number } | null>(null)
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  const [saveNotificationType, setSaveNotificationType] = useState<'success' | 'error' | 'info'>('success')
  const [saveNotificationMessage, setSaveNotificationMessage] = useState('')
  const [showValidationReport, setShowValidationReport] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showReviewSummary, setShowReviewSummary] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [digitalSignature, setDigitalSignature] = useState('')
  const [showDataConfirmation, setShowDataConfirmation] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [submissionStatus, setSubmissionStatus] = useState<Status | null>(null)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eligibilityAssessment, setEligibilityAssessment] = useState<EligibilityAssessment | null>(null)
  const totalSteps = 12

  const stepTitles = [
    'Program Selection',
    'Personal Information', 
    'Guardian Information',
    'Health & Legal',
    'Professional Info',
    'Education',
    'Subject Selection',
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

  // Initialize session management
  useEffect(() => {
    applicationSessionManager.initialize(
      (warning) => setSessionWarning(warning),
      () => {
        // Handle session expiry
        saveDraft()
        setSessionWarning({
          type: 'expiry',
          message: 'Your session has expired, but your progress has been saved. You can continue from where you left off.',
          timeRemaining: 0,
          canExtend: false
        })
      }
    )
    
    return () => {
      applicationSessionManager.cleanup()
    }
  }, [])

  useEffect(() => {
    loadPrograms()
    loadDraft()
  }, [])

  const loadDraft = async () => {
    if (!user) return
    
    try {
      const draft = await applicationSessionManager.loadDraft(profile?.user_id || user.id)
      if (draft) {
        // Restore form data
        Object.keys(draft.form_data).forEach(key => {
          setValue(key as keyof ApplicationFormData, draft.form_data[key])
        })
        
        // Restore current step
        setCurrentStep(draft.current_step)
        
        // Restore uploaded files
        if (draft.uploaded_files) {
          setUploadedFiles(draft.uploaded_files)
        }
        
        // Restore selected subjects
        if (draft.selected_subjects) {
          setSelectedSubjects(draft.selected_subjects)
        }
        
        console.log('Draft loaded successfully')
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const saveDraft = async () => {
    if (!user || isDraftSaving) return
    
    try {
      setIsDraftSaving(true)
      const formData = getValues()
      
      const result = await applicationSessionManager.saveDraft(
        profile?.user_id || user.id,
        formData,
        currentStep,
        uploadedFiles,
        selectedSubjects
      )
      
      if (result.success) {
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsDraftSaving(false)
    }
  }

  const handleExtendSession = async () => {
    if (!user) return
    
    try {
      await applicationSessionManager.extendSession(profile?.user_id || user.id)
    } catch (error) {
      console.error('Error extending session:', error)
    }
  }

  // Auto-populate KYC fields from user profile with confirmation
  useEffect(() => {
    if (profile && currentStep === 2) {
      const hasPopulatableData = profile.date_of_birth || profile.gender || profile.address || profile.emergency_contact_name
      
      if (hasPopulatableData && !localStorage.getItem('dataPopulationHandled')) {
        setShowDataConfirmation(true)
      }
    }
  }, [profile, currentStep])

  const handleDataPopulationConfirm = () => {
    if (profile) {
      const fieldsToPopulate = {
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        nationality: profile.nationality || profile.country || 'Zambian',
        physical_address: profile.address || '',
        postal_address: profile.address || '',
        guardian_name: profile.emergency_contact_name || '',
        guardian_phone: profile.emergency_contact_phone || '',
        guardian_relationship: profile.emergency_contact_name ? 'Emergency Contact' : ''
      }
      
      Object.entries(fieldsToPopulate).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          setValue(key as keyof ApplicationFormData, value)
        }
      })
    }
    
    localStorage.setItem('dataPopulationHandled', 'true')
    setShowDataConfirmation(false)
  }

  const handleDataPopulationEdit = () => {
    localStorage.setItem('dataPopulationHandled', 'true')
    setShowDataConfirmation(false)
  }

  const handleDataPopulationSkip = () => {
    localStorage.setItem('dataPopulationHandled', 'true')
    setShowDataConfirmation(false)
  }

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
    setProgramsLoading(true)
    
    const result = await executeWithErrorHandling(
      async () => {
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
          return filteredPrograms.length > 0 ? filteredPrograms : DEFAULT_PROGRAMS
        }
        return DEFAULT_PROGRAMS
      },
      'load_programs'
    )
    
    if (result) {
      setPrograms(result)
    } else {
      setPrograms(DEFAULT_PROGRAMS)
    }
    
    setProgramsLoading(false)
  }

  const loadIntakes = async (programId: string) => {
    try {
      setIntakes(DEFAULT_INTAKES)
    } catch (error: any) {
      console.error('Error loading intakes:', error)
      setIntakes(DEFAULT_INTAKES)
    }
  }

  // Auto-save on form changes
  useEffect(() => {
    const subscription = watch(() => {
      if (currentStep > 1) {
        const timeoutId = setTimeout(() => {
          saveDraft()
        }, 2000) // Save 2 seconds after user stops typing
        
        return () => clearTimeout(timeoutId)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [watch, currentStep])

  const getStepFields = (step: number): (keyof ApplicationFormData)[] => {
    switch (step) {
      case 1: return ['program_id', 'intake_id']
      case 2: return ['date_of_birth', 'gender', 'marital_status', 'nationality', 'province', 'district', 'physical_address']
      case 3: return [] // Guardian info is optional
      case 4: return ['criminal_record']
      case 5: return ['employment_status']
      case 6: return ['previous_education', 'grades_or_gpa']
      case 7: return [] // Subject selection validation handled separately
      case 8: return ['motivation_letter', 'career_goals']
      case 9: return ['english_proficiency', 'computer_skills', 'references']
      case 10: return ['financial_sponsor']
      case 11: return ['payment_method']
      case 12: return ['declaration', 'information_accuracy', 'professional_conduct']
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
    
    // Special validation for step 2 - require either NRC or Passport
    if (currentStep === 2) {
      const nrc = watch('nrc_number')
      const passport = watch('passport_number')
      if (!nrc?.trim() && !passport?.trim()) {
        return false
      }
    }
    
    if (currentStep === 1) return watch('program_id') && watch('intake_id')
    if (currentStep === 7) {
      // Subject selection step - require minimum 5 subjects
      return selectedSubjects.length >= 5
    }
    if (currentStep === 11) {
      const paymentMethod = watch('payment_method')
      if (!paymentMethod) return false
      if (paymentMethod === 'pay_now') {
        return watch('payment_reference') && uploadedFiles.some(f => f.name.toLowerCase().includes('payment'))
      }
      return true
    }
    if (currentStep === 12) {
      // For final step, check all declarations are accepted
      return watch('declaration') && watch('information_accuracy') && watch('professional_conduct') && termsAccepted && digitalSignature.trim() !== ''
    }
    
    return true
  }

  const validateAllSteps = (): ValidationError[] => {
    const errors: ValidationError[] = []
    
    for (let step = 1; step <= totalSteps; step++) {
      const stepFields = getStepFields(step)
      
      stepFields.forEach(field => {
        const value = watch(field)
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push({
            field,
            message: `${field.replace(/_/g, ' ')} is required`,
            step,
            stepTitle: stepTitles[step - 1]
          })
        }
      })
      
      // Special validations
      if (step === 2) {
        const nrc = watch('nrc_number')
        const passport = watch('passport_number')
        if (!nrc?.trim() && !passport?.trim()) {
          errors.push({
            field: 'identification',
            message: 'Either NRC Number or Passport Number is required',
            step: 2,
            stepTitle: stepTitles[1]
          })
        }
      }
      
      if (step === 7 && selectedSubjects.length < 5) {
        errors.push({
          field: 'subjects',
          message: 'At least 5 subjects are required',
          step: 7,
          stepTitle: stepTitles[6]
        })
      }
      
      if (step === 11 && watch('payment_method') === 'pay_now') {
        if (!watch('payment_reference')?.trim()) {
          errors.push({
            field: 'payment_reference',
            message: 'Payment reference is required when paying now',
            step: 11,
            stepTitle: stepTitles[10]
          })
        }
        if (!uploadedFiles.some(f => f.name.toLowerCase().includes('payment'))) {
          errors.push({
            field: 'payment_proof',
            message: 'Payment proof screenshot is required',
            step: 11,
            stepTitle: stepTitles[10]
          })
        }
      }
    }
    
    return errors
  }

  const getCompletionChecklist = (): CompletionItem[] => {
    return [
      {
        id: 'program_selection',
        title: 'Program and intake selected',
        completed: !!(watch('program_id') && watch('intake_id')),
        required: true
      },
      {
        id: 'personal_info',
        title: 'Personal information completed',
        completed: !!(watch('date_of_birth') && watch('gender') && watch('nationality') && watch('physical_address')),
        required: true
      },
      {
        id: 'identification',
        title: 'Identification provided (NRC or Passport)',
        completed: !!(watch('nrc_number')?.trim() || watch('passport_number')?.trim()),
        required: true
      },
      {
        id: 'health_legal',
        title: 'Health and legal information provided',
        completed: watch('criminal_record') !== undefined,
        required: true
      },
      {
        id: 'education',
        title: 'Educational background provided',
        completed: !!(watch('previous_education') && watch('grades_or_gpa')),
        required: true
      },
      {
        id: 'subjects',
        title: 'Academic subjects selected (minimum 5)',
        completed: selectedSubjects.length >= 5,
        required: true
      },
      {
        id: 'motivation',
        title: 'Motivation letter and career goals',
        completed: !!(watch('motivation_letter') && watch('career_goals')),
        required: true
      },
      {
        id: 'skills',
        title: 'Skills and references provided',
        completed: !!(watch('english_proficiency') && watch('computer_skills') && watch('references')),
        required: true
      },
      {
        id: 'payment',
        title: 'Payment method selected',
        completed: !!watch('payment_method'),
        required: true
      },
      {
        id: 'payment_proof',
        title: 'Payment completed (if paying now)',
        completed: watch('payment_method') !== 'pay_now' || (!!watch('payment_reference') && uploadedFiles.some(f => f.name.toLowerCase().includes('payment'))),
        required: watch('payment_method') === 'pay_now'
      },
      {
        id: 'documents',
        title: 'Supporting documents uploaded',
        completed: uploadedFiles.length > 0,
        required: false
      },
      {
        id: 'declarations',
        title: 'All declarations accepted',
        completed: !!(watch('declaration') && watch('information_accuracy') && watch('professional_conduct')),
        required: true
      },
      {
        id: 'terms',
        title: 'Terms and conditions accepted',
        completed: termsAccepted,
        required: true
      },
      {
        id: 'signature',
        title: 'Digital signature provided',
        completed: digitalSignature.trim() !== '',
        required: true
      }
    ]
  }

  const performPreSubmissionValidation = () => {
    const errors = validateAllSteps()
    setValidationErrors(errors)
    setShowValidationReport(true)
    return errors.length === 0
  }

  const nextStep = () => {
    if (canProceedToNextStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      saveDraft() // Auto-save when moving to next step
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      saveDraft() // Auto-save when moving to previous step
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
        setSaveError(`File is too large. Maximum size is 10MB.`)
        continue
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setSaveError(`File type not supported. Please upload JPG, PNG, or PDF files.`)
        continue
      }

      const fileId = `${file.name}-${Date.now()}`
      setUploadingFiles(prev => [...prev, fileId])
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      let progressInterval: NodeJS.Timeout | null = null

      try {
        // Verify user authentication for file upload
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) {
          setSaveError('Authentication session expired. Please sign in again.')
          continue
        }
        
        const fileName = `${currentUser.id}/${Date.now()}-${file.name}`
        
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
        setSaveError(`Failed to upload ${file.name}: ${error.message || 'Upload failed'}`)
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



  const performSubmission = async (data: ApplicationFormData): Promise<SubmissionResult> => {
    return await executeWithErrorHandling(
      async () => {
        const validationErrors = validateSubmissionData(data)
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
        }

        if (!user?.id) {
          throw new Error('User not authenticated. Please sign in and try again.')
        }

        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) {
          throw new Error('Authentication session expired. Please sign in again.')
        }

        const referenceNumber = generateReferenceNumber()
        const trackingCode = generateTrackingCode()
          
        const applicationData = {
          application_number: referenceNumber,
          public_tracking_code: trackingCode,
          user_id: currentUser.id,
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
        }

        const { data: application, error: applicationError } = await supabase
          .from('applications')
          .insert(applicationData)
          .select()
          .single()

        if (applicationError) {
          throw new Error(applicationError.message || 'Failed to submit application')
        }

        if (uploadedFiles.length > 0) {
          const documentInserts = uploadedFiles.map(file => ({
            application_id: application.id,
            document_type: file.name.toLowerCase().includes('payment') ? 'payment_proof' : 'supporting_document',
            document_name: file.name,
            file_name: file.name,
            file_path: file.url || '',
            file_size: file.size,
            mime_type: file.type,
            uploader_id: currentUser.id
          }))

          const { error: documentsError } = await supabase
            .from('documents')
            .insert(documentInserts)

          if (documentsError) {
            console.warn('Error saving document records:', documentsError)
          }
        }

        if (user.email) {
          await sendEmailReceipt({
            to: user.email,
            subject: `Application Confirmation - ${referenceNumber}`,
            applicationNumber: referenceNumber,
            trackingCode: trackingCode,
            programName: selectedProgram?.name || 'Unknown Program',
            submissionDate: new Date().toISOString(),
            paymentStatus: data.payment_method === 'pay_now' ? 'pending' : 'deferred'
          })
        }

        return {
          success: true,
          applicationId: application.id,
          referenceNumber: referenceNumber,
          trackingCode: trackingCode
        }
      },
      'submit_application',
      {
        maxRetries: 2,
        rollbackOperation: async () => {
          console.log('Rolling back application submission')
        }
      }
    ) || { success: false, error: 'Submission failed' }
  }

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true)
    setSubmissionStatus(null)

    const result = await submitWithRetry(
      () => performSubmission(data),
      (status) => {
        setSubmissionStatus(status)
        if (status.status !== 'failed' && result?.applicationId) {
          saveSubmissionStatus(result.applicationId, status)
        }
      }
    )

    if (result.success) {
      setSubmissionResult(result)
      await applicationSessionManager.deleteDraft(profile?.user_id || user.id)
      setSuccess(true)
    }
    
    setIsSubmitting(false)
  }

  const downloadReceipt = () => {
    if (!submissionResult) return
    
    const receiptData = {
      referenceNumber: submissionResult.referenceNumber,
      trackingCode: submissionResult.trackingCode,
      programName: selectedProgram?.name || 'Unknown Program',
      submissionDate: new Date().toLocaleDateString(),
      paymentStatus: watch('payment_method') === 'pay_now' ? 'Pending' : 'Deferred',
      userEmail: user?.email || ''
    }
    
    const content = `
APPLICATION RECEIPT
==================

Reference Number: ${receiptData.referenceNumber}
Tracking Code: ${receiptData.trackingCode}
Program: ${receiptData.programName}
Submission Date: ${receiptData.submissionDate}
Payment Status: ${receiptData.paymentStatus}
Email: ${receiptData.userEmail}

Thank you for your application!
    `
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${receiptData.referenceNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (success && submissionResult) {
    return (
      <SubmissionConfirmation
        referenceNumber={submissionResult.referenceNumber || ''}
        trackingCode={submissionResult.trackingCode || ''}
        applicationId={submissionResult.applicationId || ''}
        programName={selectedProgram?.name || 'Unknown Program'}
        submissionDate={new Date().toISOString()}
        paymentStatus={watch('payment_method') === 'pay_now' ? 'pending' : 'deferred'}
        userEmail={user?.email || ''}
        onDownloadReceipt={downloadReceipt}
        onTrackApplication={() => navigate('/track-application')}
        onGoToDashboard={() => navigate('/student/dashboard')}
      />
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
          {user && (
            <div className="mt-2 text-sm text-gray-600">
              Logged in as: {user.email}
              {profile && (
                <div className="mt-1 text-xs text-blue-600">
                  Profile loaded: {profile.full_name} | DOB: {profile.date_of_birth || 'Not set'} | Gender: {profile.gender || 'Not set'}
                </div>
              )}
            </div>
          )}
        </div>

        {errorState.hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <div className="flex-1">
                <span className="text-red-700">{errorState.error?.message}</span>
                {errorState.operation && (
                  <p className="text-sm text-red-600 mt-1">Operation: {errorState.operation}</p>
                )}
              </div>
              <div className="flex space-x-2">
                {errorState.canRetry && (
                  <button
                    onClick={retryLastOperation}
                    className="text-red-600 hover:text-red-800 text-sm underline"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={clearError}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {submissionStatus && (
          <div className="mb-6">
            <SubmissionStatus
              status={submissionStatus}
              onRetry={() => {
                const formData = getValues()
                onSubmit(formData)
              }}
              onCancel={() => setSubmissionStatus(null)}
            />
          </div>
        )}

        {profile && currentStep === 2 && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Smart Form:</strong> Some fields have been automatically filled from your profile. 
                  Fields with a green background contain your saved information - you can edit them if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">
              Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
            </h2>
            <div className="flex items-center space-x-4">
              {isDraftSaving && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Saving...</span>
                </div>
              )}
              {draftSaved && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveDraft}
                disabled={isDraftSaving}
                className="hover:bg-primary/10"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
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

        {/* Session Warning */}
        <SessionWarning
          warning={sessionWarning}
          onExtend={handleExtendSession}
          onDismiss={() => setSessionWarning(null)}
        />

        {/* Save Notification */}
        <SaveNotification
          show={showSaveNotification}
          type={saveNotificationType}
          message={saveNotificationMessage}
          onClose={() => setShowSaveNotification(false)}
        />

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary">
                  Personal Information
                </h2>
                <div className="flex items-center space-x-3">
                  {profile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const fieldsToPopulate = {
                          date_of_birth: profile.date_of_birth || '',
                          gender: profile.gender || '',
                          nationality: profile.nationality || profile.country || 'Zambian',
                          physical_address: profile.address || '',
                          postal_address: profile.address || '',
                        }
                        
                        Object.entries(fieldsToPopulate).forEach(([key, value]) => {
                          if (value && value.trim() !== '') {
                            setValue(key as keyof ApplicationFormData, value)
                          }
                        })
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      ↻ Fill from Profile
                    </Button>
                  )}
                  {profile && (
                    <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      ✓ Auto-filled from profile
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('date_of_birth')}
                  type="date"
                  label="Date of Birth"
                  required
                  error={errors.date_of_birth?.message}
                  className={profile?.date_of_birth ? 'bg-green-50 border-green-200' : ''}
                />

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('gender')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      profile?.gender ? 'bg-green-50 border-green-200' : 'border-gray-300'
                    }`}
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
                  className={profile?.nationality ? 'bg-green-50 border-green-200' : ''}
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
                  className={profile?.address ? 'bg-green-50 border-green-200' : ''}
                />
              </div>

              <div className="mt-6">
                <TextArea
                  {...register('physical_address')}
                  label="Physical Address"
                  required
                  rows={3}
                  error={errors.physical_address?.message}
                  className={profile?.address ? 'bg-green-50 border-green-200' : ''}
                />
              </div>
            </div>
          )}

          {/* Step 3: Guardian Information */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary">
                  Guardian/Next of Kin Information
                </h2>
                <div className="flex items-center space-x-3">
                  {profile?.emergency_contact_name && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const fieldsToPopulate = {
                          guardian_name: profile.emergency_contact_name || '',
                          guardian_phone: profile.emergency_contact_phone || '',
                          guardian_relationship: profile.emergency_contact_name ? 'Emergency Contact' : ''
                        }
                        
                        Object.entries(fieldsToPopulate).forEach(([key, value]) => {
                          if (value && value.trim() !== '') {
                            setValue(key as keyof ApplicationFormData, value)
                          }
                        })
                      }}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      ↻ Fill from Profile
                    </Button>
                  )}
                  {profile?.emergency_contact_name && (
                    <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      ✓ Auto-filled from profile
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                This information is optional but recommended for emergency contact purposes.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('guardian_name')}
                  label="Guardian/Next of Kin Name"
                  error={errors.guardian_name?.message}
                  className={profile?.emergency_contact_name ? 'bg-green-50 border-green-200' : ''}
                />

                <Input
                  {...register('guardian_phone')}
                  label="Guardian Phone Number"
                  error={errors.guardian_phone?.message}
                  className={profile?.emergency_contact_phone ? 'bg-green-50 border-green-200' : ''}
                />

                <Input
                  {...register('guardian_relationship')}
                  label="Relationship"
                  placeholder="e.g., Parent, Spouse, Sibling"
                  error={errors.guardian_relationship?.message}
                  className={profile?.emergency_contact_name ? 'bg-green-50 border-green-200' : ''}
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

          {/* Step 7: Subject Selection */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-secondary mb-4">
                  Academic Subjects
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Select at least 5 subjects from your previous education. You can add grades and scores for better evaluation.
                </p>
                
                <SubjectSelection
                  selectedSubjects={selectedSubjects}
                  onSubjectsChange={setSelectedSubjects}
                  error={selectedSubjects.length < 5 ? 'At least 5 subjects are required' : undefined}
                />
              </div>

              {/* Real-time Eligibility Assessment */}
              {selectedSubjects.length >= 5 && selectedProgramId && user && (
                <EligibilityChecker
                  applicationId={user.id} // Use user ID as temporary application ID
                  programId={selectedProgramId}
                  grades={selectedSubjects.map(subject => ({
                    subject_id: subject.id,
                    subject_name: subject.name,
                    grade: typeof subject.grade === 'number' ? subject.grade : (typeof subject.grade === 'string' ? parseFloat(subject.grade) || 0 : 0)
                  }))}
                  onEligibilityChange={setEligibilityAssessment}
                />
              )}
            </div>
          )}

          {/* Step 8: Motivation */}
          {currentStep === 8 && (
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

          {/* Step 9: Skills & References */}
          {currentStep === 9 && (
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

          {/* Step 10: Financial Information */}
          {currentStep === 10 && (
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

          {/* Step 11: Payment */}
          {currentStep === 11 && (
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

          {/* Step 12: Review & Submit */}
          {currentStep === 12 && (
            <div className="space-y-6">
              {/* Pre-Submission Validation */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-secondary">
                    Pre-Submission Validation
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={performPreSubmissionValidation}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Validate Application
                  </Button>
                </div>
                
                {/* Completion Checklist */}
                <div className="space-y-3">
                  <h3 className="font-medium text-secondary mb-3">Completion Checklist</h3>
                  {getCompletionChecklist().map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.completed 
                          ? 'bg-green-500 text-white' 
                          : item.required 
                          ? 'bg-red-100 border-2 border-red-300' 
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}>
                        {item.completed ? '✓' : item.required ? '!' : '○'}
                      </div>
                      <span className={`text-sm ${
                        item.completed 
                          ? 'text-green-700' 
                          : item.required 
                          ? 'text-red-700' 
                          : 'text-gray-600'
                      }`}>
                        {item.title}
                        {item.required && !item.completed && ' (Required)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Report Modal */}
              {showValidationReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-secondary">
                          Validation Report
                        </h3>
                        <button
                          onClick={() => setShowValidationReport(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      {validationErrors.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                          <h4 className="text-xl font-semibold text-green-700 mb-2">
                            Validation Passed!
                          </h4>
                          <p className="text-green-600">
                            Your application is ready for submission.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <span className="text-red-700 font-medium">
                              {validationErrors.length} issue(s) found
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            {validationErrors.map((error, index) => (
                              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-red-800">
                                      Step {error.step}: {error.stepTitle}
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">
                                      {error.message}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setCurrentStep(error.step)
                                      setShowValidationReport(false)
                                    }}
                                    className="text-red-600 hover:bg-red-100"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Fix
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end mt-6">
                        <Button
                          type="button"
                          onClick={() => setShowValidationReport(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Application Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-secondary">
                    Application Summary
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReviewSummary(true)}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review Details
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Program</p>
                      <p className="text-secondary">{selectedProgram?.name || 'Not selected'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Intake</p>
                      <p className="text-secondary">{intakes.find(i => i.id === watch('intake_id'))?.name || 'Not selected'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Payment Method</p>
                      <p className="text-secondary">{paymentMethod === 'pay_now' ? 'Pay Now' : paymentMethod === 'pay_later' ? 'Pay Later' : 'Not selected'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Documents Uploaded</p>
                      <p className="text-secondary">{uploadedFiles.length} files</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Application Fee</p>
                      <p className="text-secondary">K150</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <p className="text-secondary">Ready for submission</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Summary Modal */}
              {showReviewSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-secondary">
                          Application Review Summary
                        </h3>
                        <button
                          onClick={() => setShowReviewSummary(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Program Information */}
                        <div className="border-b pb-4">
                          <h4 className="font-semibold text-secondary mb-3">Program Information</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Program:</strong> {selectedProgram?.name}</div>
                            <div><strong>Intake:</strong> {intakes.find(i => i.id === watch('intake_id'))?.name}</div>
                          </div>
                        </div>
                        
                        {/* Personal Information */}
                        <div className="border-b pb-4">
                          <h4 className="font-semibold text-secondary mb-3">Personal Information</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Date of Birth:</strong> {watch('date_of_birth')}</div>
                            <div><strong>Gender:</strong> {watch('gender')}</div>
                            <div><strong>Nationality:</strong> {watch('nationality')}</div>
                            <div><strong>NRC:</strong> {watch('nrc_number') || 'Not provided'}</div>
                            <div><strong>Passport:</strong> {watch('passport_number') || 'Not provided'}</div>
                          </div>
                        </div>
                        
                        {/* Education & Career */}
                        <div className="border-b pb-4">
                          <h4 className="font-semibold text-secondary mb-3">Education & Career</h4>
                          <div className="text-sm space-y-2">
                            <div><strong>Previous Education:</strong> {watch('previous_education')?.substring(0, 100)}...</div>
                            <div><strong>Employment Status:</strong> {watch('employment_status')}</div>
                          </div>
                        </div>
                        
                        {/* Payment Information */}
                        <div className="border-b pb-4">
                          <h4 className="font-semibold text-secondary mb-3">Payment Information</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Payment Method:</strong> {watch('payment_method')}</div>
                            <div><strong>Amount:</strong> K150</div>
                            {watch('payment_method') === 'pay_now' && (
                              <div><strong>Reference:</strong> {watch('payment_reference')}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Documents */}
                        <div>
                          <h4 className="font-semibold text-secondary mb-3">Uploaded Documents</h4>
                          <div className="space-y-2">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="text-sm flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span>{file.name}</span>
                                <span className="text-gray-500">({formatFileSize(file.size)})</span>
                              </div>
                            ))}
                            {uploadedFiles.length === 0 && (
                              <p className="text-sm text-gray-500">No documents uploaded</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-6">
                        <Button
                          type="button"
                          onClick={() => setShowReviewSummary(false)}
                        >
                          Close Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Declarations */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-secondary mb-4">
                  Declarations
                </h2>
                
                <div className="space-y-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      {...register('declaration')}
                      className="mt-1"
                    />
                    <span className="text-sm text-secondary">
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
                    <span className="text-sm text-secondary">
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
                    <span className="text-sm text-secondary">
                      I agree to abide by the professional conduct standards and regulations of the institution and relevant professional bodies.
                    </span>
                  </label>
                  {errors.professional_conduct && (
                    <p className="text-sm text-red-600">{errors.professional_conduct.message}</p>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-secondary mb-4">
                  Terms and Conditions
                </h2>
                
                <div className="bg-gray-50 border rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>1. Application Processing:</strong> Applications will be processed within 14 working days of submission.</p>
                    <p><strong>2. Document Verification:</strong> All submitted documents must be authentic and verifiable.</p>
                    <p><strong>3. Payment Policy:</strong> Application fees are non-refundable once submitted.</p>
                    <p><strong>4. Academic Requirements:</strong> Meeting minimum requirements does not guarantee admission.</p>
                    <p><strong>5. Communication:</strong> All official communication will be sent to the provided email address.</p>
                    <p><strong>6. Data Protection:</strong> Personal information will be handled in accordance with our privacy policy.</p>
                    <p><strong>7. Admission Validity:</strong> Admission offers are valid for the specified intake period only.</p>
                    <p><strong>8. Code of Conduct:</strong> Students must adhere to institutional policies and professional standards.</p>
                  </div>
                </div>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-secondary">
                    I have read, understood, and agree to the terms and conditions stated above.
                  </span>
                </label>
              </div>

              {/* Digital Signature */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-secondary mb-4">
                  Digital Signature
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Full Name (Digital Signature) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={digitalSignature}
                      onChange={(e) => setDigitalSignature(e.target.value)}
                      placeholder="Type your full name as digital signature"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      By typing your name, you are providing a digital signature equivalent to a handwritten signature.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                      <strong>Time:</strong> {new Date().toLocaleTimeString()}<br />
                      <strong>IP Address:</strong> [Recorded for security]
                    </p>
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
                <div className="flex items-center space-x-4">
                  <Button 
                    type="button"
                    onClick={performPreSubmissionValidation}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Final Validation
                  </Button>
                  <Button 
                    type="submit" 
                    loading={loading || isSubmitting}
                    disabled={!canProceedToNextStep() || validationErrors.length > 0 || isSubmitting}
                    className={`${!canProceedToNextStep() || validationErrors.length > 0 || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              )}
              {!canProceedToNextStep() && (
                <p className="text-sm text-red-600 flex items-center">
                  Please complete all required fields to continue
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Data Population Confirmation Modal */}
        <DataPopulationConfirmation
          profileData={profile as ProfileData}
          onConfirm={handleDataPopulationConfirm}
          onEdit={handleDataPopulationEdit}
          onSkip={handleDataPopulationSkip}
          isVisible={showDataConfirmation}
        />
      </div>
    </div>
  )
}