import { useState } from 'react'
import { sanitizeForLog } from '@/lib/sanitize'
import { apiClient } from '@/services/apiClient'

export function useBulkOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bulkUpdateStatus = async (applicationIds: string[], newStatus: string) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiClient.request('/api/applications/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_status',
          applicationIds,
          status: newStatus
        })
      })

      return response?.successCount || applicationIds.length
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
      
      const response = await apiClient.request('/api/applications/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_payment_status',
          applicationIds,
          paymentStatus: newPaymentStatus
        })
      })

      return response?.successCount || applicationIds.length
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
      
      const response = await apiClient.request('/api/applications/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          applicationIds
        })
      })

      return {
        successCount: response?.successCount || applicationIds.length,
        errorCount: 0,
        errors: []
      }
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
      
      const response = await apiClient.request('/api/applications/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send_notifications',
          applicationIds,
          notification
        })
      })

      return response?.successCount || applicationIds.length
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