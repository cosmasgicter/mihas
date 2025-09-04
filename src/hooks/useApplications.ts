import { supabase } from '../lib/supabase'
import { AcademicProgram, Application } from '../lib/supabase'

// Application Management Hooks
export const useApplications = () => {
  const getApplications = async (userId?: string) => {
    let query = supabase
      .from('applications')
      .select(`
        *,
        academic_programs(
          program_name,
          program_type,
          program_code
        ),
        academic_years(
          year_code
        )
      `)
      .order('created_at', { ascending: false })
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data as (Application & {
      academic_programs: AcademicProgram,
      academic_years: { year_code: string }
    })[]
  }
  
  const getApplication = async (applicationId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        academic_programs(*),
        academic_years(*),
        users(
          name,
          email,
          phone
        )
      `)
      .eq('id', applicationId)
      .maybeSingle()
    
    if (error) throw error
    return data
  }
  
  const submitApplication = async (applicationData: {
    personalInfo: any
    academicBackground: any
    programId: string
    academicYearId: string
    supportingDocuments?: any
    additionalInfo?: any
  }) => {
    const { data, error } = await supabase.functions.invoke('application-submit', {
      body: applicationData
    })
    
    if (error) throw error
    return data
  }
  
  const updateApplicationStatus = async (applicationId: string, status: string) => {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .maybeSingle()
    
    if (error) throw error
    return data
  }
  
  return {
    getApplications,
    getApplication,
    submitApplication,
    updateApplicationStatus
  }
}

// Academic Programs Hook
export const useAcademicPrograms = () => {
  const getPrograms = async () => {
    const { data, error } = await supabase
      .from('academic_programs')
      .select('*')
      .eq('is_active', true)
      .eq('program_name', 'Nursing Diploma')
      .order('program_name')
    
    if (error) throw error
    return data as AcademicProgram[]
  }
  
  const getProgram = async (programId: string) => {
    const { data, error } = await supabase
      .from('academic_programs')
      .select('*')
      .eq('id', programId)
      .maybeSingle()
    
    if (error) throw error
    return data as AcademicProgram
  }
  
  return {
    getPrograms,
    getProgram
  }
}

// Academic Years Hook
export const useAcademicYears = () => {
  const getAcademicYears = async () => {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  const getCurrentAcademicYear = async () => {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('is_current', true)
      .maybeSingle()
    
    if (error) throw error
    return data
  }
  
  return {
    getAcademicYears,
    getCurrentAcademicYear
  }
}