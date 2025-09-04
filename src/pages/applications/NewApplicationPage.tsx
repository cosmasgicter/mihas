import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Textarea } from '../../components/ui/textarea'
import { useToast } from '../../hooks/use-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useApplications, useAcademicPrograms, useAcademicYears } from '../../hooks/useApplications'
import { AcademicProgram, supabase } from '../../lib/supabase'
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle, X, User, GraduationCap, Loader2 } from 'lucide-react'

interface ApplicationFormData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    gender: string
    nationality: string
    address: string
    emergencyContactName: string
    emergencyContactPhone: string
    emergencyContactRelation: string
  }
  academicInfo: {
    programId: string
    academicYearId: string
    previousSchool: string
    graduationYear: string
    grades: Array<{
      subject: string
      score: string
      grade: string
    }>
  }
  supportingInfo: {
    motivation: string
    careerGoals: string
    healthConditions: string
    additionalInfo: string
  }
}

interface DocumentUpload {
  type: string
  name: string
  file: File | null
  uploaded: boolean
  url?: string
}

const ZAMBIAN_SUBJECTS = [
  'Agricultural Science', 'Biology', 'Chemistry', 'Physics', 'Mathematics',
  'Additional Mathematics', 'English Language', 'Computer Studies',
  'Design & Technology', 'Science', 'French', 'Art & Design',
  'Commerce', 'Principles of Accounts', 'Civic Education', 'Religious Education'
]

