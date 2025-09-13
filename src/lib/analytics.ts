import { supabase } from './supabase'

export interface AnalyticsEvent {
  user_id?: string
  session_id?: string
  page_path: string
  action_type: string
  duration_seconds?: number
  metadata?: Record<string, any>
}

export interface ApplicationStats {
  date: string
  totalApplications: number
  submittedApplications: number
  approvedApplications: number
  rejectedApplications: number
  pendingApplications: number
  programId?: string
  intakeId?: string
}

export interface ProgramAnalytics {
  programId: string
  programName: string
  applicationsCount: number
  approvalRate: number
  completionRate: number
  averageProcessingDays: number
}

export interface EligibilityAnalytics {
  date: string
  totalChecks: number
  passedChecks: number
  failedChecks: number
  successRate: number
  commonFailureReasons: string[]
}

export class AnalyticsService {
  static async trackEvent(event: AnalyticsEvent) {
    try {
      const { error } = await supabase
        .from('user_engagement_metrics')
        .insert({
          user_id: event.user_id,
          session_id: event.session_id,
          page_path: event.page_path,
          action_type: event.action_type,
          duration_seconds: event.duration_seconds,
          metadata: event.metadata
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to track analytics event:', error)
    }
  }

  static async getApplicationStatistics(startDate: string, endDate: string): Promise<ApplicationStats[]> {
    const { data, error } = await supabase
      .from('application_statistics')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (error) throw error
    return data || []
  }

  static async getProgramAnalytics(programId?: string): Promise<ProgramAnalytics[]> {
    let query = supabase
      .from('program_analytics')
      .select(`
        *,
        programs!inner(name)
      `)

    if (programId) {
      query = query.eq('program_id', programId)
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) throw error
    return data?.map(item => ({
      programId: item.program_id,
      programName: item.programs.name,
      applicationsCount: item.applications_count,
      approvalRate: item.approval_rate,
      completionRate: item.completion_rate,
      averageProcessingDays: item.average_processing_days
    })) || []
  }

  static async getEligibilityAnalytics(startDate: string, endDate: string): Promise<EligibilityAnalytics[]> {
    const { data, error } = await supabase
      .from('eligibility_analytics')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (error) throw error
    return data?.map(item => ({
      date: item.date,
      totalChecks: item.total_eligibility_checks,
      passedChecks: item.passed_eligibility,
      failedChecks: item.failed_eligibility,
      successRate: item.success_rate,
      commonFailureReasons: item.common_failure_reasons || []
    })) || []
  }

  static async getUserEngagementMetrics(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('user_engagement_metrics')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at')

    if (error) throw error
    return data || []
  }

  static async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: applications, error: appsError } = await supabase
      .from('applications_new')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    if (appsError) throw appsError

    const stats = {
      date: today,
      totalApplications: applications?.length || 0,
      submittedApplications: applications?.filter(app => app.status === 'submitted').length || 0,
      approvedApplications: applications?.filter(app => app.status === 'approved').length || 0,
      rejectedApplications: applications?.filter(app => app.status === 'rejected').length || 0,
      pendingApplications: applications?.filter(app => ['submitted', 'under_review'].includes(app.status)).length || 0
    }

    const { error: insertError } = await supabase
      .from('automated_reports')
      .insert({
        report_type: 'daily',
        report_name: `Daily Report - ${today}`,
        report_data: stats
      })

    if (insertError) throw insertError
    return stats
  }

  static async getSystemPerformanceMetrics() {
    const { data, error } = await supabase
      .from('system_performance_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  }
}