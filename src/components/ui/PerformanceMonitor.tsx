import { useEffect } from 'react'

export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          console.log('Performance Metrics:', {
            'DOM Content Loaded': nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            'Load Complete': nav.loadEventEnd - nav.loadEventStart,
            'First Paint': performance.getEntriesByType('paint').find(e => e.name === 'first-paint')?.startTime,
            'First Contentful Paint': performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime,
            'Total Load Time': nav.loadEventEnd - nav.navigationStart
          })
        }
      }
    })

    observer.observe({ entryTypes: ['navigation', 'paint'] })

    return () => observer.disconnect()
  }, [])

  return null
}