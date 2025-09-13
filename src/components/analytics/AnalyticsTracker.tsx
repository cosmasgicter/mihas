import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAnalytics } from '@/hooks/useAnalytics'

interface AnalyticsTrackerProps {
  children: React.ReactNode
}

export function AnalyticsTracker({ children }: AnalyticsTrackerProps) {
  const location = useLocation()
  const { trackPageView } = useAnalytics()

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname)
  }, [location.pathname, trackPageView])

  return <>{children}</>
}