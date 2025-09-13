import { useCallback, useEffect, useRef, useState } from 'react'
import { UseFormGetValues, UseFormWatch } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { ApplicationFormData, UploadedFile } from '@/forms/applicationSchema'

interface AutoSaveOptions {
  userId: string
  getValues: UseFormGetValues<ApplicationFormData>
  watch: UseFormWatch<ApplicationFormData>
  currentStep: number
  uploadedFiles: UploadedFile[]
  onConflict?: (serverVersion: number, localVersion: number) => void
  onSaveSuccess?: () => void
  onSaveError?: (error: string) => void
}

interface DraftData {
  form_data: Partial<ApplicationFormData>
  uploaded_files: UploadedFile[]
  current_step: number
  version: number
}

export function useAutoSave({
  userId,
  getValues,
  watch,
  currentStep,
  uploadedFiles,
  onConflict,
  onSaveSuccess,
  onSaveError
}: AutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const currentVersionRef = useRef(1)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (pendingChanges) {
        saveDraft()
      }
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pendingChanges])

  // Load existing draft
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    try {
      const { data, error } = await supabase
        .from('application_drafts')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        currentVersionRef.current = data.version
        return {
          form_data: data.form_data,
          uploaded_files: data.uploaded_files || [],
          current_step: data.current_step,
          version: data.version
        }
      }
      return null
    } catch (error) {
      console.error('Error loading draft:', error)
      return null
    }
  }, [userId])

  // Save draft to database
  const saveDraft = useCallback(async (force = false) => {
    if (isSaving && !force) return
    
    setIsSaving(true)
    
    try {
      const formData = getValues()
      const draftData = {
        form_data: formData,
        uploaded_files: uploadedFiles,
        current_step: currentStep,
        version: currentVersionRef.current + 1
      }

      if (!isOnline) {
        // Save to localStorage for offline
        localStorage.setItem('applicationDraftOffline', JSON.stringify({
          ...draftData,
          timestamp: Date.now()
        }))
        setPendingChanges(true)
        onSaveError?.('Saved offline - will sync when connection restored')
        return
      }

      const { data: existingDraft } = await supabase
        .from('application_drafts')
        .select('version')
        .eq('user_id', userId)
        .single()

      // Check for conflicts
      if (existingDraft && existingDraft.version > currentVersionRef.current) {
        onConflict?.(existingDraft.version, currentVersionRef.current)
        return
      }

      const { error } = await supabase
        .from('application_drafts')
        .upsert({
          user_id: userId,
          ...draftData
        })

      if (error) throw error

      currentVersionRef.current = draftData.version
      setLastSaved(new Date())
      setPendingChanges(false)
      onSaveSuccess?.()

      // Clear offline data if exists
      localStorage.removeItem('applicationDraftOffline')
    } catch (error: any) {
      console.error('Error saving draft:', error)
      onSaveError?.(error.message)
    } finally {
      setIsSaving(false)
    }
  }, [userId, getValues, currentStep, uploadedFiles, isSaving, isOnline, onConflict, onSaveSuccess, onSaveError])

  // Auto-save on field changes (debounced)
  useEffect(() => {
    const subscription = watch(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveDraft()
      }, 2000) // 2 second debounce
    })

    return () => {
      subscription.unsubscribe()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [watch, saveDraft])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft()
    }, 30000)

    return () => clearInterval(interval)
  }, [saveDraft])

  // Sync offline changes when coming back online
  useEffect(() => {
    if (isOnline && pendingChanges) {
      const offlineData = localStorage.getItem('applicationDraftOffline')
      if (offlineData) {
        saveDraft(true)
      }
    }
  }, [isOnline, pendingChanges, saveDraft])

  return {
    saveDraft,
    loadDraft,
    isSaving,
    lastSaved,
    isOnline,
    pendingChanges
  }
}