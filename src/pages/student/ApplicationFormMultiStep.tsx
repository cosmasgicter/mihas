import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Upload, X, FileText, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DEFAULT_PROGRAMS, DEFAULT_INTAKES, applicationSchema, ApplicationFormData, UploadedFile } from '@/forms/applicationSchema'

export default function ApplicationFormMultiStep() {
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
  const totalSteps = 10

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
    'Review & Submit'
  ]

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormData>({
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
        // Filter to only show the three specific programs
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

  const loadIntakes = (programId: string) => {
    setIntakes(DEFAULT_INTAKES)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const newFileIds = fileArray.map(file => `${file.name}-${Date.now()}`)
    
    setUploadingFiles(prev => [...prev, ...newFileIds])
    setUploadProgress(prev => ({
      ...prev,
      ...Object.fromEntries(newFileIds.map(id => [id, 0]))
    }))

    const uploadPromises = fileArray.map(async (file, i) => {
      const fileId = newFileIds[i]
      const fileName = `${user?.id}/${Date.now()}-${file.name}`
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('application-documents')
          .getPublicUrl(fileName)

        return {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        setError(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`)
        setUploadingFiles(prev => prev.filter(id => id !== fileId))
        setUploadProgress(prev => {
          const { [fileId]: removed, ...rest } = prev
          return rest
        })
        return null
      }
    })

    const results = await Promise.allSettled(uploadPromises)
    const successfulUploads = results
      .filter((result): result is PromiseFulfilledResult<UploadedFile> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)

    setUploadedFiles(prev => [...prev, ...successfulUploads])
    setUploadingFiles([])
    setUploadProgress({})
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

  const insertDocuments = async (applicationId: string) => {
    const documentInserts = uploadedFiles.map(file => ({
      application_id: applicationId,
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
          postal_address: data.postal_address,
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
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (applicationError) throw applicationError

      if (uploadedFiles.length > 0) {
        await insertDocuments(application.id)
      }

      setSuccess(true)
    } catch (error) {
      console.error('Error submitting application:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit application')
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
        <div className="mb-8">
          <Link to="/student/dashboard" className="inline-flex items-center text-primary hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Application Form
          </h1>
          <p className="text-secondary">
            Complete all sections to submit your application.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Multi-Step Navigation */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary">
              Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
            </h2>
            <div className="text-sm text-secondary">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between items-center overflow-x-auto">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1
              const isActive = stepNumber === currentStep
              const isCompleted = stepNumber < currentStep
              
              return (
                <div key={index} className="flex flex-col items-center cursor-pointer min-w-0 flex-1" onClick={() => goToStep(stepNumber)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-200 text-gray-600'
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
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Input
                    {...register('nationality')}
                    label="Nationality"
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
                  <Input
                    {...register('district')}
                    label="District"
                    placeholder="Enter your district"
                    error={errors.district?.message}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <div>
                  <TextArea
                    {...register('postal_address')}
                    label="Postal Address (Optional)"
                    placeholder="P.O. Box 123, City, Province"
                    rows={2}
                    error={errors.postal_address?.message}
                  />
                </div>
                
                <div>
                  <TextArea
                    {...register('physical_address')}
                    label="Physical Address"
                    placeholder="House number, street, area, city"
                    rows={2}
                    error={errors.physical_address?.message}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Document Upload - Available on steps 3+ */}
          {currentStep >= 3 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Supporting Documents
              </h2>
              
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

              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(uploadProgress).map(([fileId, progress]) => {
                    const fileName = uploadedFiles.find(f => f.id === fileId)?.name || fileId.split('-')[0]
                    return (
                      <div key={fileId} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-secondary">{fileName}</span>
                          <span className="text-sm text-primary">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex space-x-4">
              <Link to="/student/dashboard">
                <Button type="button" variant="ghost">
                  Save as Draft
                </Button>
              </Link>
              
              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep}>
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