const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { submitApplication } = useApplications()
  const { getPrograms } = useAcademicPrograms()
  const { getCurrentAcademicYear } = useAcademicYears()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [programs, setPrograms] = useState<AcademicProgram[]>([])
  const [currentAcademicYear, setCurrentAcademicYear] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: user?.phone || '',
      dateOfBirth: '',
      gender: '',
      nationality: 'Zambian',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: ''
    },
    academicInfo: {
      programId: '',
      academicYearId: '',
      previousSchool: '',
      graduationYear: '',
      grades: []
    },
    supportingInfo: {
      motivation: '',
      careerGoals: '',
      healthConditions: '',
      additionalInfo: ''
    }
  })
  
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: 'id_card', name: 'National Registration Card', file: null, uploaded: false },
    { type: 'ecz_results', name: 'ECZ Results (Grade 12)', file: null, uploaded: false },
    { type: 'birth_certificate', name: 'Birth Certificate', file: null, uploaded: false },
    { type: 'passport_photo', name: 'Passport Photo', file: null, uploaded: false }
  ])
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [programsData, academicYearData] = await Promise.all([
        getPrograms(),
        getCurrentAcademicYear()
      ])
      
      setPrograms(programsData)
      setCurrentAcademicYear(academicYearData)
      
      if (academicYearData) {
        setFormData(prev => ({
          ...prev,
          academicInfo: {
            ...prev.academicInfo,
            academicYearId: academicYearData.id
          }
        }))
      }
      
      // Pre-populate with 6 core subjects for Grade 12 ECZ Results
      const coreSubjects = ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Civic Education']
      setFormData(prev => ({
        ...prev,
        academicInfo: {
          ...prev.academicInfo,
          grades: coreSubjects.map(subject => ({
            subject,
            score: '',
            grade: ''
          }))
        }
      }))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load application data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const updateGrade = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      academicInfo: {
        ...prev.academicInfo,
        grades: prev.academicInfo.grades.map((grade, i) => 
          i === index ? { ...grade, [field]: value, grade: field === 'score' ? calculateGrade(parseInt(value)) : grade.grade } : grade
        )
      }
    }))
  }
  
  const calculateGrade = (score: number): string => {
    if (score >= 1 && score <= 2) return 'Distinction'
    if (score >= 3 && score <= 4) return 'Merit'
    if (score >= 5 && score <= 6) return 'Credit'
    if (score >= 7 && score <= 8) return 'Pass'
    if (score === 9) return 'Fail'
    return ''
  }
  
  const handleFileUpload = async (docIndex: number, file: File) => {
    if (!file) return
    
    try {
      setDocuments(prev => prev.map((doc, index) => 
        index === docIndex 
          ? { ...doc, file, name: file.name }
          : doc
      ))
      
      toast({
        title: 'File Selected',
        description: `${file.name} is ready to upload`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process file',
        variant: 'destructive'
      })
    }
  }
  
  const validateStep = (step: number) => {
    switch (step) {
      case 1: // Program Selection
        return formData.academicInfo.programId
      case 2: { // Personal Info
        const { personalInfo } = formData
        return (
          personalInfo.firstName &&
          personalInfo.lastName &&
          personalInfo.dateOfBirth &&
          personalInfo.gender &&
          personalInfo.email &&
          personalInfo.phone &&
          personalInfo.address
        )
      }
      case 3: { // Academic Info
        const { academicInfo } = formData
        return (
          academicInfo.previousSchool &&
          academicInfo.graduationYear &&
          academicInfo.grades.every(g => g.subject && g.score && g.grade)
        )
      }
      case 4: // Documents
        return documents.filter(doc => doc.file).length >= 3
      default:
        return true
    }
  }
  
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all required fields before proceeding',
        variant: 'destructive'
      })
    }
  }
  
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const submitApplicationData = async () => {
    if (!user || !validateStep(4)) {
      toast({
        title: 'Error',
        description: 'Please complete all required fields',
        variant: 'destructive'
      })
      return
    }
    
    setSubmitting(true)
    
    try {
      // Submit application
      const applicationResponse = await submitApplication({
        personalInfo: formData.personalInfo,
        academicBackground: {
          previousSchool: formData.academicInfo.previousSchool,
          graduationYear: formData.academicInfo.graduationYear,
          grades: formData.academicInfo.grades
        },
        programId: formData.academicInfo.programId,
        academicYearId: formData.academicInfo.academicYearId,
        additionalInfo: {
          motivation: formData.supportingInfo.motivation,
          careerGoals: formData.supportingInfo.careerGoals,
          healthConditions: formData.supportingInfo.healthConditions,
          additionalInfo: formData.supportingInfo.additionalInfo
        }
      })
      
      const applicationId = applicationResponse.data.application.id
      
      // Upload documents using Supabase function
      const documentUploads = documents
        .filter(doc => doc.file)
        .map(async (doc) => {
          const base64 = await fileToBase64(doc.file!)
          
          const { data, error } = await supabase.functions.invoke('upload-document', {
            body: {
              applicationId,
              documentType: doc.type,
              fileName: doc.file!.name,
              fileData: base64,
              fileSize: doc.file!.size,
              mimeType: doc.file!.type
            }
          })
          
          if (error) throw error
          return data
        })
      
      if (documentUploads.length > 0) {
        await Promise.all(documentUploads)
      }
      
      toast({
        title: 'Application Submitted Successfully!',
        description: 'Your application has been created. You can now proceed to payment.'
      })
      
      // Navigate to payment page
      navigate(`/payment/${applicationId}`)
      
    } catch (error: any) {
      console.error('Application submission error:', error)
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    )
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GraduationCap className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Nursing Diploma Program</h2>
              <p className="text-gray-600">Apply for the Nursing Diploma program for the 2025-2026 academic year at MIHAS</p>
            </div>
            
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program">Academic Program *</Label>
                <Select
                  value={formData.academicInfo.programId}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    academicInfo: { ...prev.academicInfo, programId: value }
                  }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Nursing Diploma" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{program.program_name}</span>
                          <span className="text-sm text-gray-500">{program.program_code} • {program.duration_years} years</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {programs.length > 0 && formData.academicInfo.programId && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Program Selected:</strong> Nursing Diploma - A comprehensive 3-year program preparing you for professional nursing practice in healthcare settings.
                  </AlertDescription>
                </Alert>
              )}

              {programs.length === 0 && (
                <Alert>
                  <AlertDescription>
                    The Nursing Diploma program is currently available for applications. Please wait while we load the program details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
              <p className="text-gray-600">Please provide your personal details as they appear on official documents</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.personalInfo.firstName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, firstName: e.target.value }
                  }))}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.personalInfo.lastName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, lastName: e.target.value }
                  }))}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.personalInfo.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, email: e.target.value }
                  }))}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.personalInfo.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, phone: e.target.value }
                  }))}
                  placeholder="+260 971 234 567"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.personalInfo.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                  }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.personalInfo.gender}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, gender: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Input
                  id="nationality"
                  value={formData.personalInfo.nationality}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, nationality: e.target.value }
                  }))}
                  placeholder="Zambian"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Physical Address *</Label>
              <Textarea
                id="address"
                value={formData.personalInfo.address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, address: e.target.value }
                }))}
                placeholder="Enter your full physical address"
                className="min-h-[100px]"
                required
              />
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <GraduationCap className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Academic Background</h2>
              <p className="text-gray-600">Provide your Grade 12 ECZ results and previous school information</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School *</Label>
                <Input
                  id="previousSchool"
                  value={formData.academicInfo.previousSchool}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    academicInfo: { ...prev.academicInfo, previousSchool: e.target.value }
                  }))}
                  placeholder="Name of your previous school"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year *</Label>
                <Input
                  id="graduationYear"
                  value={formData.academicInfo.graduationYear}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    academicInfo: { ...prev.academicInfo, graduationYear: e.target.value }
                  }))}
                  placeholder="2023"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Grade 12 ECZ Results (Required Subjects)</h3>
              <p className="text-sm text-gray-600">Enter your scores (1-9, where 1-2 = Distinction, 3-4 = Merit, 5-6 = Credit, 7-8 = Pass, 9 = Fail)</p>
              
              {formData.academicInfo.grades.map((grade, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${index}`}>Subject *</Label>
                    <Select
                      value={grade.subject}
                      onValueChange={(value) => updateGrade(index, 'subject', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZAMBIAN_SUBJECTS.map((subject) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`score-${index}`}>Score (1-9) *</Label>
                    <Input
                      id={`score-${index}`}
                      type="number"
                      min="1"
                      max="9"
                      value={grade.score}
                      onChange={(e) => updateGrade(index, 'score', e.target.value)}
                      placeholder="e.g., 3"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`grade-${index}`}>Grade</Label>
                    <Input
                      id={`grade-${index}`}
                      value={grade.grade}
                      disabled
                      placeholder="Auto-calculated"
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Upload className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Documents</h2>
              <p className="text-gray-600">Upload the required documents (at least 3 documents required)</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{doc.name}</h4>
                    {doc.file && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(index, file)
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {doc.file && (
                      <div className="text-sm text-gray-600">
                        Selected: {doc.file.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Accepted formats: Images (JPG, PNG), PDF, Word documents. Maximum file size: 5MB per file.
              </AlertDescription>
            </Alert>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
              <p className="text-gray-600">Please review your information before submitting your application</p>
            </div>
            
            <div className="space-y-6">
              {/* Personal Info Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Name:</strong> {formData.personalInfo.firstName} {formData.personalInfo.lastName}</p>
                  <p><strong>Email:</strong> {formData.personalInfo.email}</p>
                  <p><strong>Phone:</strong> {formData.personalInfo.phone}</p>
                  <p><strong>Date of Birth:</strong> {formData.personalInfo.dateOfBirth}</p>
                  <p><strong>Gender:</strong> {formData.personalInfo.gender}</p>
                  <p><strong>Nationality:</strong> {formData.personalInfo.nationality}</p>
                </CardContent>
              </Card>
              
              {/* Academic Info Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Program:</strong> {programs.find(p => p.id === formData.academicInfo.programId)?.program_name}</p>
                  <p><strong>Previous School:</strong> {formData.academicInfo.previousSchool}</p>
                  <p><strong>Graduation Year:</strong> {formData.academicInfo.graduationYear}</p>
                  <div>
                    <strong>Grade 12 Results:</strong>
                    <div className="mt-2 space-y-1">
                      {formData.academicInfo.grades.filter(g => g.subject && g.score).map((grade, index) => (
                        <div key={index} className="text-sm">
                          {grade.subject}: {grade.score} ({grade.grade})
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Documents Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.filter(doc => doc.file).map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{doc.name}: {doc.file?.name}</span>
                      </div>
                    ))}
                    <p className="text-sm text-gray-600 mt-2">
                      {documents.filter(doc => doc.file).length} of {documents.length} documents uploaded
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Alert>
                <AlertDescription>
                  By submitting this application, you confirm that all information provided is accurate and complete. 
                  You will proceed to payment (K150 ZMW application fee) after submission.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )
        
      default:
        return <div>Invalid step</div>
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MIHAS Application Management System</h1>
          <p className="text-gray-600">Mukuba Institute of Health and Applied Sciences - Apply for 2025-2026 Academic Year</p>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {currentStep} of 5</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Program</span>
            <span>Personal</span>
            <span>Academic</span>
            <span>Documents</span>
            <span>Review</span>
          </div>
        </div>
        
        {/* Form Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          
          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={submitting}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submitApplicationData}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewApplicationPage