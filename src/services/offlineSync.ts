import { supabase } from '@/lib/supabase'
import { offlineStorage } from '@/lib/offlineStorage'

interface OfflineData {
  form_data: Record<string, any>
  uploaded_files: any[]
  current_step: number
  timestamp: number
}

class OfflineSyncService {
  private isProcessing = false
  private retryAttempts = new Map<string, number>()
  private maxRetries = 3

  // Store data offline
  async storeOffline(userId: string, type: 'application_draft' | 'document_upload' | 'form_submission', data: any) {
    try {
      await offlineStorage.store({
        type,
        data,
        userId
      })
      console.log('Data stored offline successfully')
    } catch (error) {
      console.error('Failed to store data offline:', error)
      // Fallback to localStorage
      localStorage.setItem(`offline_${type}_${userId}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    }
  }

  // Process sync queue when online
  async processOfflineData() {
    if (this.isProcessing || !navigator.onLine) {
      return
    }

    this.isProcessing = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const offlineData = await offlineStorage.getAll(user.id)
      
      for (const item of offlineData) {
        try {
          await this.syncToServer(item)
          await offlineStorage.remove(item.id)
          this.retryAttempts.delete(item.id)
        } catch (error) {
          console.error('Failed to sync offline data:', error)
          
          const attempts = this.retryAttempts.get(item.id) || 0
          if (attempts >= this.maxRetries) {
            console.error(`Max retries reached for item ${item.id}, removing from queue`)
            await offlineStorage.remove(item.id)
            this.retryAttempts.delete(item.id)
          } else {
            this.retryAttempts.set(item.id, attempts + 1)
          }
        }
      }

      // Also process localStorage fallback data
      await this.processLocalStorageData(user.id)
    } catch (error) {
      console.error('Error processing offline data:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process localStorage fallback data
  private async processLocalStorageData(userId: string) {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(`offline_`) && key.includes(userId))
    
    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        const type = key.split('_')[1] as 'application_draft' | 'document_upload' | 'form_submission'
        
        await this.syncToServer({
          id: key,
          type,
          data: data.data,
          timestamp: data.timestamp,
          userId
        })
        
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to sync localStorage data ${key}:`, error)
        localStorage.removeItem(key) // Remove corrupted data
      }
    }
  }

  // Sync data to server
  private async syncToServer(item: any) {
    switch (item.type) {
      case 'application_draft': {
        const { error: draftError } = await supabase
          .from('application_drafts')
          .upsert({
            user_id: item.userId,
            form_data: item.data.form_data,
            uploaded_files: item.data.uploaded_files,
            current_step: item.data.current_step,
            is_offline_sync: true,
            updated_at: new Date().toISOString()
          })
        if (draftError) throw draftError
        break
      }

      case 'form_submission': {
        const { error: submissionError } = await supabase
          .from('applications')
          .insert({
            ...item.data,
            user_id: item.userId,
            is_offline_sync: true,
            created_at: new Date(item.timestamp).toISOString()
          })
        if (submissionError) throw submissionError
        break
      }

      case 'document_upload':
        // Handle document uploads - would need to re-upload files
        console.log('Document upload sync not yet implemented')
        break
    }
  }

  // Initialize service with event listeners
  async init() {
    try {
      await offlineStorage.init()
    } catch (error) {
      // Silently handle initialization errors
    }

    // Listen for online events
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing offline data...')
      this.processOfflineData()
    })

    // Listen for offline events
    window.addEventListener('offline', () => {
      console.log('Connection lost, enabling offline mode')
    })

    // Process any existing offline data on startup
    if (navigator.onLine) {
      setTimeout(() => this.processOfflineData(), 1000)
    }
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine
  }

  // Get offline data count for user
  async getOfflineDataCount(userId: string): Promise<number> {
    try {
      const data = await offlineStorage.getAll(userId)
      const localStorageCount = Object.keys(localStorage)
        .filter(key => key.startsWith(`offline_`) && key.includes(userId))
        .length
      return data.length + localStorageCount
    } catch (error) {
      console.error('Failed to get offline data count:', error)
      return 0
    }
  }
}

export const offlineSyncService = new OfflineSyncService()