import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = 'https://seavgqaxdhxuovvnvwgi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlYXZncWF4ZGh4dW92dm52d2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODc2MTQsImV4cCI6MjA3MjU2MzYxNH0.rop-4SZT0HYIm6llTX3BWySVvpyOyCqaChn3zW3QcYo'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Database types for MIHAS system
export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'applicant' | 'student' | 'admin' | 'academic_staff' | 'finance_staff' | 'registrar' | 'dean' | 'lecturer'
  employee_id?: string
  student_id?: string
  is_active: boolean
  profile_image_url?: string
  date_of_birth?: string
  gender?: 'Male' | 'Female' | 'Other'
  nationality?: string
  address?: any
  emergency_contact?: any
  created_at: string
  updated_at: string
}

export interface AcademicProgram {
  id: string
  program_code: string
  program_name: string
  program_type: 'Certificate' | 'Diploma' | 'Degree' | 'Masters' | 'PhD'
  department: string
  duration_years: number
  duration_semesters: number
  admission_requirements?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string
  app_id: string
  academic_year_id: string
  program_id: string
  application_type: 'new' | 'transfer' | 'readmission'
  status: 'draft' | 'submitted' | 'under_review' | 'documents_pending' | 'interview_scheduled' | 'accepted' | 'rejected' | 'payment_pending' | 'enrolled' | 'deferred' | 'withdrawn'
  submission_date?: string
  review_date?: string
  decision_date?: string
  reviewer_id?: string
  decision_reason?: string
  priority: number
  personal_info: any
  academic_background?: any
  supporting_documents?: any
  additional_info?: any
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  application_id?: string
  enrollment_id?: string
  fee_assessment_id?: string
  amount: number
  currency: string
  payment_type: 'application' | 'fee' | 'fine' | 'refund' | 'other'
  gateway_name: string
  gateway_tx_id?: string
  gateway_reference?: string
  gateway_response?: any
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
  payment_method?: string
  payment_channel?: string
  initiated_at: string
  processed_at?: string
  completed_at?: string
  failed_at?: string
  receipt_number?: string
  payer_name?: string
  payer_email?: string
  payer_phone?: string
  description?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  notification_type: 'info' | 'success' | 'warning' | 'error' | 'application_update' | 'payment_reminder' | 'exam_schedule' | 'grade_published' | 'system'
  priority: 'low' | 'medium' | 'high'
  is_read: boolean
  is_email_sent: boolean
  is_sms_sent: boolean
  related_entity_type?: string
  related_entity_id?: string
  scheduled_for?: string
  sent_at: string
  read_at?: string
  expires_at?: string
  created_at: string
}