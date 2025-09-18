import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { applicationService } from '@/services/applications'
import { documentService } from '@/services/documents'
import { analyticsService } from '@/services/analytics'
import { userService } from '@/services/admin/users'

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
    queryKey: ['applications', id],
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
      queryClient.invalidateQueries({ queryKey: ['applications', id] })
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

// User management hooks
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: userService.list
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: userService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}