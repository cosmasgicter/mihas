import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { applicationsData } from '@/data/applications'
import { catalogData } from '@/data/catalog'
import { useProfileQuery } from '@/hooks/auth/useProfileQuery'
import { useProfileAutoPopulation, getBestValue, getUserMetadata } from '@/hooks/useProfileAutoPopulation'
import { draftManager } from '@/lib/draftManager'
import { checkEligibility, getRecommendedSubjects } from '@/lib/eligibility'
import { createApplicationSlip } from '@/lib/slipService'
import type { ApplicationSlipData } from '@/lib/applicationSlip'
import { sanitizeForLog } from '@/lib/security'
import { supabase } from '@/lib/supabase'
import { safeJsonParse } from '@/lib/utils'

import useApplicationSlip, { SubmittedApplicationSummary } from './useApplicationSlip'
import useApplicationFileUploads from './useApplicationFileUploads'
import { wizardSchema, type SubjectGrade, type WizardFormData } from '../types'
import { getStepIndexById, wizardSteps } from '../steps/config'

interface UseWizardControllerResult {
  authLoading: boolean
  restoringDraft: boolean
  user: ReturnType<typeof useAuth>['user']
  success: boolean
  loading: boolean
  uploading: boolean
  error: string
  setError: (message: string) => void
  form: ReturnType<typeof useForm<WizardFormData>>
  totalSteps: number
  currentStepIndex: number
  currentStepConfig: typeof wizardSteps[number]
  isLastStep: boolean
  selectedProgram: WizardFormData['program'] | undefined
  selectedGrades: SubjectGrade[]
  eligibilityCheck: ReturnType<typeof checkEligibility> | null
  recommendedSubjects: string[]
  subjects: Array<{ id: string; name: string; code: string }>
  hasAutoPopulatedData: boolean
  completionPercentage: number
  confirmSubmission: boolean
  setConfirmSubmission: (value: boolean) => void
  resultSlipFile: File | null
  extraKycFile: File | null
  popFile: File | null
  uploadProgress: Record<string, number>
  uploadedFiles: Record<string, boolean>
  isDraftSaving: boolean
  draftSaved: boolean
  submittedApplication: SubmittedApplicationSummary | null
  persistingSlip: boolean
  slipLoading: boolean
  emailLoading: boolean
  handleDownloadSlip: () => Promise<void>
  handleEmailSlip: () => Promise<void>
  handleResultSlipUpload: ReturnType<typeof useApplicationFileUploads>['handleResultSlipUpload']
  handleExtraKycUpload: ReturnType<typeof useApplicationFileUploads>['handleExtraKycUpload']
  handleProofOfPaymentUpload: ReturnType<typeof useApplicationFileUploads>['handleProofOfPaymentUpload']
  getPaymentTarget: () => string
  handleNextStep: () => Promise<void>
  handlePrevStep: () => void
  handleSubmitApplication: (data: WizardFormData) => Promise<void>
  addGrade: () => void
  removeGrade: (index: number) => void
  updateGrade: (index: number, field: keyof SubjectGrade, value: string | number) => void
  getUsedSubjects: () => string[]
  saveDraft: () => Promise<void>
  watchValues: () => WizardFormData
}

