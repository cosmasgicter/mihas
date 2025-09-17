import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { checkEligibility, getRecommendedSubjects } from '@/lib/eligibility'

import { ArrowLeft, CheckCircle, ArrowRight, X, FileText, CreditCard, Send, XCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAssistant } from '@/components/application/AIAssistant'
import { draftManager } from '@/lib/draftManager'
import { sanitizeForLog } from '@/lib/security'
import { safeJsonParse } from '@/lib/utils'
import { useProfileAutoPopulation, getBestValue, getUserMetadata } from '@/hooks/useProfileAutoPopulation'
import { ProfileCompletionBadge } from '@/components/ui/ProfileAutoPopulationIndicator'
import { applicationsData } from '@/data/applications'
import { catalogData } from '@/data/catalog'

const wizardSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  nrc_number: z.string().optional(),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['Male', 'Female'], { required_error: 'Please select sex' }),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  residence_town: z.string().min(2, 'Residence town is required'),
  next_of_kin_name: z.string().optional(),
  next_of_kin_phone: z.string().optional(),
  program: z.enum(['Clinical Medicine', 'Environmental Health', 'Registered Nursing'], { 
    required_error: 'Please select a program' 
  }),
  intake: z.string().min(1, 'Please select an intake'),
  payment_method: z.enum(['MTN Money', 'Airtel Money', 'Zamtel Money', 'Ewallet', 'Bank To Cell']).default('MTN Money'),
  payer_name: z.string().optional(),
  payer_phone: z.string().optional(),
  amount: z.number().min(153, 'Minimum amount is K153').optional(),
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
  const location = useLocation()
  const { user, profile, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [submittedApplication, setSubmittedApplication] = useState<{
    applicationNumber: string
    trackingCode: string
    program: string
    institution: string
  } | null>(null)
  
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
  const [restoringDraft, setRestoringDraft] = useState(false)

  const [confirmSubmission, setConfirmSubmission] = useState(false)
  
  // Data hooks
  const { data: subjectsData } = catalogData.useSubjects()
  const subjects = subjectsData?.subjects || []
  const createApplication = applicationsData.useCreate()
  const updateApplication = applicationsData.useUpdate()
  const syncGrades = applicationsData.useSyncGrades()
  const { data: draftApplications } = applicationsData.useList({ 
    status: 'draft', 
    mine: true, 
    pageSize: 1 
  })
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { amount: 153, payment_method: 'MTN Money' }
  })

  const selectedProgram = watch('program')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-wizard')
    }
  }, [user, authLoading, navigate])

  // Prevent accidental page refresh when user has unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep > 1 && !success) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentStep, success])

  // Use the profile auto-population hook
  const { metadata, completionPercentage, hasAutoPopulatedData } = useProfileAutoPopulation(setValue)

  // Auto-populate form fields when user/profile data is available
  useEffect(() => {
    if (user && !authLoading && currentStep === 1) {
      const userMetadata = getUserMetadata(user)
      
      // Auto-populate all available fields
      setValue('email', user.email || '')
      setValue('full_name', getBestValue(profile?.full_name, userMetadata.full_name, user.email?.split('@')[0] || ''))
      setValue('phone', getBestValue(profile?.phone, userMetadata.phone, ''))
      setValue('date_of_birth', getBestValue(profile?.date_of_birth, userMetadata.date_of_birth, ''))
      setValue('sex', getBestValue(profile?.sex, userMetadata.sex, ''))
      setValue('residence_town', getBestValue(profile?.city || profile?.address, userMetadata.city, ''))
      setValue('next_of_kin_name', getBestValue(profile?.next_of_kin_name, userMetadata.next_of_kin_name, ''))
      setValue('next_of_kin_phone', getBestValue(profile?.next_of_kin_phone, userMetadata.next_of_kin_phone, ''))
    }
  }, [user, profile, authLoading, currentStep, setValue])

  // Load saved application draft and restore state
  useEffect(() => {
    const loadDraftData = async () => {
      if (!user || authLoading) return
      
      setRestoringDraft(true)
      
      try {
        // First check localStorage for wizard draft
        const savedDraft = localStorage.getItem('applicationWizardDraft')
        if (savedDraft) {
          const draft = safeJsonParse(savedDraft, null)
          if (draft) {
            if (draft.formData) {
              Object.keys(draft.formData).forEach(key => {
                setValue(key as keyof WizardFormData, draft.formData[key])
              })
            }
            if (draft.selectedGrades) {
              setSelectedGrades(draft.selectedGrades)
            }
            if (draft.currentStep && draft.currentStep > 1) {
              setCurrentStep(draft.currentStep)
            }
            if (draft.applicationId) {
              setApplicationId(draft.applicationId)
            }
            return // Exit early if we found a draft
          } else {
            console.error('Error loading draft: Invalid JSON in localStorage')
            localStorage.removeItem('applicationWizardDraft')
          }
        }
        
        // If no localStorage draft, check for existing draft application in database
        if (draftApplications?.applications && draftApplications.applications.length > 0) {
          const app = draftApplications.applications[0]

          // Populate form with existing data
          setValue('full_name', app.full_name || '')
          setValue('nrc_number', app.nrc_number || '')
          setValue('passport_number', app.passport_number || '')
          setValue('date_of_birth', app.date_of_birth || '')
          setValue('sex', app.sex || '')
          setValue('phone', app.phone || '')
          setValue('email', app.email || '')
          setValue('residence_town', app.residence_town || '')
          setValue('next_of_kin_name', app.next_of_kin_name || '')
          setValue('next_of_kin_phone', app.next_of_kin_phone || '')
          setValue('program', app.program || '')
          setValue('intake', app.intake || '')
          
          setApplicationId(app.id)
          
          // Determine current step based on completion
          let step = 1
          if (app.program && app.full_name) {
            step = 2 // Has basic info, move to education
            
            // Load grades if they exist - this would need to be handled by the detail query
            // For now, we'll skip this part as it requires additional API changes

            if (app.result_slip_url) {
              step = 3 // Has education data, move to payment
              
              if (app.pop_url) {
                step = 4 // Has payment, move to review
              }
            }
          }
          
          setCurrentStep(step)
          
          // Show success message if continuing from dashboard
          if (location.state?.continueApplication) {
            setTimeout(() => {
              setDraftSaved(true)
              setTimeout(() => setDraftSaved(false), 3000)
            }, 500)
          }
        }
      } catch (error) {
        console.error('Error loading existing draft application:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
      } finally {
        setRestoringDraft(false)
      }
    }
    
    loadDraftData()
  }, [user, authLoading, setValue, location.state])

  // Save draft on form changes
  // Auto-save on form changes with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const subscription = watch(() => {
      if (currentStep >= 1 && !isDraftSaving) {
        // Clear previous timeout
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Set new timeout for auto-save
        timeoutId = setTimeout(() => {
          saveDraft()
        }, 8000) // Increased to 8 seconds to reduce API calls
      }
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [watch, currentStep, isDraftSaving])

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
      
      // Save to localStorage with error handling
      try {
        localStorage.setItem('applicationWizardDraft', JSON.stringify(draft))
      } catch (storageError) {
        console.warn('localStorage save failed:', storageError)
        // Try sessionStorage as fallback
        try {
          sessionStorage.setItem('applicationWizardDraft', JSON.stringify(draft))
        } catch (sessionError) {
          console.error('Both localStorage and sessionStorage failed:', sessionError)
        }
      }
      
      // Skip application session manager for now
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (error) {
      console.error('Error saving draft:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
    } finally {
      setIsDraftSaving(false)
    }
  }

  // Subjects are now loaded via the data hook

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



  const uploadFileWithProgress = async (file: File, fileType: string): Promise<string> => {
    if (!user?.id || !applicationId) {
      throw new Error('User or application ID not available')
    }

    // Verify user is still authenticated
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      throw new Error('Please sign in again to upload files')
    }

    // Reset any previous upload state
    setUploadProgress(prev => ({ ...prev, [fileType]: 0 }))
    setUploadedFiles(prev => ({ ...prev, [fileType]: false }))
    
    let progressInterval: NodeJS.Timeout | null = null
    
    try {
      // Start progress simulation
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileType] || 0
          if (current < 85) {
            return { ...prev, [fileType]: current + 15 }
          }
          return prev
        })
      }, 300)
      
      const { uploadApplicationFile } = await import('@/lib/storage')
      const result = await uploadApplicationFile(file, user.id, applicationId, fileType)
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Complete progress
      setUploadProgress(prev => ({ ...prev, [fileType]: 100 }))
      setUploadedFiles(prev => ({ ...prev, [fileType]: true }))
      
      return result.url!
    } catch (error) {
      console.error('File upload error:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
      // Reset progress on error
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[fileType]
        return newProgress
      })
      setUploadedFiles(prev => ({ ...prev, [fileType]: false }))
      throw error
    } finally {
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // Clear progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[fileType]
          return newProgress
        })
      }, 3000)
    }
  }

  const nextStep = async (e?: React.MouseEvent) => {
    e?.preventDefault()
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
        
        // Determine institution based on program
        const institution = ['Clinical Medicine', 'Environmental Health'].includes(formData.program) ? 'KATC' : 'MIHAS'
        
        // Generate application number and tracking code using proper format
        const { generateApplicationNumber } = await import('@/lib/applicationNumberGenerator')
        const applicationNumber = generateApplicationNumber({ institution: institution as 'KATC' | 'MIHAS' })
        const trackingCode = `TRK${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        
        const app = await createApplication.mutateAsync({
          application_number: applicationNumber,
          public_tracking_code: trackingCode,
          full_name: formData.full_name,
          nrc_number: formData.nrc_number || null,
          passport_number: formData.passport_number || null,
          date_of_birth: formData.date_of_birth,
          sex: formData.sex,
          phone: formData.phone,
          email: formData.email,
          residence_town: formData.residence_town,
          next_of_kin_name: formData.next_of_kin_name || null,
          next_of_kin_phone: formData.next_of_kin_phone || null,
          program: formData.program,
          intake: formData.intake,
          institution: institution,
          status: 'draft'
        })

        setApplicationId(app.id)
        // Store initial application details, will be updated after submission
        setSubmittedApplication({
          applicationNumber,
          trackingCode,
          program: formData.program,
          institution
        })
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
        console.log('Eligibility advisory:', { message: sanitizeForLog(eligibilityCheck.message) })
      }
      
      if (!resultSlipFile) {
        setError('Result slip is required')
        return
      }
      

      
      try {
        setUploading(true)
        setError('')
        
        const resultSlipUrl = await uploadFileWithProgress(resultSlipFile, 'result_slip')
        setUploadedFiles(prev => ({ ...prev, result_slip: true }))
        
        let extraKycUrl = null
        if (extraKycFile) {
          extraKycUrl = await uploadFileWithProgress(extraKycFile, 'extra_kyc')
          setUploadedFiles(prev => ({ ...prev, extra_kyc: true }))
        }
        
        await syncGrades.mutateAsync({ id: applicationId, grades: selectedGrades })

        await updateApplication.mutateAsync({ 
          id: applicationId, 
          data: {
            result_slip_url: resultSlipUrl,
            extra_kyc_url: extraKycUrl
          }
        })
        
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

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep > 1) {
      saveDraft() // Auto-save when moving to previous step
      setCurrentStep(currentStep - 1)
    }
  }

  const submitApplication = async (data: WizardFormData, e?: React.FormEvent) => {
    e?.preventDefault()
    if (!confirmSubmission) {
      setError('Please confirm that all information is accurate before submitting')
      return
    }
    
    if (!popFile) {
      setError('Proof of payment is required')
      return
    }
    
    if (!applicationId) {
      setError('Application ID not found. Please try refreshing the page.')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Verify user authentication
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !currentUser) {
        throw new Error('Please sign in again to submit your application')
      }
      
      const popUrl = await uploadFileWithProgress(popFile, 'proof_of_payment')
      setUploadedFiles(prev => ({ ...prev, proof_of_payment: true }))
      
      // Update application with payment info and submit
      const updatedApp = await updateApplication.mutateAsync({
        id: applicationId,
        data: {
          payment_method: data.payment_method || 'MTN Money',
          payer_name: data.payer_name || null,
          payer_phone: data.payer_phone || null,
          amount: data.amount || 153,
          paid_at: data.paid_at ? new Date(data.paid_at).toISOString() : null,
          momo_ref: data.momo_ref || null,
          pop_url: popUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }
      })

      if (!updatedApp) {
        throw new Error('Application not found or access denied')
      }
      
      console.log('Application submitted successfully:', { applicationId: sanitizeForLog(updatedApp.id) })
      
      // Send notifications after successful submission
      try {
        const { getApiBaseUrl } = await import('@/lib/apiConfig')
        const apiBase = getApiBaseUrl()
        
        const { data: session } = await supabase.auth.getSession()
        const response = await fetch(`${apiBase}/api/notifications?action=application-submitted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            applicationId: updatedApp.id,
            userId: user.id
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('Notifications sent successfully:', { success: result.success })
          
          // Update submitted application details from API response
          if (result.application) {
            setSubmittedApplication({
              applicationNumber: result.application.number,
              trackingCode: result.application.trackingCode,
              program: result.application.program,
              institution: result.application.institution
            })
          }
        } else {
          console.warn('Failed to send notifications via API:', response.status)
        }
      } catch (notificationError) {
        console.warn('Failed to send notifications:', sanitizeForLog(notificationError instanceof Error ? notificationError.message : 'Unknown error'))
        // Don't fail the submission if notifications fail
      }
      
      // Clear saved draft on successful submission
      try {
        localStorage.removeItem('applicationWizardDraft')
        const deleteResult = await draftManager.clearAllDrafts(user.id)
        if (!deleteResult.success) {
          console.warn('Draft cleanup warning:', deleteResult.error)
        }
      } catch (cleanupError) {
        console.warn('Draft cleanup failed:', cleanupError)
      }
      
      setSuccess(true)
    } catch (err: any) {
      console.error('Submission error:', { error: sanitizeForLog(err instanceof Error ? err.message : 'Unknown error') })
      let errorMessage = 'Failed to submit application'
      
      if (err instanceof Error) {
        if (err.message?.includes('auth') || err.message?.includes('JWT')) {
          errorMessage = 'Authentication error. Please sign in again and try submitting.'
        } else if (err.message?.includes('RLS') || err.message?.includes('policy')) {
          errorMessage = 'Access denied. Please ensure you are signed in with the correct account.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || restoringDraft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Loading...' : 'Restoring your application...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8 text-center"
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
            
            {submittedApplication && (
              <motion.div 
                className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="font-semibold text-green-800 mb-3">Application Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Application Number:</span>
                    <span className="font-mono font-bold text-green-900">{submittedApplication.applicationNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Tracking Code:</span>
                    <span className="font-mono font-bold text-green-900">{submittedApplication.trackingCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Program:</span>
                    <span className="font-semibold text-green-900">{submittedApplication.program}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Institution:</span>
                    <span className="font-semibold text-green-900">{submittedApplication.institution}</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <p className="text-gray-600 mb-6">
              Your application is now under review. You'll receive notifications about status updates.
            </p>
            
            <div className="space-y-3">
              <Link to="/student/dashboard">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Go to Dashboard</Button>
              </Link>
              <Link to="/track-application">
                <Button variant="outline" className="w-full">Track Application Status</Button>
              </Link>
            </div>
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
                  <span>{location.state?.continueApplication ? 'Application Restored' : 'Saved'}</span>
                </motion.div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  saveDraft()
                }}
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

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 lg:space-y-8">
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Step 1: Basic KYC Information
                  </h2>
                  {hasAutoPopulatedData && (
                    <ProfileCompletionBadge completionPercentage={completionPercentage} />
                  )}
                </div>
                
                {hasAutoPopulatedData && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-2 text-sm text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Profile data automatically populated</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Some fields have been pre-filled from your profile. Please review and update as needed.
                    </p>
                  </motion.div>
                )}
                
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
                      error={errors.nrc_number?.message}
                      helperText="Provide either NRC or Passport (one is sufficient)"
                    />
                  </div>
                  
                  <div>
                    <Input
                      {...register('passport_number')}
                      label="Passport Number"
                      error={errors.passport_number?.message}
                      helperText="Provide either NRC or Passport (one is sufficient)"
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
                      {...register('next_of_kin_name')}
                      label="Next of Kin Name (Optional)"
                      error={errors.next_of_kin_name?.message}
                    />
                  </div>
                  
                  <div>
                    <Input
                      {...register('next_of_kin_phone')}
                      label="Next of Kin Phone (Optional)"
                      error={errors.next_of_kin_phone?.message}
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
                        onClick={(e) => {
                          e.preventDefault()
                          addGrade()
                        }} 
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
                        <div key={index}>
                          <motion.div 
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
                                disabled={subjects.length === 0}
                              >
                                <option value="">{subjects.length === 0 ? 'Loading subjects...' : 'Select subject'}</option>
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
                                <option value={1}>1 (A+)</option>
                                <option value={2}>2 (A)</option>
                                <option value={3}>3 (B+)</option>
                                <option value={4}>4 (B)</option>
                                <option value={5}>5 (C+)</option>
                                <option value={6}>6 (C)</option>
                                <option value={7}>7 (D+)</option>
                                <option value={8}>8 (D)</option>
                                <option value={9}>9 (F)</option>
                              </select>
                            </div>
                            
                            <div className="w-full sm:w-auto flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  removeGrade(index)
                                }}
                                className="flex-1 sm:flex-none"
                              >
                                <X className="h-4 w-4 sm:mr-0 mr-2" />
                                <span className="sm:hidden">Remove</span>
                              </Button>
                              {selectedGrades.length < 10 && (
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    addGrade()
                                  }}
                                  size="sm"
                                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                                >
                                  + Add
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        </div>
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
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            if (file) {
                              // Validate file immediately
                              if (file.size > 10 * 1024 * 1024) {
                                setError('File size must be less than 10MB')
                                e.target.value = ''
                                return
                              }
                              const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
                              if (!allowedTypes.includes(file.type)) {
                                setError('Only PDF, JPG, JPEG, and PNG files are allowed')
                                e.target.value = ''
                                return
                              }
                              setError('') // Clear any previous errors
                            }
                            setResultSlipFile(file)
                          }}
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
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            if (file) {
                              // Validate file immediately
                              if (file.size > 10 * 1024 * 1024) {
                                setError('File size must be less than 10MB')
                                e.target.value = ''
                                return
                              }
                              const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
                              if (!allowedTypes.includes(file.type)) {
                                setError('Only PDF, JPG, JPEG, and PNG files are allowed')
                                e.target.value = ''
                                return
                              }
                              setError('') // Clear any previous errors
                            }
                            setExtraKycFile(file)
                          }}
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
                    className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center mb-3">
                      <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-md font-medium text-blue-800">
                        Payment Required - Multiple Options Available
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-blue-700">
                        <strong>Application Fee:</strong> K153.00
                      </p>
                      <p className="text-blue-700">
                        <strong>Payment Target:</strong> {getPaymentTarget()}
                      </p>
                      <div className="bg-white rounded-md p-3 mt-3">
                        <p className="text-gray-700 font-medium mb-2">Available Payment Methods:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            MTN Money
                          </div>
                          <div className="flex items-center text-red-600">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            Airtel Money (Cross Network)
                          </div>
                          <div className="flex items-center text-blue-600">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            Zamtel Money (Cross Network)
                          </div>
                          <div className="flex items-center text-purple-600">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                            Ewallet
                          </div>
                          <div className="flex items-center text-orange-600">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                            Bank To Cell
                          </div>
                        </div>
                      </div>
                      <p className="text-green-700 font-medium">
                        ✓ Secure payment processing
                      </p>
                      <p className="text-green-700 font-medium">
                        ✓ Instant payment verification
                      </p>
                      <p className="text-green-700 font-medium">
                        ✓ Automated receipt generation
                      </p>
                    </div>
                  </motion.div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('payment_method')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        defaultValue="MTN Money"
                      >
                        <option value="MTN Money">MTN Money</option>
                        <option value="Airtel Money">Airtel Money (Cross Network)</option>
                        <option value="Zamtel Money">Zamtel Money (Cross Network)</option>
                        <option value="Ewallet">Ewallet</option>
                        <option value="Bank To Cell">Bank To Cell</option>
                      </select>
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
                        defaultValue={153}
                        min={153}
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
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setPopFile(file)
                          if (file) {
                            // Validate file immediately
                            if (file.size > 10 * 1024 * 1024) {
                              setError('File size must be less than 10MB')
                              e.target.value = ''
                              setPopFile(null)
                              return
                            }
                            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
                            if (!allowedTypes.includes(file.type)) {
                              setError('Only PDF, JPG, JPEG, and PNG files are allowed')
                              e.target.value = ''
                              setPopFile(null)
                              return
                            }
                            setError('') // Clear any previous errors
                          }
                        }}
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
                      <div>
                        <p><strong>Subjects ({selectedGrades.length}):</strong></p>
                        <div className="ml-4 mt-1 space-y-1">
                          {selectedGrades.map((grade, index) => {
                            const subject = subjects.find(s => s.id === grade.subject_id)
                            const subjectName = subject?.name || grade.subject_id || `Loading...`
                            const gradeLabel = grade.grade === 1 ? 'A+' : 
                                             grade.grade === 2 ? 'A' :
                                             grade.grade === 3 ? 'B+' :
                                             grade.grade === 4 ? 'B' :
                                             grade.grade === 5 ? 'C+' :
                                             grade.grade === 6 ? 'C' :
                                             grade.grade === 7 ? 'D+' :
                                             grade.grade === 8 ? 'D' : 'F'
                            return (
                              <p key={index} className="text-sm">
                                • {subjectName}: {gradeLabel} ({grade.grade})
                              </p>
                            )
                          })}
                          {selectedGrades.length === 0 && (
                            <p className="text-sm text-gray-500">No subjects selected</p>
                          )}
                        </div>
                      </div>
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
                    <input 
                      type="checkbox" 
                      id="confirm" 
                      className="mr-2" 
                      checked={confirmSubmission}
                      onChange={(e) => setConfirmSubmission(e.target.checked)}
                      required 
                    />
                    <label htmlFor="confirm" className="text-sm text-gray-700">
                      I confirm that all information provided is accurate and complete.
                    </label>
                  </div>
                  
                  {!confirmSubmission && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Please confirm that all information is accurate before you can submit your application.
                      </p>
                    </div>
                  )}
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
                    onClick={(e) => {
                      e.preventDefault()
                      prevStep(e)
                    }}
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
                    onClick={(e) => {
                      e.preventDefault()
                      nextStep(e)
                    }}
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
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault()
                      handleSubmit((data) => submitApplication(data, e))(e)
                    }}
                    loading={loading}
                    disabled={loading || !confirmSubmission}
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
      
      {/* AI Assistant */}
      <AIAssistant 
        applicationData={watch()}
        currentStep={currentStep}
        onSuggestionApply={(suggestion) => {
          // Handle AI suggestions
          console.log('AI Suggestion:', { suggestion: sanitizeForLog(JSON.stringify(suggestion)) })
        }}
      />
    </div>
  )
}