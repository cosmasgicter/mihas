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
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DEFAULT_PROGRAMS, DEFAULT_INTAKES, applicationSchema, ApplicationFormData, UploadedFile } from '@/forms/applicationSchema'
import { StepNavigation } from '@/components/application/StepNavigation'
import { DocumentUpload } from '@/components/application/DocumentUpload'
import { useApplicationSubmit } from '@/hooks/useApplicationSubmit'
import { uploadFile, STORAGE_CONFIGS } from '@/lib/storage'

export default function ApplicationFormMultiStep() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/signin?redirect=/student/application-multi')
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
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const [currentStep, setCurrentStep] = useState(1)
  
  const { submitApplication, loading, error, success } = useApplicationSubmit(user, uploadedFiles)
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
      console.error('Failed to load programs')
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
      
      try {
        // Update progress to show upload starting
        setUploadProgress(prev => ({ ...prev, [fileId]: 10 }))
        
        // Use the new storage utility
        const result = await uploadFile(file, STORAGE_CONFIGS.applicationDocuments, `${user?.id}/${Date.now()}-${file.name}`)
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        // Update progress to complete
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))

        return {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: result.url || ''
        }
      } catch (error) {
        console.error('Error uploading file:', error)
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
        result.status === 'fulfilled' && result.value !== null && result.value.url !== undefined
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
      throw documentsError
    }
  }

  const onSubmit = (data: ApplicationFormData) => {
    submitApplication(data)
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

        <StepNavigation 
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepTitles={stepTitles}
          onStepClick={goToStep}
        />

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
            <DocumentUpload
              uploadedFiles={uploadedFiles}
              uploadingFiles={uploadingFiles}
              uploadProgress={uploadProgress}
              onFileUpload={handleFileUpload}
              onRemoveFile={removeFile}
              formatFileSize={formatFileSize}
            />
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