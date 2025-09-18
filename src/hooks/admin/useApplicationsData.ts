import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { applicationService } from '@/services/applications'

interface ApplicationSummary {
  id: string
  application_number: string
  full_name: string
  email: string
  phone: string
  program: string
  intake: string
  institution: string
  status: string
  payment_status: string
  payment_verified_at: string | null
  payment_verified_by: string | null
  payment_verified_by_name: string | null
  payment_verified_by_email: string | null
  last_payment_audit_id: number | null
  last_payment_audit_at: string | null
  last_payment_audit_by_name: string | null
  last_payment_audit_by_email: string | null
  last_payment_audit_notes: string | null
  last_payment_reference: string | null
  application_fee: number
  paid_amount: number
  submitted_at: string
  created_at: string
  result_slip_url: string
  extra_kyc_url: string
  pop_url: string
  grades_summary: string
  total_subjects: number
  average_grade: number
  age: number
  days_since_submission: number
}

export function useApplicationsData() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadApplications = async () => {
    const isFirstLoad = isInitialLoading
    try {
      setError('')
      if (isFirstLoad) {
        setIsInitialLoading(true)
      } else {
        setIsRefreshing(true)
      }
      const { data, error } = await supabase
        .from('admin_application_detailed')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      if (isFirstLoad) {
        setIsInitialLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }

  const updateStatus = async (applicationId: string, newStatus: string) => {
    await applicationService.updateStatus(applicationId, newStatus)
    await loadApplications()
  }

  const updatePaymentStatus = async (applicationId: string, newPaymentStatus: string, verificationNotes?: string) => {
    await applicationService.updatePaymentStatus(applicationId, newPaymentStatus, verificationNotes)
    await loadApplications()
  }

  useEffect(() => {
    loadApplications()
  }, [])

  return {
    applications,
    isInitialLoading,
    isRefreshing,
    error,
    loadApplications,
    updateStatus,
    updatePaymentStatus
  }
}