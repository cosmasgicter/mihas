import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadApplications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('admin_application_detailed')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (applicationId: string, newStatus: string) => {
    const { error } = await supabase
      .from('applications_new')
      .update({ status: newStatus })
      .eq('id', applicationId)

    if (error) throw error
    await loadApplications()
  }

  const updatePaymentStatus = async (applicationId: string, newPaymentStatus: string) => {
    const { error } = await supabase
      .from('applications_new')
      .update({ payment_status: newPaymentStatus })
      .eq('id', applicationId)

    if (error) throw error
    await loadApplications()
  }

  useEffect(() => {
    loadApplications()
  }, [])

  return {
    applications,
    loading,
    error,
    loadApplications,
    updateStatus,
    updatePaymentStatus
  }
}