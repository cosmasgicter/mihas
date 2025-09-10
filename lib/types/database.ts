export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_more_info"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "matriculated"

export type DocumentVerdict = "pending" | "approved" | "rejected"

export type UserRole = "applicant" | "admissions_officer" | "registrar" | "super_admin"

export type NotificationChannel = "in_app" | "email" | "web_push"

export interface Institution {
  id: string
  slug: string
  name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  contact_email?: string
  contact_phone?: string
  address?: string
  payment_gateway_config: Record<string, any>
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Program {
  id: string
  institution_id: string
  code: string
  name: string
  description?: string
  duration_years?: number
  qualification_level?: string
  prerequisites: string[]
  required_documents: string[]
  application_fee_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
  institution?: Institution
}

export interface ProgramIntake {
  id: string
  program_id: string
  name: string
  academic_year: string
  intake_period: string
  capacity?: number
  application_start_date?: string
  application_end_date?: string
  is_open: boolean
  created_at: string
  updated_at: string
  program?: Program
}

export interface Application {
  id: string
  applicant_id: string
  program_id: string
  intake_id: string
  institution_id: string
  application_number?: string
  status: ApplicationStatus
  submitted_at?: string
  reviewed_by?: string
  reviewed_at?: string
  decision_notes?: string
  completeness_score: number
  payment_reference?: string
  payment_verified: boolean
  created_at: string
  updated_at: string
  program?: Program
  intake?: ProgramIntake
  institution?: Institution
  documents?: Document[]
}

export interface Document {
  id: string
  application_id: string
  document_type: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  checksum?: string
  verdict: DocumentVerdict
  reviewer_id?: string
  reviewed_at?: string
  rejection_reason?: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  first_name?: string
  last_name?: string
  middle_name?: string
  phone?: string
  nrc_passport?: string
  date_of_birth?: string
  gender?: string
  nationality: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  preferred_language: string
  created_at: string
  updated_at: string
}

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  institution_id?: string
  granted_by?: string
  granted_at: string
  revoked_at?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  channel: NotificationChannel
  subject: string
  body: string
  action_url?: string
  read_at?: string
  sent_at?: string
  metadata: Record<string, any>
  created_at: string
}