const useWizardController = (): UseWizardControllerResult => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { profile } = useProfileQuery()
  const toast = useToast()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [submittedApplication, setSubmittedApplication] = useState<SubmittedApplicationSummary | null>(null)
  const [selectedGrades, setSelectedGrades] = useState<SubjectGrade[]>([])
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [restoringDraft, setRestoringDraft] = useState(false)
  const [confirmSubmission, setConfirmSubmission] = useState(false)

  const totalSteps = wizardSteps.length
  const currentStepConfig = wizardSteps[currentStepIndex] ?? wizardSteps[0]
  const isLastStep = currentStepConfig.key === 'submit'

  const { data: subjectsData } = catalogData.useSubjects()
  const subjects = subjectsData?.subjects || []
  const createApplication = applicationsData.useCreate()
  const updateApplication = applicationsData.useUpdate()
  const syncGrades = applicationsData.useSyncGrades()
  const { data: draftApplications } = applicationsData.useList({ status: 'draft', mine: true, pageSize: 1 })

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { amount: 153, payment_method: 'MTN Money' }
  })
  const { handleSubmit, watch, setValue } = form
  const selectedProgram = watch('program')
  const clearValidationError = useCallback(() => setError(''), [])

  const {
    resultSlipFile,
    extraKycFile,
    proofOfPaymentFile: popFile,
    uploading,
    uploadProgress,
    uploadedFiles,
    handleResultSlipUpload,
    handleExtraKycUpload,
    handleProofOfPaymentUpload,
    startUpload,
    trackUploadTask
  } = useApplicationFileUploads({
    userId: user?.id,
    applicationId,
    onValidationError: setError,
    onValidationClear: clearValidationError
  })

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-wizard')
    }
  }, [user, authLoading, navigate])

  const slipPayload: ApplicationSlipData | null = useMemo(() => {
    if (!submittedApplication) return null
    const now = new Date().toISOString()
    return {
      public_tracking_code: submittedApplication.trackingCode,
      application_number: submittedApplication.applicationNumber,
      status: submittedApplication.status || 'submitted',
      payment_status: submittedApplication.paymentStatus || 'pending_review',
      submitted_at: submittedApplication.submittedAt || now,
      updated_at: submittedApplication.updatedAt || now,
      program_name: submittedApplication.program || null,
      intake_name: submittedApplication.intake || null,
      institution: submittedApplication.institution || null,
      full_name: submittedApplication.fullName || null,
      email: submittedApplication.email || user?.email || 'no-email@mihas.local',
      phone: submittedApplication.phone || null,
      admin_feedback: null,
      admin_feedback_date: null
    }
  }, [submittedApplication, user?.email])

  const { persistingSlip, slipLoading, emailLoading, handleDownloadSlip, handleEmailSlip } = useApplicationSlip({
    submittedApplication,
    slipPayload,
    success,
    toast,
    createApplicationSlip,
    onEmailUpdate: email => setSubmittedApplication(prev => (prev ? { ...prev, email } : prev))
  })

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (currentStepIndex > 0 && !success) {
        event.preventDefault()
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentStepIndex, success])

  const { completionPercentage, hasAutoPopulatedData } = useProfileAutoPopulation(setValue)

  useEffect(() => {
    if (user && !authLoading) {
      const metadata = getUserMetadata(user)
      const email = user.email || ''
      const fullName = getBestValue(profile?.full_name, metadata.full_name, email.split('@')[0] || '')
      const phone = getBestValue(profile?.phone, metadata.phone, '')
      const dateOfBirth = getBestValue(profile?.date_of_birth, metadata.date_of_birth, '')
      const sex = getBestValue(profile?.sex, metadata.sex, '')
      const residenceTown = getBestValue(profile?.city || profile?.address, metadata.city, '')
      const nextOfKinName = getBestValue(profile?.next_of_kin_name, metadata.next_of_kin_name, '')
      const nextOfKinPhone = getBestValue(profile?.next_of_kin_phone, metadata.next_of_kin_phone, '')

      setValue('email', email)
      setValue('full_name', fullName || '')
      setValue('phone', phone || '')
      setValue('date_of_birth', dateOfBirth || '')
      setValue('sex', (sex as 'Male' | 'Female') || '')
      setValue('residence_town', residenceTown || '')
      setValue('next_of_kin_name', nextOfKinName || '')
      setValue('next_of_kin_phone', nextOfKinPhone || '')
    }
  }, [user, profile, authLoading, setValue])

  useEffect(() => {
    const loadDraft = async () => {
      if (!user || authLoading) return
      setRestoringDraft(true)
      try {
        const savedDraft = localStorage.getItem('applicationWizardDraft')
        if (savedDraft) {
          const draft = safeJsonParse(savedDraft, null)
          if (draft) {
            if (draft.formData) {
              Object.keys(draft.formData).forEach(key => setValue(key as keyof WizardFormData, draft.formData[key]))
            }
            if (draft.selectedGrades) {
              setSelectedGrades(draft.selectedGrades)
            }
            if (draft.currentStepKey) {
              const index = wizardSteps.findIndex(step => step.key === draft.currentStepKey)
              if (index >= 0) setCurrentStepIndex(index)
            } else if (typeof draft.currentStep === 'number') {
              const index = getStepIndexById(draft.currentStep)
              setCurrentStepIndex(index >= 0 ? index : Math.min(Math.max(draft.currentStep - 1, 0), totalSteps - 1))
            }
            if (draft.applicationId) {
              setApplicationId(draft.applicationId)
            }
            return
          }
          localStorage.removeItem('applicationWizardDraft')
        }

        if (draftApplications?.applications && draftApplications.applications.length > 0) {
          const app = draftApplications.applications[0]
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

          let stepId = 1
          if (app.program && app.full_name) {
            stepId = 2
            if (app.result_slip_url) {
              stepId = 3
              if (app.pop_url) stepId = 4
            }
          }
          const index = getStepIndexById(stepId)
          setCurrentStepIndex(index >= 0 ? index : Math.min(Math.max(stepId - 1, 0), totalSteps - 1))

          if (location.state?.continueApplication) {
            setTimeout(() => {
              setDraftSaved(true)
              setTimeout(() => setDraftSaved(false), 3000)
            }, 500)
          }
        }
      } catch (error) {
        console.error('Error loading draft application:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
      } finally {
        setRestoringDraft(false)
      }
    }

    loadDraft()
  }, [user, authLoading, setValue, draftApplications, location.state, totalSteps])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const subscription = watch(() => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        void saveDraft()
      }, 8000)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [watch])

  const saveDraft = useCallback(async () => {
    if (!user || isDraftSaving) return
    try {
      setIsDraftSaving(true)
      const formData = watch()
      const draft = {
        formData,
        selectedGrades,
        currentStep: currentStepConfig.id,
        currentStepKey: currentStepConfig.key,
        applicationId,
        savedAt: new Date().toISOString()
      }

      try {
        localStorage.setItem('applicationWizardDraft', JSON.stringify(draft))
      } catch (storageError) {
        console.warn('localStorage save failed:', storageError)
        sessionStorage.setItem('applicationWizardDraft', JSON.stringify(draft))
      }

      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    } catch (error) {
      console.error('Error saving draft:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
    } finally {
      setIsDraftSaving(false)
    }
  }, [user, isDraftSaving, watch, selectedGrades, currentStepConfig, applicationId])

  const addGrade = useCallback(() => {
    setSelectedGrades(prev => (prev.length < 10 ? [...prev, { subject_id: '', grade: 1 }] : prev))
  }, [])

  const removeGrade = useCallback((index: number) => {
    setSelectedGrades(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateGrade = useCallback((index: number, field: keyof SubjectGrade, value: string | number) => {
    setSelectedGrades(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }, [])

  const getUsedSubjects = useCallback(() => selectedGrades.map(grade => grade.subject_id).filter(Boolean), [selectedGrades])

  const eligibilityCheck = useMemo(() => {
    if (!selectedProgram) return null
    return checkEligibility(
      selectedProgram,
      selectedGrades.map(grade => {
        const subject = subjects.find(s => s.id === grade.subject_id)
        return { subject_id: grade.subject_id, subject_name: subject?.name || '', grade: grade.grade }
      })
    )
  }, [selectedProgram, selectedGrades, subjects])

  const recommendedSubjects = useMemo(() => (selectedProgram ? getRecommendedSubjects(selectedProgram) : []), [selectedProgram])

  const getPaymentTarget = useCallback(() => {
    if (!selectedProgram) return ''
    const isKATC = ['Clinical Medicine', 'Environmental Health'].includes(selectedProgram)
    return isKATC ? 'KATC MTN 0966 992 299' : 'MIHAS MTN 0961 515 151'
  }, [selectedProgram])

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(Math.min(Math.max(index, 0), totalSteps - 1))
  }, [totalSteps])

  const handleNextStep = useCallback(async () => {
    saveDraft()

    if (currentStepConfig.key === 'basicKyc') {
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
        const institution = ['Clinical Medicine', 'Environmental Health'].includes(formData.program) ? 'KATC' : 'MIHAS'
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
          institution,
          status: 'draft'
        })

        setApplicationId(app.id)
        setSubmittedApplication({
          applicationNumber,
          trackingCode,
          program: formData.program,
          institution,
          intake: formData.intake,
          fullName: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          status: 'draft',
          paymentStatus: 'pending_review'
        })
        goToStep(currentStepIndex + 1)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to save application')
      } finally {
        setLoading(false)
      }
      return
    }

    if (currentStepConfig.key === 'education') {
      if (selectedGrades.length < 5) {
        setError('Minimum 5 subjects required')
        return
      }
      if (selectedProgram && eligibilityCheck && !eligibilityCheck.eligible) {
        console.log('Eligibility advisory:', { message: sanitizeForLog(eligibilityCheck.message) })
      }
      if (!resultSlipFile) {
        setError('Result slip is required')
        return
      }

      try {
        await trackUploadTask(async () => {
          clearValidationError()
          const resultSlipUrl = await startUpload(resultSlipFile, 'result_slip')
          const extraKycUrl = extraKycFile ? await startUpload(extraKycFile, 'extra_kyc') : null
          if (selectedGrades.length > 0) {
            await syncGrades.mutateAsync({ id: applicationId, grades: selectedGrades })
          }
          await updateApplication.mutateAsync({
            id: applicationId,
            data: { result_slip_url: resultSlipUrl, extra_kyc_url: extraKycUrl }
          })
        })
        goToStep(currentStepIndex + 1)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to upload education documents')
      }
      return
    }

    if (currentStepConfig.key === 'payment') {
      const formData = watch()
      if (!formData.payment_method) {
        setError('Payment method is required')
        return
      }
      goToStep(currentStepIndex + 1)
    }
  }, [saveDraft, currentStepConfig, watch, createApplication, goToStep, currentStepIndex, selectedGrades, selectedProgram, eligibilityCheck, resultSlipFile, extraKycFile, trackUploadTask, clearValidationError, startUpload, syncGrades, applicationId, updateApplication])

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      saveDraft()
      goToStep(currentStepIndex - 1)
    }
  }, [currentStepIndex, goToStep, saveDraft])

  const handleSubmitApplication = useCallback(async (data: WizardFormData) => {
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
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !currentUser) {
        throw new Error('Please sign in again to submit your application')
      }

      const popUrl = await startUpload(popFile, 'proof_of_payment')
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

      setSubmittedApplication(prev => ({
        applicationNumber: updatedApp.application_number,
        trackingCode: updatedApp.public_tracking_code,
        program: updatedApp.program,
        institution: updatedApp.institution,
        intake: updatedApp.intake,
        fullName: updatedApp.full_name,
        email: updatedApp.email,
        phone: updatedApp.phone,
        status: updatedApp.status,
        paymentStatus: updatedApp.payment_status ?? prev?.paymentStatus ?? 'pending_review',
        submittedAt: updatedApp.submitted_at,
        updatedAt: updatedApp.updated_at
      }))

      try {
        const { getApiBaseUrl } = await import('@/lib/apiConfig')
        const apiBase = getApiBaseUrl()
        const { data: session } = await supabase.auth.getSession()
        await fetch(`${apiBase}/api/notifications?action=application-submitted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ applicationId: updatedApp.id, userId: user.id })
        })
      } catch (notificationError) {
        console.warn('Failed to send notifications:', sanitizeForLog(notificationError instanceof Error ? notificationError.message : 'Unknown error'))
      }

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
    } catch (error) {
      console.error('Submission error:', { error: sanitizeForLog(error instanceof Error ? error.message : 'Unknown error') })
      const message = error instanceof Error ? error.message : 'Failed to submit application'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [confirmSubmission, popFile, applicationId, startUpload, updateApplication, user?.id])

  return {
    authLoading,
    restoringDraft,
    user,
    success,
    loading,
    uploading,
    error,
    setError,
    form,
    totalSteps,
    currentStepIndex,
    currentStepConfig,
    isLastStep,
    selectedProgram,
    selectedGrades,
    eligibilityCheck,
    recommendedSubjects,
    subjects,
    hasAutoPopulatedData,
    completionPercentage,
    confirmSubmission,
    setConfirmSubmission,
    resultSlipFile,
    extraKycFile,
    popFile,
    uploadProgress,
    uploadedFiles,
    isDraftSaving,
    draftSaved,
    submittedApplication,
    persistingSlip,
    slipLoading,
    emailLoading,
    handleDownloadSlip,
    handleEmailSlip,
    handleResultSlipUpload,
    handleExtraKycUpload,
    handleProofOfPaymentUpload,
    getPaymentTarget,
    handleNextStep,
    handlePrevStep,
    handleSubmitApplication,
    addGrade,
    removeGrade,
    updateGrade,
    getUsedSubjects,
    saveDraft,
    watchValues: watch
  }
}

export default useWizardController
