import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizeForLog } from '@/lib/sanitize'

export function useBulkOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bulkUpdateStatus = async (applicationIds: string[], newStatus: string) => {
    try {
      setLoading(true)
      setError('')
      
      // Use the RPC function for bulk updates
      const { data, error } = await supabase.rpc('rpc_bulk_update_status', {
        p_application_ids: applicationIds,
        p_status: newStatus
      })

      if (error) {
        console.error('Bulk status update error:', sanitizeForLog(error.message))
        throw new Error(`Failed to update applications: ${error.message}`)
      }

      return data || applicationIds.length
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update application status'
      console.error('Bulk operation error:', sanitizeForLog(errorMessage))
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const bulkUpdatePaymentStatus = async (applicationIds: string[], newPaymentStatus: string) => {
    try {
      setLoading(true)
      setError('')
      
      // Use the RPC function for bulk payment updates
      const { data, error } = await supabase.rpc('rpc_bulk_update_payment_status', {
        p_application_ids: applicationIds,
        p_payment_status: newPaymentStatus
      })

      if (error) {
        console.error('Bulk payment status update error:', sanitizeForLog(error.message))
        throw new Error(`Failed to update payment status: ${error.message}`)
      }

      return data || applicationIds.length
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update payment status'
      console.error('Bulk payment operation error:', sanitizeForLog(errorMessage))
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const bulkDeleteApplications = async (applicationIds: string[]) => {
    try {
      setLoading(true)
      setError('')
      
      // Soft delete by updating status to 'deleted'
      const updates = applicationIds.map(id => 
        supabase
          .from('applications_new')
          .update({
            status: 'deleted',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      )
      
      const results = await Promise.allSettled(updates)
      
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successCount++
        } else {
          errorCount++
          const errorMsg = result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : result.value.error?.message || 'Update failed'
          errors.push(`Application ${applicationIds[index]}: ${errorMsg}`)
        }
      })
      
      if (errorCount > 0) {
        console.error('Bulk delete errors:', errors)
        setError(`${errorCount} applications failed to delete: ${errors.join(', ')}`)
      }
      
      return { successCount, errorCount, errors }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete applications'
      console.error('Bulk delete error:', sanitizeForLog(errorMessage))
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const bulkSendNotifications = async (applicationIds: string[], notification: { title: string; message: string }) => {
    try {
      setLoading(true)
      setError('')
      
      // Get applications with user info
      const { data: applications, error: fetchError } = await supabase
        .from('applications_new')
        .select('id, user_id, full_name, email, application_number')
        .in('id', applicationIds)
      
      if (fetchError) {
        throw new Error(`Failed to fetch applications: ${fetchError.message}`)
      }
      
      // Create notifications for each user
      const notifications = applications.map(app => ({
        user_id: app.user_id,
        title: notification.title.replace('{application_number}', app.application_number),
        message: notification.message.replace('{full_name}', app.full_name).replace('{application_number}', app.application_number),
        type: 'application_update'
      }))
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
      
      if (error) {
        throw new Error(`Failed to send notifications: ${error.message}`)
      }
      
      return notifications.length
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send notifications'
      console.error('Bulk notification error:', sanitizeForLog(errorMessage))
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError('')

  return {
    bulkUpdateStatus,
    bulkUpdatePaymentStatus,
    bulkDeleteApplications,
    bulkSendNotifications,
    loading,
    error,
    clearError
  }
}