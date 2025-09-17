import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  try {
    // Get application statistics
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