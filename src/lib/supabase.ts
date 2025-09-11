import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mylgegkqoddcrxtwcclb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database type definitions
export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string
  phone?: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  address?: string
  city?: string
  country?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  profile_image_url?: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Program {
  id: string
  name: string
  description?: string
  duration_years: number
  department?: string
  qualification_level?: string
  entry_requirements?: string
  fees_per_year?: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Intake {
  id: string
  name: string
  year: number
  semester?: string
  start_date: string
  end_date: string
  application_deadline: string
  total_capacity: number
  available_spots: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  application_number: string
  user_id: string
  program_id: string
  intake_id: string
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
  previous_education?: string
  previous_institution?: string
  grades_or_gpa?: string
  personal_statement?: string
  work_experience?: string
  english_proficiency?: string
  computer_skills?: string
  references?: string
  additional_info?: string
  payment_amount?: number
  payment_status: 'pending' | 'paid' | 'failed'
  payment_reference?: string
  payment_proof_url?: string
  reviewed_by?: string
  reviewed_at?: string
  review_started_at?: string
  review_notes?: string
  decision_reason?: string
  decision_date?: string
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface ApplicationDocument {
  id: string
  application_id: string
  document_type: string
  document_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  verification_status: 'pending' | 'verified' | 'rejected'
  verified_by?: string
  verified_at?: string
  verification_notes?: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: string
  permissions: string[]
  department?: string
  assigned_by?: string
  is_active: boolean
  assigned_at: string
  created_at: string
  updated_at: string
}

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value?: string
  setting_type: string
  description?: string
  is_public: boolean
  updated_by?: string
  created_at: string
  updated_at: string
}