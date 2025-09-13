import { supabase } from './supabase'

export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  timestamp: Date
  error?: string
}

export interface PerformanceMetric {
  metric: string
  value: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: Date
  resolved: boolean
  metadata?: Record<string, any>
}

class MonitoringService {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private metricsBuffer: PerformanceMetric[] = []
  private alertCallbacks: ((alert: SystemAlert) => void)[] = []

  // Health Checks
  async performHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = []
    
    // Database health check
    const dbCheck = await this.checkDatabase()
    checks.push(dbCheck)
    
    // Storage health check
    const storageCheck = await this.checkStorage()
    checks.push(storageCheck)
    
    // API health check
    const apiCheck = await this.checkAPI()
    checks.push(apiCheck)
    
    return checks
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const { error } = await supabase.from('programs').select('count').limit(1)
      const responseTime = Date.now() - start
      
      return {
        service: 'database',
        status: error ? 'unhealthy' : responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date(),
        error: error?.message
      }
    } catch (error: any) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date(),
        error: error.message
      }
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const { error } = await supabase.storage.from('applications').list('', { limit: 1 })
      const responseTime = Date.now() - start
      
      return {
        service: 'storage',
        status: error ? 'unhealthy' : responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date(),
        error: error?.message
      }
    } catch (error: any) {
      return {
        service: 'storage',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date(),
        error: error.message
      }
    }
  }

  private async checkAPI(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      const response = await fetch('/api/health', { method: 'HEAD' })
      const responseTime = Date.now() - start
      
      return {
        service: 'api',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`
      }
    } catch (error: any) {
      return {
        service: 'api',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date(),
        error: error.message
      }
    }
  }

  // Performance Metrics
  trackMetric(metric: string, value: number, metadata?: Record<string, any>) {
    const performanceMetric: PerformanceMetric = {
      metric,
      value,
      timestamp: new Date(),
      metadata
    }
    
    this.metricsBuffer.push(performanceMetric)
    
    // Flush buffer if it gets too large
    if (this.metricsBuffer.length > 100) {
      this.flushMetrics()
    }
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return
    
    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert(this.metricsBuffer.map(m => ({
          metric: m.metric,
          value: m.value,
          timestamp: m.timestamp.toISOString(),
          metadata: m.metadata
        })))
      
      if (!error) {
        this.metricsBuffer = []
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error)
    }
  }

  // Error Tracking
  async logError(error: Error, context?: Record<string, any>) {
    try {
      await supabase.from('error_logs').insert({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      })
      
      // Create alert for critical errors
      if (this.isCriticalError(error)) {
        this.createAlert('error', `Critical error: ${error.message}`, { error: error.message, context })
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /database.*connection/i,
      /authentication.*failed/i,
      /storage.*unavailable/i,
      /payment.*error/i
    ]
    
    return criticalPatterns.some(pattern => pattern.test(error.message))
  }

  // Alerts
  createAlert(type: SystemAlert['type'], message: string, metadata?: Record<string, any>) {
    const alert: SystemAlert = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    }
    
    this.alertCallbacks.forEach(callback => callback(alert))
    this.persistAlert(alert)
  }

  private async persistAlert(alert: SystemAlert) {
    try {
      await supabase.from('system_alerts').insert({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
        metadata: alert.metadata
      })
    } catch (error) {
      console.error('Failed to persist alert:', error)
    }
  }

  onAlert(callback: (alert: SystemAlert) => void) {
    this.alertCallbacks.push(callback)
  }

  // Start monitoring
  startMonitoring() {
    // Health checks every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().then(checks => {
        checks.forEach(check => {
          if (check.status !== 'healthy') {
            this.createAlert(
              check.status === 'unhealthy' ? 'error' : 'warning',
              `${check.service} is ${check.status}`,
              { service: check.service, responseTime: check.responseTime, error: check.error }
            )
          }
        })
      })
    }, 5 * 60 * 1000)
    
    // Flush metrics every minute
    setInterval(() => {
      this.flushMetrics()
    }, 60 * 1000)
  }

  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

export const monitoring = new MonitoringService()

// Performance tracking utilities
export const trackPageLoad = (page: string) => {
  const start = performance.now()
  return () => {
    const duration = performance.now() - start
    monitoring.trackMetric('page_load_time', duration, { page })
  }
}

export const trackAPICall = (endpoint: string) => {
  const start = performance.now()
  return (success: boolean, statusCode?: number) => {
    const duration = performance.now() - start
    monitoring.trackMetric('api_call_time', duration, { endpoint, success, statusCode })
  }
}

export const trackUserAction = (action: string, metadata?: Record<string, any>) => {
  monitoring.trackMetric('user_action', 1, { action, ...metadata })
}