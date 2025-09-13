import { createClient } from '@supabase/supabase-js'

// Supabase project configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database type definitions
export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  email?: string
  phone?: string
  role: string
  date_of_birth?: string
  gender?: string
  nationality?: string
  country?: string
  address?: string
  city?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  avatar_url?: string
  bio?: string
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
  
  // Step 1: Basic KYC
  full_name: string
  nrc_number?: string
  passport_number?: string
  date_of_birth: string
  sex: 'Male' | 'Female'
  phone: string
  email: string
  residence_town: string
  guardian_name?: string
  guardian_phone?: string
  program: 'Clinical Medicine' | 'Environmental Health' | 'Registered Nursing'
  intake: string
  institution: 'KATC' | 'MIHAS'
  
  // Step 2: Education & Documents
  result_slip_url?: string
  extra_kyc_url?: string
  
  // Step 3: Payment
  application_fee: number
  payment_method?: string
  payer_name?: string
  payer_phone?: string
  amount?: number
  paid_at?: string
  momo_ref?: string
  pop_url?: string
  payment_status: 'pending_review' | 'verified' | 'rejected'
  
  // Step 4: Status tracking
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  submitted_at?: string
  
  // Tracking
  public_tracking_code?: string
  created_at: string
  updated_at: string
  
  // Admin fields
  reviewed_by?: string
  reviewed_at?: string
  review_started_at?: string
  review_notes?: string
  decision_reason?: string
  decision_date?: string
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

export interface ApplicationWithDetails extends Application {
  programs?: Program
  intakes?: Intake
  documents?: ApplicationDocument[]
}

export interface Grade12Subject {
  id: string
  name: string
  code?: string
  is_active: boolean
  created_at: string
}

export interface ApplicationGrade {
  id: string
  application_id: string
  subject_id: string
  grade: number
  created_at: string
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

export interface ApplicationDraft {
  id: string
  user_id: string
  form_data: Record<string, any>
  uploaded_files: any[]
  current_step: number
  version: number
  is_offline_sync: boolean
  created_at: string
  updated_at: string
}

export interface ApplicationDraft {
  id: string
  user_id: string
  form_data: Record<string, any>
  uploaded_files: any[]
  current_step: number
  version: number
  is_offline_sync: boolean
  created_at: string
  updated_at: string
}