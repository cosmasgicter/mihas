/**
 * Network Diagnostics Utility
 * Helps diagnose and handle network connectivity issues
 */

export class NetworkDiagnostics {
  private static instance: NetworkDiagnostics
  private connectionStatus: 'online' | 'offline' | 'slow' = 'online'
  
  static getInstance(): NetworkDiagnostics {
    if (!NetworkDiagnostics.instance) {
      NetworkDiagnostics.instance = new NetworkDiagnostics()
    }
    return NetworkDiagnostics.instance
  }
  
  async testConnection(): Promise<{ status: 'online' | 'offline' | 'slow', latency?: number }> {
    const start = Date.now()
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('https://mylgegkqoddcrxtwcclb.supabase.co/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const latency = Date.now() - start
      
      if (response.ok) {
        this.connectionStatus = latency > 3000 ? 'slow' : 'online'
        return { status: this.connectionStatus, latency }
      } else {
        this.connectionStatus = 'offline'
        return { status: 'offline' }
      }
    } catch (error) {
      this.connectionStatus = 'offline'
      return { status: 'offline' }
    }
  }
  
  getConnectionStatus() {
    return this.connectionStatus
  }
  
  async waitForConnection(maxWait = 10000): Promise<boolean> {
    const start = Date.now()
    
    while (Date.now() - start < maxWait) {
      const result = await this.testConnection()
      if (result.status === 'online') {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return false
  }
}

export const networkDiagnostics = NetworkDiagnostics.getInstance()
