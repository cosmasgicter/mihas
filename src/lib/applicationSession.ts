import { supabase } from './supabase'
import { ApplicationFormData } from '@/forms/applicationSchema'

export interface ApplicationDraft {
  id?: string
  user_id: string
  form_data: Partial<ApplicationFormData>
  current_step: number
  uploaded_files: any[]
  selected_subjects?: any[]
  version: number
  expires_at: string
  last_saved_at: string
  session_id: string
}

export interface SessionWarning {
  type: 'timeout' | 'expiry'
  message: string
  timeRemaining: number
  canExtend: boolean
}

class ApplicationSessionManager {
  private sessionId: string
  private saveInterval: NodeJS.Timeout | null = null
  private warningTimeout: NodeJS.Timeout | null = null
  private expiryTimeout: NodeJS.Timeout | null = null
  private onWarning?: (warning: SessionWarning) => void
  private onExpiry?: () => void

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  // Initialize session management
  initialize(onWarning?: (warning: SessionWarning) => void, onExpiry?: () => void) {
    this.onWarning = onWarning
    this.onExpiry = onExpiry
    this.setupAutoSave()
    this.setupSessionWarnings()
  }

  // Setup automatic saving every 30 seconds
  private setupAutoSave() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }
    
    this.saveInterval = setInterval(() => {
      this.autoSaveDraft()
    }, 30000) // 30 seconds
  }

  // Setup session timeout warnings
  private setupSessionWarnings() {
    // Warning at 5 minutes before expiry
    this.warningTimeout = setTimeout(() => {
      this.onWarning?.({
        type: 'timeout',
        message: 'Your session will expire in 5 minutes. Save your progress to avoid losing data.',
        timeRemaining: 5 * 60 * 1000,
        canExtend: true
      })
    }, 25 * 60 * 1000) // 25 minutes (30min session - 5min warning)

    // Expiry at 30 minutes
    this.expiryTimeout = setTimeout(() => {
      this.handleSessionExpiry()
    }, 30 * 60 * 1000) // 30 minutes
  }

  // Save draft to both localStorage and database
  async saveDraft(
    userId: string,
    formData: Partial<ApplicationFormData>,
    currentStep: number,
    uploadedFiles: any[] = [],
    selectedSubjects: any[] = []
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const draft = {
        user_id: userId,
        form_data: formData,
        current_step: currentStep,
        uploaded_files: uploadedFiles,
        selected_subjects: selectedSubjects,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_saved_at: new Date().toISOString(),
        session_id: this.sessionId
      }

      // Save to localStorage for immediate recovery
      localStorage.setItem('applicationDraft', JSON.stringify(draft))

      // Try to save to database if table exists
      try {
        const { error } = await supabase
          .from('application_drafts')
          .upsert({
            user_id: userId,
            draft_data: { ...formData, uploaded_files: uploadedFiles, selected_subjects: selectedSubjects },
            step_completed: currentStep
          }, {
            onConflict: 'user_id'
          })

        if (error) console.warn('Database save failed:', error)
      } catch (dbError) {
        console.warn('Database not available, using localStorage only')
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving draft:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save draft'
      }
    }
  }

  // Auto-save current form state
  private async autoSaveDraft() {
    try {
      const savedDraft = localStorage.getItem('applicationDraft')
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        // Update last saved timestamp
        draft.last_saved_at = new Date().toISOString()
        localStorage.setItem('applicationDraft', JSON.stringify(draft))
        
        // Also update database
        await supabase
          .from('application_drafts')
          .update({ 
            updated_at: new Date().toISOString(),
            last_saved_at: draft.last_saved_at
          })
          .eq('user_id', draft.user_id)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  // Load draft from database or localStorage
  async loadDraft(userId: string): Promise<ApplicationDraft | null> {
    try {
      // First try database
      try {
        const { data, error } = await supabase
          .from('application_drafts')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!error && data) {
          return {
            id: data.id,
            user_id: data.user_id,
            form_data: data.draft_data || {},
            current_step: data.step_completed || 1,
            uploaded_files: data.draft_data?.uploaded_files || [],
            selected_subjects: data.draft_data?.selected_subjects || [],
            version: 1,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            last_saved_at: data.updated_at,
            session_id: this.sessionId
          }
        }
      } catch (dbError) {
        console.warn('Database not available, using localStorage only')
      }

      // Fallback to localStorage
      const localDraft = localStorage.getItem('applicationDraft')
      if (localDraft) {
        const draft = JSON.parse(localDraft)
        if (draft.user_id === userId) {
          return draft
        } else {
          localStorage.removeItem('applicationDraft')
        }
      }

      return null
    } catch (error) {
      console.error('Error loading draft:', error)
      return null
    }
  }

  // Delete draft
  async deleteDraft(userId: string): Promise<void> {
    try {
      // Remove from application_drafts table
      try {
        await supabase
          .from('application_drafts')
          .delete()
          .eq('user_id', userId)
      } catch (dbError) {
        console.warn('Failed to delete from application_drafts:', dbError)
      }

      // Remove draft applications from applications_new table
      try {
        await supabase
          .from('applications_new')
          .delete()
          .eq('user_id', userId)
          .eq('status', 'draft')
      } catch (dbError) {
        console.warn('Failed to delete draft applications:', dbError)
      }

      // Remove from localStorage (both keys)
      localStorage.removeItem('applicationDraft')
      localStorage.removeItem('applicationWizardDraft')
    } catch (error) {
      console.error('Error deleting draft:', error)
      throw error
    }
  }

  // Extend session
  async extendSession(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const newExpiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      
      // Update localStorage
      const localDraft = localStorage.getItem('applicationDraft')
      if (localDraft) {
        const draft = JSON.parse(localDraft)
        draft.expires_at = newExpiryTime
        localStorage.setItem('applicationDraft', JSON.stringify(draft))
      }

      // Reset session timers
      this.resetSessionTimers()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extend session'
      }
    }
  }

  // Get next version number
  private async getNextVersion(userId: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('application_drafts')
        .select('version')
        .eq('user_id', userId)
        .single()

      return data ? (data.version || 0) + 1 : 1
    } catch {
      return 1
    }
  }

  // Handle session expiry
  private handleSessionExpiry() {
    this.onExpiry?.()
    // Keep data but mark as expired
    const localDraft = localStorage.getItem('applicationDraft')
    if (localDraft) {
      const draft = JSON.parse(localDraft)
      draft.expired = true
      localStorage.setItem('applicationDraft', JSON.stringify(draft))
    }
  }

  // Reset session timers
  private resetSessionTimers() {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout)
    }
    if (this.expiryTimeout) {
      clearTimeout(this.expiryTimeout)
    }
    this.setupSessionWarnings()
  }

  // Check if draft exists
  async hasDraft(userId: string): Promise<boolean> {
    const draft = await this.loadDraft(userId)
    return draft !== null
  }

  // Get draft info for dashboard
  async getDraftInfo(userId: string): Promise<{
    exists: boolean
    step?: number
    lastSaved?: string
    progress?: string
    expiresAt?: string
  }> {
    try {
      // Check localStorage first
      const localDraft = localStorage.getItem('applicationWizardDraft')
      if (localDraft) {
        try {
          const draft = JSON.parse(localDraft)
          const steps = ['Basic KYC', 'Education', 'Payment', 'Submit']
          return {
            exists: true,
            step: draft.currentStep || 1,
            lastSaved: draft.savedAt,
            progress: `Step ${draft.currentStep || 1}/4: ${steps[(draft.currentStep || 1) - 1]}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        } catch (error) {
          localStorage.removeItem('applicationWizardDraft')
        }
      }

      // Check database for draft applications
      const { data: draftApps } = await supabase
        .from('applications_new')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)

      if (draftApps && draftApps.length > 0) {
        const app = draftApps[0]
        const steps = ['Basic KYC', 'Education', 'Payment', 'Submit']
        let currentStep = 1
        
        // Determine step based on what's filled
        if (app.result_slip_url) currentStep = 3
        else if (app.program && app.full_name) currentStep = 2
        
        return {
          exists: true,
          step: currentStep,
          lastSaved: app.updated_at,
          progress: `Step ${currentStep}/4: ${steps[currentStep - 1]}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }

      return { exists: false }
    } catch (error) {
      console.error('Error getting draft info:', error)
      return { exists: false }
    }
  }

  // Cleanup on component unmount
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout)
    }
    if (this.expiryTimeout) {
      clearTimeout(this.expiryTimeout)
    }
  }
}

export const applicationSessionManager = new ApplicationSessionManager()