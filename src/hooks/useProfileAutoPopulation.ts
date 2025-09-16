import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Helper function to safely get user metadata
export const getUserMetadata = (user: any) => {
  if (!user?.user_metadata) return {}
  
  try {
    const metadata = user.user_metadata
    let signupData = {}
    
    if (metadata.signup_data) {
      signupData = typeof metadata.signup_data === 'string' 
        ? JSON.parse(metadata.signup_data) 
        : metadata.signup_data
    }
    
    return {
      full_name: metadata.full_name || signupData.full_name,
      phone: metadata.phone || signupData.phone,
      city: metadata.city || signupData.city,
      sex: metadata.sex || signupData.sex,
      date_of_birth: metadata.date_of_birth || signupData.date_of_birth,
      next_of_kin_name: metadata.next_of_kin_name || signupData.next_of_kin_name,
      next_of_kin_phone: metadata.next_of_kin_phone || signupData.next_of_kin_phone,
      address: metadata.address || signupData.address,
      nationality: metadata.nationality || signupData.nationality
    }
  } catch (error) {
    console.warn('Error parsing user metadata:', error)
    return {}
  }
}

// Get the best available value from profile and metadata
export const getBestValue = (profileValue: any, metadataValue: any, fallback = 'Not provided') => {
  return profileValue || metadataValue || fallback
}

// Calculate profile completion percentage
export const calculateProfileCompletion = (profile: any, metadata: any) => {
  const fields = [
    'full_name', 'phone', 'date_of_birth', 'sex', 
    'city', 'nationality', 'address'
  ]
  
  let completedFields = 0
  
  fields.forEach(field => {
    const value = getBestValue(profile?.[field], metadata?.[field], '')
    if (value && value !== 'Not provided') {
      completedFields++
    }
  })
  
  return Math.round((completedFields / fields.length) * 100)
}

// Hook for auto-populating form fields
export const useProfileAutoPopulation = (setValue?: any) => {
  const { user, profile } = useAuth()
  const metadata = getUserMetadata(user)
  const completionPercentage = calculateProfileCompletion(profile, metadata)
  
  useEffect(() => {
    if (user && setValue) {
      // Auto-populate form fields with best available data
      setValue('email', user.email || '')
      setValue('full_name', getBestValue(profile?.full_name, metadata.full_name, user.email?.split('@')[0] || ''))
      setValue('phone', getBestValue(profile?.phone, metadata.phone, ''))
      setValue('date_of_birth', getBestValue(profile?.date_of_birth, metadata.date_of_birth, ''))
      setValue('sex', getBestValue(profile?.sex, metadata.sex, ''))
      setValue('residence_town', getBestValue(profile?.city || profile?.address, metadata.city, ''))
      setValue('next_of_kin_name', getBestValue(profile?.next_of_kin_name, metadata.next_of_kin_name, ''))
      setValue('next_of_kin_phone', getBestValue(profile?.next_of_kin_phone, metadata.next_of_kin_phone, ''))
      
      // Additional fields for settings
      if (profile?.nationality || metadata.nationality) {
        setValue('nationality', getBestValue(profile?.nationality, metadata.nationality, ''))
      }
      if (profile?.address || metadata.address) {
        setValue('address', getBestValue(profile?.address, metadata.address, ''))
      }
    }
  }, [user, profile, setValue, metadata])
  
  return { 
    user, 
    profile, 
    metadata, 
    completionPercentage,
    hasAutoPopulatedData: completionPercentage > 0
  }
}