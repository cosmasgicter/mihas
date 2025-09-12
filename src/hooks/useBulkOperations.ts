import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useBulkOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bulkUpdateStatus = async (applicationIds: string[], newStatus: string) => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase.rpc('rpc_bulk_update_status', {
        p_application_ids: applicationIds,
        p_status: newStatus
      })

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const bulkUpdatePaymentStatus = async (applicationIds: string[], newPaymentStatus: string) => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error } = await supabase.rpc('rpc_bulk_update_payment_status', {
        p_application_ids: applicationIds,
        p_payment_status: newPaymentStatus
      })

      if (error) throw error
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    bulkUpdateStatus,
    bulkUpdatePaymentStatus,
    loading,
    error
  }
}