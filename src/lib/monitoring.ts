class MonitoringService {
  private metrics: Map<string, any> = new Map()

  trackApiCall(service: string, endpoint: string, duration: number, success: boolean) {
    const key = `${service}_${endpoint}`
    const existing = this.metrics.get(key) || { calls: 0, totalDuration: 0, errors: 0 }
    
    this.metrics.set(key, {
      calls: existing.calls + 1,
      totalDuration: existing.totalDuration + duration,
      errors: existing.errors + (success ? 0 : 1),
      avgDuration: (existing.totalDuration + duration) / (existing.calls + 1)
    })
  }

  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  logError(service: string, error: string) {
    console.error(`[${service}] ${error}`)
  }
}

export const monitoring = new MonitoringService()