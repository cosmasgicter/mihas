import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AnalyticsService } from '@/lib/analytics'
import { isSupabaseConfigured } from '@/lib/supabase'

export function useAnalytics() {
  const { user } = useAuth()
  const sessionId = useRef(Math.random().toString(36).substring(7))
  const pageStartTime = useRef(Date.now())
  const analyticsEnabled = isSupabaseConfigured

  const trackPageView = useCallback((pagePath: string) => {
    if (!analyticsEnabled) {
      return
    }

    AnalyticsService.trackEvent({
      user_id: user?.id,
      session_id: sessionId.current,
      page_path: pagePath,
      action_type: 'page_view',
      metadata: {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      }
    })
    pageStartTime.current = Date.now()
  }, [analyticsEnabled, user?.id])

  const trackAction = useCallback((actionType: string, metadata?: Record<string, any>) => {
    if (!analyticsEnabled) {
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
  }, [analyticsEnabled, user?.id])

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
    if (!analyticsEnabled) {
      return
    }

    const currentPath = window.location.pathname
    trackPageView(currentPath)

    // Track page duration on unmount
    return () => {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000)
      AnalyticsService.trackEvent({
        user_id: user?.id,
        session_id: sessionId.current,
        page_path: currentPath,
        action_type: 'page_duration',
        duration_seconds: duration
      })
    }
  }, [analyticsEnabled, trackPageView, user?.id])

  return {
    trackPageView,
    trackAction,
    trackFormStart,
    trackFormSubmit,
    trackDocumentUpload,
    trackEligibilityCheck
  }
}