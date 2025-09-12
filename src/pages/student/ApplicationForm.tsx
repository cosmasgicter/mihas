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
import { ArrowLeft, Upload, X, FileText, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

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
  // Program Selection
  program_id: z.string().min(1, 'Please select a program'),
  intake_id: z.string().min(1, 'Please select an intake'),
  
  // Personal Information (Zambian Standards)
  nrc_number: z.string().regex(/^\d{6}\/\d{2}\/\d{1}$/, 'NRC must be in format 123456/12/1').optional().or(z.literal('')),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female'], { required_error: 'Please select gender' }),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed'], { required_error: 'Please select marital status' }),
  nationality: z.string().min(1, 'Nationality is required'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  postal_address: z.string().min(10, 'Postal address is required'),
  physical_address: z.string().min(10, 'Physical address is required'),
  
  // Guardian Information (for students under 21)
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_relationship: z.string().optional(),
  
  // Health Information
  medical_conditions: z.string().optional(),
  disabilities: z.string().optional(),
  
  // Legal Information
  criminal_record: z.boolean(),
  criminal_record_details: z.string().optional(),
  
  // Professional Information
  professional_registration_number: z.string().optional(),
  professional_body: z.string().optional(),
  employment_status: z.enum(['Unemployed', 'Employed', 'Self-employed', 'Student'], { required_error: 'Please select employment status' }),
  employer_name: z.string().optional(),
  employer_address: z.string().optional(),
  years_of_experience: z.number().min(0).optional(),
  
  // Educational Background
  previous_education: z.string().min(50, 'Please provide detailed educational background (minimum 50 characters)'),
  grades_or_gpa: z.string().min(1, 'Please provide your grades/GPA'),
  
  // Motivation and Goals
  motivation_letter: z.string().min(200, 'Motivation letter must be at least 200 characters'),
  career_goals: z.string().min(100, 'Please describe your career goals (minimum 100 characters)'),
  
  // Skills Assessment
  english_proficiency: z.enum(['Basic', 'Intermediate', 'Advanced', 'Fluent'], {
    required_error: 'Please select your English proficiency level'
  }),
  computer_skills: z.enum(['Basic', 'Intermediate', 'Advanced'], {
    required_error: 'Please select your computer skills level'
  }),
  
  // References
  references: z.string().min(100, 'Please provide detailed references (minimum 100 characters)'),
  
  // Financial Information
  financial_sponsor: z.string().min(1, 'Please specify who will sponsor your studies'),
  sponsor_relationship: z.string().optional(),
  
  // Additional Information
  additional_info: z.string().optional(),
  
  // Declarations
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

interface ExtendedApplication extends Application {
  nrc_number?: string
  passport_number?: string
  date_of_birth?: string
  gender?: string
  marital_status?: string
  nationality?: string
  province?: string
  district?: string
  postal_address?: string
  physical_address?: string
  guardian_name?: string
  guardian_phone?: string
  guardian_relationship?: string
  medical_conditions?: string
  disabilities?: string
  criminal_record?: boolean
  criminal_record_details?: string
  professional_registration_number?: string
  professional_body?: string
  employment_status?: string
  employer_name?: string
  employer_address?: string
  years_of_experience?: number
  motivation_letter?: string
  career_goals?: string
  financial_sponsor?: string
  sponsor_relationship?: string
  grades_or_gpa?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
}

export default function ApplicationFormPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  })

  const selectedProgramId = watch('program_id')

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
        setPrograms(data)
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
      const { data, error } = await supabase
        .from('program_intakes')
        .select(`
          *,
          intakes(*)
        `)
        .eq('program_id', programId)
        .eq('intakes.is_active', true)
        .gte('intakes.application_deadline', new Date().toISOString())
        .order('intakes.application_deadline')

      if (error) throw error
      
      const intakeData = data?.map(pi => pi.intakes).filter(Boolean) || []
      
      // If no intakes from database, use default 2026 intakes
      if (intakeData.length === 0) {
        setIntakes(DEFAULT_INTAKES)
      } else {
        setIntakes(intakeData)
      }
    } catch (error: any) {
      console.error('Error loading intakes:', error)
      // Fallback to default intakes
      setIntakes(DEFAULT_INTAKES)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      const fileId = `${file.name}-${Date.now()}`
      setUploadingFiles(prev => [...prev, fileId])

      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user?.id}/${Date.now()}-${file.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file)

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
      } catch (error: any) {
        console.error('Error uploading file:', error)
        setError(`Failed to upload ${file.name}: ${error.message}`)
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

  const onSubmit = async (data: ApplicationForm) => {
    try {
      setLoading(true)
      setError('')

      // Create application record
      // Generate application number and tracking code
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
          // Personal Information
          nrc_number: data.nrc_number || null,
          passport_number: data.passport_number || null,
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          marital_status: data.marital_status,
          nationality: data.nationality,
          province: data.province,
          district: data.district,
          postal_address: data.postal_address,
          physical_address: data.physical_address,
          // Guardian Information
          guardian_name: data.guardian_name || null,
          guardian_phone: data.guardian_phone || null,
          guardian_relationship: data.guardian_relationship || null,
          // Health and Legal
          medical_conditions: data.medical_conditions || null,
          disabilities: data.disabilities || null,
          criminal_record: data.criminal_record || false,
          criminal_record_details: data.criminal_record_details || null,
          // Professional Information
          professional_registration_number: data.professional_registration_number || null,
          professional_body: data.professional_body || null,
          employment_status: data.employment_status,
          employer_name: data.employer_name || null,
          employer_address: data.employer_address || null,
          years_of_experience: data.years_of_experience || 0,
          // Educational Background
          previous_education: data.previous_education,
          grades_or_gpa: data.grades_or_gpa,
          // Motivation and Goals
          motivation_letter: data.motivation_letter,
          career_goals: data.career_goals,
          // Skills
          english_proficiency: data.english_proficiency,
          computer_skills: data.computer_skills,
          // References and Financial
          references: data.references,
          financial_sponsor: data.financial_sponsor,
          sponsor_relationship: data.sponsor_relationship || null,
          // Additional
          additional_info: data.additional_info || null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (applicationError) throw applicationError

      // Create document records for uploaded files
      if (uploadedFiles.length > 0) {
        const documentInserts = uploadedFiles.map(file => ({
          application_id: application.id,
          document_type: 'supporting_document',
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
            <p className="text-secondary mb-4">
              Your application has been submitted and is now under review. You will receive email updates about the status of your application.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Track Your Application Status
              </p>
              <p className="text-xs text-blue-700">
                You can check your application status anytime using the public tracking system. 
                No login required - just use your application number or tracking code.
              </p>
            </div>
            <div className="space-y-3">
              <Link to="/student/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/apply">
                <Button variant="outline" className="w-full">
                  Submit Another Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-primary hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Application Form
          </h1>
          <p className="text-secondary">
            Complete all sections to submit your application to programs at Kalulushi Training Centre or Mukuba Institute of Health and Applied Sciences.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Program Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Program Selection
            </h2>
            <p className="text-sm text-secondary mb-4">
              Select from our three accredited programs meeting Zambian professional standards.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Program <span className="text-red-500">*</span>
                </label>
                {programsLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <select
                    {...register('program_id')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select a program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.program_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.program_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Intake <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('intake_id')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={!selectedProgramId}
                >
                  <option value="">Select an intake</option>
                  {intakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>
                      {intake.name} - Deadline: {new Date(intake.application_deadline).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {errors.intake_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.intake_id.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Personal Information
            </h2>
            <p className="text-sm text-secondary mb-4">
              Provide accurate personal details as required by Zambian institutions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  NRC Number
                </label>
                <Input
                  {...register('nrc_number')}
                  placeholder="123456/12/1"
                  error={errors.nrc_number?.message}
                  helperText="Format: 123456/12/1 (Leave blank if using passport)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Passport Number
                </label>
                <Input
                  {...register('passport_number')}
                  placeholder="Enter passport number"
                  error={errors.passport_number?.message}
                  helperText="Required if no NRC provided"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  {...register('date_of_birth')}
                  error={errors.date_of_birth?.message}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('gender')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Marital Status <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('marital_status')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select marital status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
                {errors.marital_status && (
                  <p className="mt-1 text-sm text-red-600">{errors.marital_status.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('nationality')}
                  defaultValue="Zambian"
                  error={errors.nationality?.message}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Province <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('province')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select province</option>
                  <option value="Central">Central</option>
                  <option value="Copperbelt">Copperbelt</option>
                  <option value="Eastern">Eastern</option>
                  <option value="Luapula">Luapula</option>
                  <option value="Lusaka">Lusaka</option>
                  <option value="Muchinga">Muchinga</option>
                  <option value="Northern">Northern</option>
                  <option value="North-Western">North-Western</option>
                  <option value="Southern">Southern</option>
                  <option value="Western">Western</option>
                </select>
                {errors.province && (
                  <p className="mt-1 text-sm text-red-600">{errors.province.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('district')}
                  placeholder="Enter your district"
                  error={errors.district?.message}
                  required
                />
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Postal Address <span className="text-red-500">*</span>
                </label>
                <TextArea
                  {...register('postal_address')}
                  placeholder="P.O. Box 123, City, Province"
                  rows={2}
                  error={errors.postal_address?.message}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Physical Address <span className="text-red-500">*</span>
                </label>
                <TextArea
                  {...register('physical_address')}
                  placeholder="House number, street, area, city"
                  rows={2}
                  error={errors.physical_address?.message}
                  required
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Guardian Information
            </h2>
            <p className="text-sm text-secondary mb-4">
              Required for applicants under 21 years of age or as emergency contact.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Guardian/Parent Name
                </label>
                <Input
                  {...register('guardian_name')}
                  placeholder="Full name of guardian/parent"
                  error={errors.guardian_name?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Guardian Phone Number
                </label>
                <Input
                  {...register('guardian_phone')}
                  placeholder="+260 XXX XXX XXX"
                  error={errors.guardian_phone?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Relationship
                </label>
                <select
                  {...register('guardian_relationship')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
                {errors.guardian_relationship && (
                  <p className="mt-1 text-sm text-red-600">{errors.guardian_relationship.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Health and Legal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Health and Legal Information
            </h2>
            <p className="text-sm text-secondary mb-4">
              Required for professional registration with NMCZ, HPCZ, or ECZ.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Medical Conditions
                </label>
                <TextArea
                  {...register('medical_conditions')}
                  placeholder="List any medical conditions that may affect your studies or practice (or write 'None')"
                  rows={3}
                  error={errors.medical_conditions?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Disabilities or Special Needs
                </label>
                <TextArea
                  {...register('disabilities')}
                  placeholder="Describe any disabilities or special accommodations needed (or write 'None')"
                  rows={3}
                  error={errors.disabilities?.message}
                />
              </div>
              
              <div>
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    {...register('criminal_record')}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <div className="text-sm">
                    <label className="font-medium text-secondary">
                      I have a criminal record
                    </label>
                    <p className="text-secondary text-xs mt-1">
                      Check this box if you have any criminal convictions
                    </p>
                  </div>
                </div>
                {errors.criminal_record && (
                  <p className="mt-2 text-sm text-red-600">{errors.criminal_record.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Criminal Record Details
                </label>
                <TextArea
                  {...register('criminal_record_details')}
                  placeholder="If you checked the box above, provide details of your criminal record"
                  rows={3}
                  error={errors.criminal_record_details?.message}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Professional and Employment Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Professional Registration Number
                </label>
                <Input
                  {...register('professional_registration_number')}
                  placeholder="If already registered with NMCZ/HPCZ/ECZ"
                  error={errors.professional_registration_number?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Professional Body
                </label>
                <select
                  {...register('professional_body')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select if applicable</option>
                  <option value="NMCZ">Nursing and Midwifery Council of Zambia (NMCZ)</option>
                  <option value="HPCZ">Health Professions Council of Zambia (HPCZ)</option>
                  <option value="ECZ">Environmental Council of Zambia (ECZ)</option>
                  <option value="Other">Other</option>
                </select>
                {errors.professional_body && (
                  <p className="mt-1 text-sm text-red-600">{errors.professional_body.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('employment_status')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select employment status</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Student">Student</option>
                </select>
                {errors.employment_status && (
                  <p className="mt-1 text-sm text-red-600">{errors.employment_status.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Years of Experience
                </label>
                <Input
                  type="number"
                  {...register('years_of_experience', { valueAsNumber: true })}
                  placeholder="0"
                  min="0"
                  error={errors.years_of_experience?.message}
                />
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Current/Previous Employer Name
                </label>
                <Input
                  {...register('employer_name')}
                  placeholder="Name of current or most recent employer"
                  error={errors.employer_name?.message}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Employer Address
                </label>
                <TextArea
                  {...register('employer_address')}
                  placeholder="Address of current or most recent employer"
                  rows={2}
                  error={errors.employer_address?.message}
                />
              </div>
            </div>
          </div>

          {/* Motivation and Career Goals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Motivation and Career Goals
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Motivation Letter <span className="text-red-500">*</span>
                </label>
                <TextArea
                  {...register('motivation_letter')}
                  placeholder="Explain why you want to join this program, your passion for the field, and how it aligns with your career aspirations..."
                  rows={6}
                  error={errors.motivation_letter?.message}
                  helperText="Minimum 200 characters - Be specific about your motivation"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Career Goals <span className="text-red-500">*</span>
                </label>
                <TextArea
                  {...register('career_goals')}
                  placeholder="Describe your short-term and long-term career goals, and how this program will help you achieve them..."
                  rows={4}
                  error={errors.career_goals?.message}
                  helperText="Minimum 100 characters - Include specific career objectives"
                  required
                />
              </div>
            </div>
          </div>

          {/* Educational Background */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Educational Background
            </h2>
            <p className="text-sm text-secondary mb-4">
              Provide detailed information about your educational qualifications.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Previous Education <span className="text-red-500">*</span>
                </label>
                <TextArea
                  {...register('previous_education')}
                  placeholder="List all educational qualifications including:
- Institution names and locations
- Qualifications obtained (Grade 12, Certificate, Diploma, etc.)
- Years of study and completion
- Subjects studied
- Any relevant coursework"
                  rows={6}
                  error={errors.previous_education?.message}
                  helperText="Minimum 50 characters - Be comprehensive and accurate"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Grades/GPA <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('grades_or_gpa')}
                  placeholder="e.g., Grade 12: 6 points, Diploma: Merit, GPA: 3.5/4.0"
                  error={errors.grades_or_gpa?.message}
                  helperText="Provide your most recent academic performance"
                  required
                />
              </div>
            </div>
          </div>

          {/* Skills Assessment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Skills Assessment
            </h2>
            <p className="text-sm text-secondary mb-4">
              Assess your language and technical skills honestly.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  English Proficiency <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('english_proficiency')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select proficiency level</option>
                  <option value="Basic">Basic - Can understand simple phrases</option>
                  <option value="Intermediate">Intermediate - Can communicate effectively</option>
                  <option value="Advanced">Advanced - Fluent in most situations</option>
                  <option value="Fluent">Fluent - Native or near-native level</option>
                </select>
                {errors.english_proficiency && (
                  <p className="mt-1 text-sm text-red-600">{errors.english_proficiency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Computer Skills <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('computer_skills')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select skill level</option>
                  <option value="Basic">Basic - Can use email and browse internet</option>
                  <option value="Intermediate">Intermediate - Proficient with MS Office</option>
                  <option value="Advanced">Advanced - Can use specialized software</option>
                </select>
                {errors.computer_skills && (
                  <p className="mt-1 text-sm text-red-600">{errors.computer_skills.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* References */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              References
            </h2>
            <p className="text-sm text-secondary mb-4">
              Provide at least two professional or academic references who can vouch for your character and abilities.
            </p>
            
            <TextArea
              {...register('references')}
              label="Professional/Academic References"
              placeholder="For each reference, provide:
1. Full name and title
2. Institution/Organization
3. Relationship to you
4. Phone number and email
5. How long they have known you

Example:
1. Dr. John Smith, Senior Lecturer
   University of Zambia, School of Medicine
   Former lecturer, +260 XXX XXX XXX, j.smith@unza.zm
   Known for 2 years"
              rows={8}
              error={errors.references?.message}
              helperText="Minimum 100 characters - Include complete contact information"
              required
            />
          </div>

          {/* Financial Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Financial Information
            </h2>
            <p className="text-sm text-secondary mb-4">
              Information about how you plan to finance your studies.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Financial Sponsor <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('financial_sponsor')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select sponsor</option>
                  <option value="Self">Self-sponsored</option>
                  <option value="Parents/Family">Parents/Family</option>
                  <option value="Employer">Employer</option>
                  <option value="Government Bursary">Government Bursary</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Loan">Student Loan</option>
                  <option value="Other">Other</option>
                </select>
                {errors.financial_sponsor && (
                  <p className="mt-1 text-sm text-red-600">{errors.financial_sponsor.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Sponsor Relationship
                </label>
                <Input
                  {...register('sponsor_relationship')}
                  placeholder="e.g., Father, Employer, etc."
                  error={errors.sponsor_relationship?.message}
                  helperText="Required if sponsor is not self"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Supporting Documents
            </h2>
            <p className="text-sm text-secondary mb-4">
              Upload supporting documents such as certificates, transcripts, ID copy, etc. (Optional but recommended)
            </p>
            
            <div className="mb-4">
              <label className="block">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/40 cursor-pointer transition-colors">
                  <Upload className="h-8 w-8 text-secondary mx-auto mb-2" />
                  <p className="text-sm text-secondary">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-secondary">
                    PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB each
                  </p>
                </div>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-secondary">{file.name}</p>
                        <p className="text-xs text-secondary">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {uploadingFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-primary">Uploading {uploadingFiles.length} file(s)...</p>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Additional Information
            </h2>
            <TextArea
              {...register('additional_info')}
              label="Additional Information (Optional)"
              placeholder="Any additional information you would like to share..."
              rows={3}
              error={errors.additional_info?.message}
            />
          </div>

          {/* Declarations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4">
              Declarations and Agreements
            </h2>
            <p className="text-sm text-secondary mb-6">
              Please read and accept all declarations below to complete your application.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  {...register('declaration')}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <div className="text-sm text-secondary">
                  <p className="font-medium mb-2">
                    General Declaration
                  </p>
                  <p className="mb-2">
                    I declare that the information provided in this application is true and complete to the best of my knowledge. I understand that:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-secondary">
                    <li>False information may result in rejection of my application or dismissal from the program</li>
                    <li>I must provide original documents upon request for verification</li>
                    <li>The institution reserves the right to verify all information provided</li>
                    <li>Application fees are non-refundable regardless of admission decision</li>
                    <li>I will comply with all institutional policies and regulations</li>
                  </ul>
                </div>
              </div>
              {errors.declaration && (
                <p className="text-sm text-red-600">{errors.declaration.message}</p>
              )}
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  {...register('information_accuracy')}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <div className="text-sm text-secondary">
                  <p className="font-medium mb-2">
                    Information Accuracy Confirmation
                  </p>
                  <p>
                    I confirm that all personal, educational, and professional information provided is accurate and up-to-date. I understand that any discrepancies discovered during verification may lead to application rejection or program dismissal.
                  </p>
                </div>
              </div>
              {errors.information_accuracy && (
                <p className="text-sm text-red-600">{errors.information_accuracy.message}</p>
              )}
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  {...register('professional_conduct')}
                  className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <div className="text-sm text-secondary">
                  <p className="font-medium mb-2">
                    Professional Conduct Agreement
                  </p>
                  <p>
                    I agree to uphold the highest standards of professional conduct as required by the relevant professional bodies (NMCZ, HPCZ, ECZ). I understand that any breach of professional ethics may result in disciplinary action and potential exclusion from professional registration.
                  </p>
                </div>
              </div>
              {errors.professional_conduct && (
                <p className="text-sm text-red-600">{errors.professional_conduct.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link to="/student/dashboard">
              <Button type="button" variant="outline">
                Save as Draft
              </Button>
            </Link>
            <Button type="submit" loading={loading}>
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}