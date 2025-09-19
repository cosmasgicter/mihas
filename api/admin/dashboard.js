const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      totalApps,
      submittedApps,
      underReviewApps,
      approvedApps,
      rejectedApps,
      draftApps,
      reviewerProfiles,
      todayApps,
      weekApps,
      monthApps,
      processedApplications,
      recentActivity
    ] = await Promise.all([
      supabaseAdminClient.from('applications_new').select('*', { count: 'exact', head: true }),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review'),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected'),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabaseAdminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'reviewer']),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo),
      supabaseAdminClient
        .from('applications_new')
        .select('id, full_name, status, created_at, updated_at, submitted_at')
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(200),
      supabaseAdminClient
        .from('applications_new')
        .select('id, full_name, status, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)
    ])

    const statusBreakdown = {
      total: totalApps.count || 0,
      draft: draftApps.count || 0,
      submitted: submittedApps.count || 0,
      underReview: underReviewApps.count || 0,
      approved: approvedApps.count || 0,
      rejected: rejectedApps.count || 0
    }

    const periodTotals = {
      today: todayApps.count || 0,
      last7Days: weekApps.count || 0,
      last30Days: monthApps.count || 0
    }

    const processingDurations = (processedApplications.data || [])
      .map(app => {
        const start = app.submitted_at || app.created_at
        const end = app.updated_at || app.created_at

        if (!start || !end) {
          return null
        }

        const startTime = new Date(start).getTime()
        const endTime = new Date(end).getTime()

        if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
          return null
        }

        const hours = (endTime - startTime) / (1000 * 60 * 60)
        return Number.isFinite(hours) ? hours : null
      })
      .filter(value => value !== null)
      .map(value => Number.parseFloat(value.toFixed(2)))

    processingDurations.sort((a, b) => a - b)

    const averageProcessingTimeHours = processingDurations.length
      ? Number.parseFloat(
          (
            processingDurations.reduce((total, duration) => total + duration, 0) /
            processingDurations.length
          ).toFixed(2)
        )
      : 0

    const medianProcessingTimeHours = processingDurations.length
      ? processingDurations[Math.floor(processingDurations.length / 2)]
      : 0

    const p95Index = processingDurations.length
      ? Math.min(processingDurations.length - 1, Math.floor(processingDurations.length * 0.95))
      : 0

    const p95ProcessingTimeHours = processingDurations.length ? processingDurations[p95Index] : 0

    const processedLast7Days = (processedApplications.data || []).filter(app => {
      const updatedAt = app.updated_at
      if (!updatedAt) {
        return false
      }
      return new Date(updatedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }).length

    const throughputPerHour = Number.parseFloat(
      (processedLast7Days / (7 * 24)).toFixed(2)
    )

    const backlog = statusBreakdown.submitted + statusBreakdown.underReview
    const activeReviewers = reviewerProfiles.count || 0

    const processingMetrics = {
      averageProcessingTimeHours,
      medianProcessingTimeHours,
      p95ProcessingTimeHours,
      throughputPerHour,
      backlog,
      activeReviewers
    }

    const determineSystemHealth = () => {
      if (processingMetrics.backlog > 200 || processingMetrics.p95ProcessingTimeHours > 96) {
        return 'critical'
      }

      if (processingMetrics.backlog > 120 || processingMetrics.p95ProcessingTimeHours > 72) {
        return 'warning'
      }

      if (processingMetrics.backlog > 60 || processingMetrics.p95ProcessingTimeHours > 48) {
        return 'good'
      }

      return 'excellent'
    }

    const activities = (recentActivity.data || []).map(app => ({
      id: app.id,
      type:
        app.status === 'approved'
          ? 'approval'
          : app.status === 'rejected'
            ? 'rejection'
            : 'application',
      message: `${app.full_name} - Application ${app.status}`,
      timestamp: app.updated_at || app.created_at,
      user: app.full_name
    }))

    return res.status(200).json({
      statusBreakdown,
      periodTotals,
      processingMetrics,
      systemHealth: determineSystemHealth(),
      recentActivity: activities
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}