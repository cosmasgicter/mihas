import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For client components
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// For server components and API routes
export function createSupabaseServerClient(cookieStore?: any) {
  if (typeof window !== 'undefined') {
    // Client-side fallback
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || []
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore?.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// Database types
export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string
          user_id: string
          institution: 'MIHAS' | 'KATC'
          program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
          status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
          submitted_at: string | null
          created_at: string
          updated_at: string
          kyc_id: string | null
          payment_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          institution: 'MIHAS' | 'KATC'
          program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          kyc_id?: string | null
          payment_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          institution?: 'MIHAS' | 'KATC'
          program?: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
          status?: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          kyc_id?: string | null
          payment_id?: string | null
        }
      }
      kyc: {
        Row: {
          id: string
          application_id: string
          first_name: string
          middle_name: string | null
          last_name: string
          date_of_birth: string
          gender: 'Male' | 'Female'
          nationality: string
          nrc_number: string
          phone_number: string
          email: string
          address_line_1: string
          address_line_2: string | null
          city: string
          province: string
          postal_code: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          first_name: string
          middle_name?: string | null
          last_name: string
          date_of_birth: string
          gender: 'Male' | 'Female'
          nationality: string
          nrc_number: string
          phone_number: string
          email: string
          address_line_1: string
          address_line_2?: string | null
          city: string
          province: string
          postal_code?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          first_name?: string
          middle_name?: string | null
          last_name?: string
          date_of_birth?: string
          gender?: 'Male' | 'Female'
          nationality?: string
          nrc_number?: string
          phone_number?: string
          email?: string
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          province?: string
          postal_code?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qualifications: {
        Row: {
          id: string
          application_id: string
          subject_name: string
          grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'ABS'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          subject_name: string
          grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'ABS'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          subject_name?: string
          grade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'ABS'
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          application_id: string
          amount: number
          currency: string
          recipient_number: string
          transaction_reference: string | null
          proof_of_payment_path: string | null
          verification_status: 'pending' | 'verified' | 'rejected'
          verified_at: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          amount: number
          currency: string
          recipient_number: string
          transaction_reference?: string | null
          proof_of_payment_path?: string | null
          verification_status?: 'pending' | 'verified' | 'rejected'
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          amount?: number
          currency?: string
          recipient_number?: string
          transaction_reference?: string | null
          proof_of_payment_path?: string | null
          verification_status?: 'pending' | 'verified' | 'rejected'
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deferred'
      document_type: 'nrc_front' | 'nrc_back' | 'passport_photo' | 'ecz_results' | 'ecz_certificate' | 'additional'
      gender: 'Male' | 'Female'
      grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'ABS'
      institution: 'MIHAS' | 'KATC'
      program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
      verification_status: 'pending' | 'verified' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}