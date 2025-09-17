import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService, applicationService, documentService, analyticsService } from '@/services/apiClient'

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      localStorage.setItem('supabase.auth.token', data.session.access_token)
    }
  })
}

export const useRegister = () => {
  return useMutation({
    mutationFn: authService.register
  })
}

// Application hooks
export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: applicationService.getAll
  })
}

export const useApplication = (id: string) => {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationService.getById(id),
    enabled: !!id
  })
}

export const useCreateApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: applicationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    }
  })
}

export const useUpdateApplication = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      applicationService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    }
  })
}

// Document hooks
export const useUploadDocument = () => {
  return useMutation({
    mutationFn: documentService.upload
  })
}

// Analytics hooks
export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsService.getMetrics,
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  })
}