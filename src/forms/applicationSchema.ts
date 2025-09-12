import { z } from 'zod'
import { Program, Intake } from '@/lib/supabase'

export const DEFAULT_PROGRAMS: Program[] = [
  {
    id: 'diploma-clinical-medicine',
    name: 'Diploma in Clinical Medicine',
    description: 'HPCZ Accredited - Prepares students for clinical officer practice',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-environmental-health',
    name: 'Diploma in Environmental Health',
    description: 'ECZ Accredited - Environmental health and safety specialization',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'diploma-registered-nursing',
    name: 'Diploma in Registered Nursing',
    description: 'NMCZ Accredited - Professional nursing practice preparation',
    duration_years: 3,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
]

export const DEFAULT_INTAKES: Intake[] = [
  {
    id: 'january-2026',
    name: 'January 2026 Intake',
    year: 2026,
    semester: 'First Semester',
    start_date: '2026-01-15',
    end_date: '2026-06-30',
    application_deadline: '2025-12-15',
    total_capacity: 200,
    available_spots: 200,
    is_active: true,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'july-2026',
    name: 'July 2026 Intake',
    year: 2026,
    semester: 'Second Semester',
    start_date: '2026-07-15',
    end_date: '2026-12-31',
    application_deadline: '2026-06-15',
    total_capacity: 200,
    available_spots: 200,
    is_active: true,
    created_at: '',
    updated_at: ''
  }
]

export const applicationSchema = z.object({
  program_id: z.string().min(1, 'Please select a program'),
  intake_id: z.string().min(1, 'Please select an intake'),
  nrc_number: z.string().optional(),
  passport_number: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female'], { required_error: 'Please select gender' }),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed'], { required_error: 'Please select marital status' }),
  nationality: z.string().min(1, 'Nationality is required'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  postal_address: z.string().optional(),
  physical_address: z.string().min(5, 'Physical address is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_relationship: z.string().optional(),
  medical_conditions: z.string().optional(),
  disabilities: z.string().optional(),
  criminal_record: z.boolean({ required_error: 'Please select whether you have a criminal record' }),
  criminal_record_details: z.string().optional(),
  professional_registration_number: z.string().optional(),
  professional_body: z.string().optional(),
  employment_status: z.enum(['Unemployed', 'Employed', 'Self-employed', 'Student'], { required_error: 'Please select employment status' }),
  employer_name: z.string().optional(),
  employer_address: z.string().optional(),
  years_of_experience: z.number().min(0).optional(),
  previous_education: z.string().min(10, 'Please provide your educational background'),
  grades_or_gpa: z.string().min(1, 'Please provide your grades/GPA'),
  motivation_letter: z.string().min(50, 'Please share your motivation (minimum 50 characters)'),
  career_goals: z.string().min(20, 'Please describe your career goals (minimum 20 characters)'),
  english_proficiency: z.enum(['Basic', 'Intermediate', 'Advanced', 'Fluent'], {
    required_error: 'Please select your English proficiency level'
  }),
  computer_skills: z.enum(['Basic', 'Intermediate', 'Advanced'], {
    required_error: 'Please select your computer skills level'
  }),
  references: z.string().min(20, 'Please provide at least one reference'),
  financial_sponsor: z.string().min(1, 'Please specify who will sponsor your studies'),
  sponsor_relationship: z.string().optional(),
  additional_info: z.string().optional(),
  payment_method: z.enum(['pay_now', 'pay_later'], { required_error: 'Please select payment option' }),
  payment_reference: z.string().optional(),
  declaration: z.boolean().refine(val => val === true, {
    message: 'You must accept the declaration to proceed'
  }),
  information_accuracy: z.boolean().refine(val => val === true, {
    message: 'You must confirm the accuracy of information provided'
  }),
  professional_conduct: z.boolean().refine(val => val === true, {
    message: 'You must agree to professional conduct standards'
  })
}).refine((data) => {
  // Either NRC or passport number should be provided, but not both
  const hasNrc = data.nrc_number && data.nrc_number.trim().length > 0
  const hasPassport = data.passport_number && data.passport_number.trim().length > 0
  return hasNrc || hasPassport
}, {
  message: "Either NRC number or passport number must be provided",
  path: ["nrc_number"]
}).refine((data) => {
  // Ensure both are not provided simultaneously
  const hasNrc = data.nrc_number && data.nrc_number.trim().length > 0
  const hasPassport = data.passport_number && data.passport_number.trim().length > 0
  return !(hasNrc && hasPassport)
}, {
  message: "Please provide either NRC number or passport number, not both",
  path: ["passport_number"]
})

export type ApplicationFormData = z.infer<typeof applicationSchema>

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
}