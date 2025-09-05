'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ChevronRight, ChevronLeft, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'ABS'

type Qualification = {
  id?: string
  subject_name: string
  grade: Grade
}

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: string
}

interface AcademicStepProps {
  application: Application
  onComplete: () => void
  onNext: () => void
  onPrevious: () => void
}

const commonSubjects = [
  'English',
  'Mathematics',
  'Biology',
  'Chemistry',
  'Physics',
  'Geography',
  'History',
  'Civic Education',
  'Religious Education',
  'Agriculture',
  'Business Studies',
  'Computer Studies',
  'Development Studies',
  'Food and Nutrition',
  'Additional Mathematics',
]

const grades: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'ABS']

export default function AcademicStep({ application, onComplete, onNext, onPrevious }: AcademicStepProps) {
  const [qualifications, setQualifications] = useState<Qualification[]>([{ subject_name: '', grade: 'A' }])
  const [loading, setLoading] = useState(false)
  const [eligibilityResult, setEligibilityResult] = useState<any>(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    fetchExistingQualifications()
  }, [])

  const fetchExistingQualifications = async () => {
    try {
      const { data, error } = await supabase
        .from('qualifications')
        .select('*')
        .eq('application_id', application.id)
        .order('subject_name')

      if (error) throw error
      
      if (data && data.length > 0) {
        setQualifications(data)
      }
    } catch (error: any) {
      console.error('Error fetching qualifications:', error)
    }
  }

  const addSubject = () => {
    setQualifications([...qualifications, { subject_name: '', grade: 'A' }])
  }

  const removeSubject = (index: number) => {
    if (qualifications.length > 1) {
      setQualifications(qualifications.filter((_, i) => i !== index))
    }
  }

  const updateSubject = (index: number, field: 'subject_name' | 'grade', value: string) => {
    const updated = [...qualifications]
    updated[index] = { ...updated[index], [field]: value }
    setQualifications(updated)
  }

  const checkEligibility = async () => {
    setCheckingEligibility(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/eligibility-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          program: application.program,
          qualifications: qualifications.filter(q => q.subject_name && q.grade)
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check eligibility')
      }

      const result = await response.json()
      setEligibilityResult(result)
      
      if (result.eligible) {
        toast.success('You meet the academic requirements!')
      } else {
        toast.warning('Please review the academic requirements')
      }
    } catch (error: any) {
      console.error('Error checking eligibility:', error)
      toast.error('Failed to check eligibility')
    } finally {
      setCheckingEligibility(false)
    }
  }

  const onSubmit = async () => {
    // Validate qualifications
    const validQualifications = qualifications.filter(q => q.subject_name && q.grade)
    
    if (validQualifications.length === 0) {
      toast.error('Please add at least one subject with grade')
      return
    }

    setLoading(true)

    try {
      // Delete existing qualifications
      await supabase
        .from('qualifications')
        .delete()
        .eq('application_id', application.id)

      // Insert new qualifications
      const { error } = await supabase
        .from('qualifications')
        .insert(
          validQualifications.map(q => ({
            application_id: application.id,
            subject_name: q.subject_name,
            grade: q.grade,
          }))
        )

      if (error) throw error

      // Update application timestamp
      await supabase
        .from('applications')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', application.id)

      toast.success('Academic records saved successfully!')
      onComplete()
      onNext()
    } catch (error: any) {
      console.error('Error saving qualifications:', error)
      toast.error('Failed to save academic records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Records</CardTitle>
        <p className="text-sm text-gray-600">
          Enter your ECZ Grade 12 subjects and grades. Eligibility will be checked based on program requirements.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subjects and Grades */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">ECZ Grade 12 Subjects</h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addSubject}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subject</span>
            </Button>
          </div>

          <div className="space-y-3">
            {qualifications.map((qualification, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg bg-gray-50">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Subject</Label>
                  <Select
                    value={qualification.subject_name}
                    onValueChange={(value) => updateSubject(index, 'subject_name', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Label className="text-sm font-medium">Grade</Label>
                  <Select
                    value={qualification.grade}
                    onValueChange={(value) => updateSubject(index, 'grade', value as Grade)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {qualifications.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSubject(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Subject Input */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Adding a Custom Subject?</h4>
          <p className="text-sm text-blue-700">
            If your subject is not in the dropdown list, you can manually type the subject name in the search field.
          </p>
        </div>

        {/* Eligibility Check */}
        <div className="space-y-4 pt-6 border-t">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Eligibility Check</h3>
            <Button 
              type="button" 
              variant="outline" 
              onClick={checkEligibility}
              disabled={checkingEligibility || qualifications.filter(q => q.subject_name && q.grade).length === 0}
            >
              {checkingEligibility ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Checking...</span>
                </div>
              ) : (
                'Check Eligibility'
              )}
            </Button>
          </div>

          {eligibilityResult && (
            <Alert className={eligibilityResult.eligible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-start space-x-3">
                {eligibilityResult.eligible ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className={`font-medium ${eligibilityResult.eligible ? 'text-green-900' : 'text-red-900'}`}>
                    {eligibilityResult.eligible ? 'Eligible for Program' : 'Not Eligible for Program'}
                  </div>
                  <AlertDescription className={eligibilityResult.eligible ? 'text-green-700' : 'text-red-700'}>
                    {eligibilityResult.message}
                  </AlertDescription>
                  {eligibilityResult.requirements && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium mb-1">Requirements:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {eligibilityResult.requirements.map((req: string, index: number) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {eligibilityResult.missing_subjects && eligibilityResult.missing_subjects.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium mb-1">Missing Required Subjects:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {eligibilityResult.missing_subjects.map((subject: string, index: number) => (
                          <li key={index}>{subject}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* Note */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Important Notes</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Enter all subjects from your ECZ Grade 12 certificate</li>
            <li>• Grades should match exactly as they appear on your certificate</li>
            <li>• You will need to upload your ECZ certificate in the next step</li>
            <li>• Eligibility is checked automatically based on program requirements</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            onClick={onSubmit} 
            disabled={loading || qualifications.filter(q => q.subject_name && q.grade).length === 0}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Save & Continue</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}