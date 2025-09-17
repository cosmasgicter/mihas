import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { applicationService, documentService, analyticsService } from '@/services/apiClient'

// Auth hooks
export const useLogin = () => {
  const { signIn } = useAuth()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password)
  })
}

export const useRegister = () => {
  const { signUp } = useAuth()

  return useMutation({
    mutationFn: ({ email, password, userData }: { email: string; password: string; userData: any }) =>
      signUp(email, password, userData)
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