import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyticsService } from '@/lib/analytics'

export function useAnalytics() {
  const { user } = useAuth()
  const sessionId = useRef(Math.random().toString(36).substring(7))
  const pageStartTime = useRef(Date.now())

  const trackPageView = useCallback((pagePath: string) => {
    if (!user) {
      return
    }

    AnalyticsService.trackEvent({
      user_id: user?.id,
      session_id: sessionId.current,
      page_path: pagePath,
      action_type: 'page_view',
      metadata: {
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }
    })
    pageStartTime.current = Date.now()
  }, [user])

  const trackAction = useCallback((actionType: string, metadata?: Record<string, any>) => {
    if (!user) {
      return
    }

    AnalyticsService.trackEvent({
      user_id: user?.id,
      session_id: sessionId.current,
      page_path: window.location.pathname,
      action_type: actionType,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })
  }, [user])

  const trackFormStart = (formName: string) => {
    trackAction('form_start', { form_name: formName })
  }

  const trackFormSubmit = (formName: string, success: boolean) => {
    trackAction('form_submit', { 
      form_name: formName, 
      success,
      duration_seconds: Math.floor((Date.now() - pageStartTime.current) / 1000)
    })
  }

  const trackDocumentUpload = (documentType: string, success: boolean) => {
    trackAction('document_upload', { 
      document_type: documentType, 
      success 
    })
  }

  const trackEligibilityCheck = (passed: boolean, failureReason?: string) => {
    trackAction('eligibility_check', {
      passed,
      failure_reason: failureReason
    })
  }

  useEffect(() => {
    if (!user) {
      return
    }

    // Track page view when a user session is available
    trackPageView(window.location.pathname)

    // Track page duration on unmount
    return () => {
      if (!user) {
        return
      }

      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000)
      AnalyticsService.trackEvent({
        user_id: user?.id,
        session_id: sessionId.current,
        page_path: window.location.pathname,
        action_type: 'page_duration',
        duration_seconds: duration
      })
    }
  }, [trackPageView, user])

  return {
    trackPageView,
    trackAction,
    trackFormStart,
    trackFormSubmit,
    trackDocumentUpload,
    trackEligibilityCheck
  }
}