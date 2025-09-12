import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Upload, X, FileText, CheckCircle, ArrowRight, Star, Trophy, Target, Zap, CreditCard, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'diploma-clinical-medicine',
    name: 'Diploma in Clinical Medicine',
    description: 'HPCZ Accredited - Prepares students for clinical officer practice',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-environmental-health',
    name: 'Diploma in Environmental Health',
    description: 'ECZ Accredited - Environmental health and safety specialization',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-registered-nursing',
    name: 'Diploma in Registered Nursing',
    description: 'NMCZ Accredited - Professional nursing practice preparation',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
]

const DEFAULT_INTAKES = [
  {
    id: 'january-2026',
    name: 'January 2026 Intake',
    year: 2026,
    semester: 'First Semester',
    start_date: '2026-01-15',
    end_date: '2026-06-30',
    application_deadline: '2025-12-15',
    total_capacity: 200,
    available_spots: 200,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'july-2026',
    name: 'July 2026 Intake',
    year: 2026,
    semester: 'Second Semester',
    start_date: '2026-07-15',
    end_date: '2026-12-31',
    application_deadline: '2026-06-15',
    total_capacity: 200,
    available_spots: 200,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
]

const applicationSchema = z.object({
  program_id: z.string().min(1, 'Please select a program'),
  intake_id: z.string().min(1, 'Please select an intake'),
  nrc_number: z.string().optional(),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female'], { required_error: 'Please select gender' }),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed'], { required_error: 'Please select marital status' }),
  nationality: z.string().min(1, 'Nationality is required'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  postal_address: z.string().optional(),
  physical_address: z.string().min(5, 'Physical address is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_relationship: z.string().optional(),
  medical_conditions: z.string().optional(),
  disabilities: z.string().optional(),
  criminal_record: z.boolean(),
  criminal_record_details: z.string().optional(),
  professional_registration_number: z.string().optional(),
  professional_body: z.string().optional(),
  employment_status: z.enum(['Unemployed', 'Employed', 'Self-employed', 'Student'], { required_error: 'Please select employment status' }),
  employer_name: z.string().optional(),
  employer_address: z.string().optional(),
  years_of_experience: z.number().min(0).optional(),
  previous_education: z.string().min(10, 'Please provide your educational background'),
  grades_or_gpa: z.string().min(1, 'Please provide your grades/GPA'),
  motivation_letter: z.string().min(50, 'Please share your motivation'),
  career_goals: z.string().min(20, 'Please describe your career goals'),
  english_proficiency: z.enum(['Basic', 'Intermediate', 'Advanced', 'Fluent'], {
    required_error: 'Please select your English proficiency level'
  }),
  computer_skills: z.enum(['Basic', 'Intermediate', 'Advanced'], {
    required_error: 'Please select your computer skills level'
  }),
  references: z.string().min(20, 'Please provide at least one reference'),
  financial_sponsor: z.string().min(1, 'Please specify who will sponsor your studies'),
  sponsor_relationship: z.string().optional(),
  additional_info: z.string().optional(),
  payment_method: z.enum(['pay_now', 'pay_later'], { required_error: 'Please select payment option' }),
  payment_reference: z.string().optional(),
  declaration: z.boolean().refine(val => val === true, {
    message: 'You must accept the declaration to proceed'
  }),
  information_accuracy: z.boolean().refine(val => val === true, {
    message: 'You must confirm the accuracy of information provided'
  }),
  professional_conduct: z.boolean().refine(val => val === true, {
    message: 'You must agree to professional conduct standards'
  })
})

type ApplicationForm = z.infer<typeof applicationSchema>

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export default function ApplicationFormWithPayment() {
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
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [gamificationPoints, setGamificationPoints] = useState(0)
  const [achievements, setAchievements] = useState<string[]>([])
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
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  })

  const selectedProgramId = watch('program_id')
  const selectedProgram = programs.find(p => p.id === selectedProgramId)
  const paymentMethod = watch('payment_method')

  useEffect(() => {
    loadPrograms()
  }, [])

  useEffect(() => {
    if (selectedProgramId) {
      loadIntakes(selectedProgramId)
    }
  }, [selectedProgramId])

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

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep])
        setGamificationPoints(prev => prev + 10)
        
        // Add achievements
        if (currentStep === 1) setAchievements(prev => [...prev, 'Program Selected! 🎯'])
        if (currentStep === 5) setAchievements(prev => [...prev, 'Halfway There! 🚀'])
        if (currentStep === 10) setAchievements(prev => [...prev, 'Almost Done! 🏆'])
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
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
      const fileId = `${file.name}-${Date.now()}`
      setUploadingFiles(prev => [...prev, fileId])
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      try {
        const fileName = `${user?.id}/${Date.now()}-${file.name}`
        
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[fileId] || 0
            if (current >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return { ...prev, [fileId]: current + 10 }
          })
        }, 200)
        
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file)

        clearInterval(progressInterval)
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
        }, 2000)
      } catch (error: any) {
        console.error('Error uploading file:', error)
        setError(`Failed to upload ${file.name}: ${error.message}`)
        setUploadProgress(prev => {
          const { [fileId]: removed, ...rest } = prev
          return rest
        })
      } finally {
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
      setLoading(true)
      const formData = watch()
      
      // Save to localStorage as backup
      localStorage.setItem('applicationDraft', JSON.stringify(formData))
      
      // TODO: Save to database as draft
      alert('Draft saved successfully!')
    } catch (error: any) {
      console.error('Error saving draft:', error)
      setError('Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ApplicationForm) => {
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
      <motion.div 
        className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="max-w-md w-full"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <motion.div 
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
            >
              <CheckCircle className="h-8 w-8 text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-secondary mb-4">
              🎉 Application Submitted Successfully!
            </h2>
            <p className="text-secondary mb-4">
              Congratulations! You earned {gamificationPoints} points for completing your application!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium mb-2">
                🏆 Achievements Unlocked
              </p>
              <div className="space-y-1">
                {achievements.map((achievement, index) => (
                  <p key={index} className="text-xs text-blue-700">{achievement}</p>
                ))}
              </div>
            </div>
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
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/student/dashboard" className="inline-flex items-center text-primary hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            🚀 Application Form
          </h1>
          <p className="text-secondary">
            Complete your journey to academic excellence! Points: {gamificationPoints} ⭐
          </p>
        </motion.div>

        {error && (
          <motion.div 
            className="rounded-md bg-red-50 p-4 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-sm text-red-700">{error}</div>
          </motion.div>
        )}

        {/* Gamification Progress */}
        <motion.div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-6 mb-8 text-white"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6" />
              <h2 className="text-lg font-semibold">
                Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span className="font-bold">{gamificationPoints} pts</span>
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <motion.div 
              className="bg-white h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center overflow-x-auto">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1
              const isActive = stepNumber === currentStep
              const isCompleted = completedSteps.includes(stepNumber)
              
              return (
                <motion.div 
                  key={index} 
                  className="flex flex-col items-center cursor-pointer min-w-0 flex-1" 
                  onClick={() => goToStep(stepNumber)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-400 text-white' 
                        : isActive 
                        ? 'bg-white text-purple-500' 
                        : 'bg-white/30 text-white'
                    }`}
                    animate={isCompleted ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </motion.div>
                  <span className={`text-xs mt-1 text-center ${
                    isActive ? 'text-white font-medium' : 'text-white/80'
                  }`}>
                    {title}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 10: Payment */}
            {currentStep === 10 && (
              <motion.div 
                key="payment"
                className="bg-white rounded-lg shadow p-6"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
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
                      <motion.label 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          paymentMethod === 'pay_now' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
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
                      </motion.label>

                      <motion.label 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          paymentMethod === 'pay_later' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
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
                      </motion.label>
                    </div>
                    {errors.payment_method && (
                      <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                    )}
                  </div>

                  {paymentMethod === 'pay_now' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-medium text-yellow-800 mb-2">Payment Instructions:</h3>
                        <ol className="text-sm text-yellow-700 space-y-1">
                          <li>1. Send K150 to MTN Money number: <strong>{getPaymentNumber()}</strong></li>
                          <li>2. Take a screenshot of the transaction confirmation</li>
                          <li>3. Upload the screenshot as payment proof below</li>
                          <li>4. Enter the transaction reference number</li>
                        </ol>
                      </div>

                      <div>
                        <Input
                          {...register('payment_reference')}
                          label="Transaction Reference Number"
                          placeholder="Enter MTN Money transaction ID"
                          error={errors.payment_reference?.message}
                        />
                      </div>

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
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <motion.div 
            className="flex justify-between items-center pt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Button type="button" variant="ghost" onClick={saveDraft}>
                💾 Save Draft
              </Button>
              
              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep}>
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
                  🚀 Submit Application
                </Button>
              )}
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  )
}