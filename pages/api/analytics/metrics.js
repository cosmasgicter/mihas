import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  try {
    const { data: totalApps } = await supabase
      .from('applications')
      .select('id', { count: 'exact' })

    const { data: submittedApps } = await supabase
      .from('applications')
      .select('id', { count: 'exact' })
      .eq('status', 'submitted')

    const { data: approvedApps } = await supabase
      .from('applications')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')

    const { data: recentApps } = await supabase
      .from('applications')
      .select('created_at, status, program')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    return res.status(200).json({
      totalApplications: totalApps?.length || 0,
      submittedApplications: submittedApps?.length || 0,
      approvedApplications: approvedApps?.length || 0,
      recentApplications: recentApps || []
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}