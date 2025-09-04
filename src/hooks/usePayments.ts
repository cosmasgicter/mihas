import { supabase } from '../lib/supabase'

// Payment Management Hooks
export const usePayments = () => {
  const initiatePayment = async (paymentData: {
    applicationId: string
    studentEmail: string
    studentName: string
    phoneNumber: string
    amount?: number
    currency?: string
  }) => {
    const { data, error } = await supabase.functions.invoke('payment-initiate', {
      body: paymentData
    })
    
    if (error) throw error
    return data
  }
  
  const getPayments = async (userId?: string) => {
    let query = supabase
      .from('payments')
      .select(`
        *,
        applications(
          app_id,
          academic_programs(
            program_name
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    if (userId) {
      query = query.eq('payer_email', userId) // Assuming we match by email
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  }
  
  const getPayment = async (paymentId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        applications(
          *,
          academic_programs(*)
        )
      `)
      .eq('id', paymentId)
      .maybeSingle()
    
    if (error) throw error
    return data
  }
  
  return {
    initiatePayment,
    getPayments,
    getPayment
  }
}

// Document Upload Hook
export const useDocuments = () => {
  const uploadDocument = async (documentData: {
    applicationId: string
    documentType: string
    fileName: string
    fileData: string // base64
    fileSize: number
    mimeType: string
  }) => {
    const { data, error } = await supabase.functions.invoke('document-upload', {
      body: documentData
    })
    
    if (error) throw error
    return data
  }
  
  const getDocuments = async (applicationId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false })
    
    if (error) throw error
    return data
  }
  
  const deleteDocument = async (documentId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
    
    if (error) throw error
    return data
  }
  
  return {
    uploadDocument,
    getDocuments,
    deleteDocument
  }
}