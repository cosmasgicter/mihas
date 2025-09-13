import { supabase } from '@/lib/supabase'

interface OfflineData {
  form_data: Record<string, any>
  uploaded_files: any[]
  current_step: number
  timestamp: number
}

class OfflineSyncService {
  private syncQueue: Array<{ userId: string; data: OfflineData }> = []
  private isProcessing = false

  // Add data to sync queue
  addToQueue(userId: string, data: OfflineData) {
    this.syncQueue.push({ userId, data })
    this.processQueue()
  }

  // Process sync queue when online
  private async processQueue() {
    if (this.isProcessing || this.syncQueue.length === 0 || !navigator.onLine) {
      return
    }

    this.isProcessing = true

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift()
      if (item) {
        try {
          await this.syncToServer(item.userId, item.data)
        } catch (error) {
          console.error('Failed to sync offline data:', error)
          // Re-add to queue for retry
          this.syncQueue.unshift(item)
          break
        }
      }
    }

    this.isProcessing = false
  }

  // Sync data to server
  private async syncToServer(userId: string, data: OfflineData) {
    const { error } = await supabase
      .from('application_drafts')
      .upsert({
        user_id: userId,
        form_data: data.form_data,
        uploaded_files: data.uploaded_files,
        current_step: data.current_step,
        is_offline_sync: true
      })

    if (error) throw error

    // Clear local offline data after successful sync
    localStorage.removeItem('applicationDraftOffline')
  }

  // Initialize service with event listeners
  init() {
    // Listen for online events
    window.addEventListener('online', () => {
      this.processQueue()
    })

    // Process any existing offline data on startup
    if (navigator.onLine) {
      this.loadAndSyncOfflineData()
    }
  }

  // Load and sync any existing offline data
  private loadAndSyncOfflineData() {
    const offlineData = localStorage.getItem('applicationDraftOffline')
    if (offlineData) {
      try {
        const data = JSON.parse(offlineData)
        // Extract userId from current session
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            this.addToQueue(user.id, data)
          }
        })
      } catch (error) {
        console.error('Failed to parse offline data:', error)
        localStorage.removeItem('applicationDraftOffline')
      }
    }
  }
}

export const offlineSyncService = new OfflineSyncService()