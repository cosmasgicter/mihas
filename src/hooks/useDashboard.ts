import { supabase } from '../lib/supabase'

// Dashboard Analytics Hook
export const useDashboard = () => {
  const getDashboardData = async () => {
    const { data, error } = await supabase.functions.invoke('admin-dashboard')
    
    if (error) throw error
    return data
  }
  
  const getUserStats = async (userId: string) => {
    // Get user's applications
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
    
    if (appsError) throw appsError
    
    // Get user's payments (skip query if no applications)
    let payments: any[] = []
    const applicationIds = applications?.map(app => app.id) || []
    if (applicationIds.length > 0) {
      const { data: paymentData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('application_id', applicationIds)

      if (paymentsError) throw paymentsError
      payments = paymentData || []
    }
    
    // Calculate stats
    const stats = {
      totalApplications: applications?.length || 0,
      submittedApplications: applications?.filter(app => app.status !== 'draft').length || 0,
      acceptedApplications: applications?.filter(app => app.status === 'accepted').length || 0,
      pendingPayments: payments?.filter(payment => payment.status === 'pending').length || 0,
      completedPayments: payments?.filter(payment => payment.status === 'completed').length || 0,
      totalAmountPaid: payments?.filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0
    }
    
    return { applications, payments, stats }
  }
  
  return {
    getDashboardData,
    getUserStats
  }
}

// Notifications Hook
export const useNotifications = () => {
  const getNotifications = async (userId: string, limit = 10) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }
  
  const markAsRead = async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
    
    if (error) throw error
    return data
  }
  
  const getUnreadCount = async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) throw error
    return count || 0
  }
  
  return {
    getNotifications,
    markAsRead,
    getUnreadCount
  }
}