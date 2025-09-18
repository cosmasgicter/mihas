const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    const status = authContext.error === 'Access denied' ? 403 : 401
    return res.status(status).json({ error: authContext.error })
  }

  try {
    const [totalApps, submittedApps, approvedApps, recentApps] = await Promise.all([
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true }),
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabaseAdminClient
        .from('applications_new')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabaseAdminClient
        .from('applications_new')
        .select('created_at, status, program')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
    ])

    return res.status(200).json({
      totalApplications: Number(totalApps.count || 0),
      submittedApplications: Number(submittedApps.count || 0),
      approvedApplications: Number(approvedApps.count || 0),
      recentApplications: recentApps.data || []
    })
  } catch (error) {
    console.error('Analytics metrics error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}