import { supabase } from './supabase'

export class SessionManager {
  private static instance: SessionManager
  private refreshTimer: NodeJS.Timeout | null = null

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  async initializeSession() {
    try {
      // Check if we have a valid session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session check error:', error)
        return false
      }

      if (session) {
        console.log('Valid session found')
        this.startRefreshTimer()
        return true
      }

      console.log('No valid session found')
      return false
    } catch (error) {
      console.error('Session initialization error:', error)
      return false
    }
  }

  private startRefreshTimer() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Refresh session every 4 minutes (tokens expire after 1 hour)
    this.refreshTimer = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Session refresh check: Active')
        } else {
          console.log('Session expired, clearing timer')
          this.stopRefreshTimer()
        }
      } catch (error) {
        console.error('Session refresh check error:', error)
      }
    }, 4 * 60 * 1000) // 4 minutes
  }

  private stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Manual session refresh error:', error)
        return false
      }

      if (session) {
        console.log('Session refreshed manually')
        return true
      }

      return false
    } catch (error) {
      console.error('Manual session refresh error:', error)
      return false
    }
  }

  cleanup() {
    this.stopRefreshTimer()
  }
}

// Initialize session manager
export const sessionManager = SessionManager.getInstance()