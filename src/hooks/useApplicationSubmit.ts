import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ApplicationFormData, UploadedFile } from '@/forms/applicationSchema'

export function useApplicationSubmit(user: any, uploadedFiles: UploadedFile[]) {
  // Add authentication state tracking
  const [authenticationChecked, setAuthenticationChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const insertDocuments = async (applicationId: string, userId: string) => {
    const documentInserts = uploadedFiles.map(file => ({
      application_id: applicationId,
      document_type: 'supporting_document',
      document_name: file.name,
      file_name: file.name,
      file_path: file.url || '',
      file_size: file.size,
      mime_type: file.type,
      uploader_id: userId
    }))

    const { error: documentsError } = await supabase
      .from('documents')
      .insert(documentInserts)

    if (documentsError) {
      console.error('Error saving document records:', documentsError)
    }
  }

  const submitApplication = async (data: ApplicationFormData) => {
    try {
      setLoading(true)
      setError('')

      // Enhanced authentication validation
      if (!user?.id) {
        throw new Error('User not authenticated. Please sign in and try again.')
      }

      // Verify current session with retry logic
      let currentUser = null
      let authError = null
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser()
        
        if (!sessionError && sessionUser) {
          currentUser = sessionUser
          break
        }
        
        authError = sessionError
        
        if (attempt < 2) {
          // Try to refresh the session
          await supabase.auth.refreshSession()
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      if (authError || !currentUser) {
        throw new Error('Authentication session expired. Please sign in again.')
      }
      
      // Double-check that we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session found. Please sign in again.')
      }

      const applicationNumber = `MIHAS${Date.now().toString().slice(-6)}`
      const trackingCode = `MIHAS${crypto.randomUUID().slice(0, 6).toUpperCase()}`
      
      const applicationData = {
        application_number: applicationNumber,
        public_tracking_code: trackingCode,
        user_id: currentUser.id,
        program_id: data.program_id,
        intake_id: data.intake_id,
        nrc_number: data.nrc_number || null,
        passport_number: data.passport_number || null,
        date_of_birth: data.date_of_birth,
        sex: data.sex,
        marital_status: data.marital_status,
        nationality: data.nationality,
        province: data.province,
        district: data.district,
        postal_address: data.postal_address || null,
        physical_address: data.physical_address,
        next_of_kin_name: data.next_of_kin_name || null,
        next_of_kin_phone: data.next_of_kin_phone || null,
        next_of_kin_relationship: data.next_of_kin_relationship || null,
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
      }

      console.log('Submitting application:', { 
        application_number: applicationData.application_number,
        tracking_code: applicationData.public_tracking_code,
        user_id: applicationData.user_id ? 'present' : 'missing' 
      })

      let application = null
      let applicationError = null
      
      // Try direct insert first
      const { data: directApplication, error: directError } = await supabase
        .from('applications_new')
        .insert(applicationData)
        .select()
        .single()
      
      if (directError) {
        console.warn('Direct insert failed, trying secure function:', directError.message)
        
        // Fallback to secure function if direct insert fails
        const { data: secureResult, error: secureError } = await supabase
          .rpc('submit_application_secure', {
            application_data: applicationData
          })
        
        if (secureError || !secureResult?.[0]?.success) {
          const errorMsg = secureError?.message || secureResult?.[0]?.error_message || 'Unknown error'
          console.error('Secure submission also failed:', errorMsg)
          throw new Error(errorMsg)
        }
        
        // Get the created application
        const { data: createdApp } = await supabase
          .from('applications_new')
          .select()
          .eq('id', secureResult[0].application_id)
          .single()
        
        application = createdApp
      } else {
        application = directApplication
      }
      
      if (!application) {
        throw new Error('Failed to create application record')
      }

      console.log('Application submitted successfully:', { id: application.id, tracking_code: application.public_tracking_code })

      if (uploadedFiles.length > 0) {
        await insertDocuments(application.id, currentUser.id)
      }

      setSuccess(true)
    } catch (error) {
      console.error('Error submitting application:', error)
      
      let errorMessage = 'Failed to submit application'
      
      if (error instanceof Error) {
        if (error.message?.includes('auth') || error.message?.includes('JWT') || error.message?.includes('session')) {
          errorMessage = 'Authentication error. Please sign in again and try submitting.'
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message?.includes('validation') || error.message?.includes('required')) {
          errorMessage = 'Please check that all required fields are filled correctly.'
        } else if (error.message?.includes('403') || error.message?.includes('permission')) {
          errorMessage = 'Permission denied. Please ensure you are signed in and try again.'
        } else if (error.message?.includes('RLS') || error.message?.includes('policy')) {
          errorMessage = 'Access denied. Please sign in with the correct account and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return { submitApplication, loading, error, success }
}