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
    description: '',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-environmental-health',
    name: 'Diploma in Environmental Health',
    description: '',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-registered-nursing',
    name: 'Diploma in Registered Nursing',
    description: '',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
]

const applicationSchema = z.object({
  program_id: z.string().min(1, 'Please select a program'),
  intake_id: z.string().min(1, 'Please select an intake'),
  personal_statement: z.string().min(100, 'Personal statement must be at least 100 characters'),
  previous_education: z.string().min(10, 'Please provide your educational background'),
  work_experience: z.string().optional(),
  english_proficiency: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Native'], {
    required_error: 'Please select your English proficiency level'
  }),
  computer_skills: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    required_error: 'Please select your computer skills level'
  }),
  references: z.string().min(20, 'Please provide at least one reference'),
  additional_info: z.string().optional(),
  declaration: z.boolean().refine(val => val === true, {
    message: 'You must accept the declaration to proceed'
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
      setIntakes(intakeData)
    } catch (error: any) {
      console.error('Error loading intakes:', error)
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
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          user_id: user?.id,
          program_id: data.program_id,
          intake_id: data.intake_id,
          personal_statement: data.personal_statement,
          previous_education: data.previous_education,
          work_experience: data.work_experience,
          english_proficiency: data.english_proficiency,
          computer_skills: data.computer_skills,
          references: data.references,
          additional_info: data.additional_info,
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application has been submitted and is now under review. You will receive email updates about the status of your application.
            </p>
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
          <Link to="/student/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Application Form
          </h1>
          <p className="text-gray-600">
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Program Selection
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program <span className="text-red-500">*</span>
                </label>
                {programsLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <select
                    {...register('program_id')}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intake <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('intake_id')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          {/* Personal Statement */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Statement
            </h2>
            <TextArea
              {...register('personal_statement')}
              label="Why do you want to join this program?"
              placeholder="Explain your motivation, goals, and how this program aligns with your career aspirations..."
              rows={6}
              error={errors.personal_statement?.message}
              helperText="Minimum 100 characters"
              required
            />
          </div>

          {/* Educational Background */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Educational Background
            </h2>
            <div className="space-y-6">
              <TextArea
                {...register('previous_education')}
                label="Previous Education"
                placeholder="List your educational qualifications, institutions, grades, and years of completion..."
                rows={4}
                error={errors.previous_education?.message}
                required
              />
              
              <TextArea
                {...register('work_experience')}
                label="Work Experience (Optional)"
                placeholder="Describe any relevant work experience, internships, or volunteer work..."
                rows={3}
                error={errors.work_experience?.message}
              />
            </div>
          </div>

          {/* Skills Assessment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Skills Assessment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  English Proficiency <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('english_proficiency')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select proficiency level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Native">Native</option>
                </select>
                {errors.english_proficiency && (
                  <p className="mt-1 text-sm text-red-600">{errors.english_proficiency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Computer Skills <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('computer_skills')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                {errors.computer_skills && (
                  <p className="mt-1 text-sm text-red-600">{errors.computer_skills.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* References */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              References
            </h2>
            <TextArea
              {...register('references')}
              label="Professional/Academic References"
              placeholder="Provide at least two references with names, positions, institutions, and contact information..."
              rows={4}
              error={errors.references?.message}
              required
            />
          </div>

          {/* Document Upload */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Supporting Documents
            </h2>
            <p className="text-sm text-gray-600 mb-4">
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 cursor-pointer transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
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
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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
                <p className="text-sm text-blue-600">Uploading {uploadingFiles.length} file(s)...</p>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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

          {/* Declaration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Declaration
            </h2>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                {...register('declaration')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  I declare that the information provided in this application is true and complete to the best of my knowledge. I understand that:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                  <li>False information may result in rejection of my application</li>
                  <li>I must provide original documents upon request</li>
                  <li>The institution reserves the right to verify all information</li>
                  <li>Application fees are non-refundable</li>
                </ul>
              </div>
            </div>
            {errors.declaration && (
              <p className="mt-2 text-sm text-red-600">{errors.declaration.message}</p>
            )}
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