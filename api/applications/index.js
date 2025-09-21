const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const authContext = await getUserFromRequest(req)
      if (authContext.error) {
        return res.status(401).json({ error: authContext.error })
      }

      const { page = 0, pageSize = 10, status, mine } = req.query
      
      let query = supabaseAdminClient
        .from('applications_new')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (mine === 'true') {
        query = query.eq('user_id', authContext.user.id)
      }

      const from = parseInt(page) * parseInt(pageSize)
      const to = from + parseInt(pageSize) - 1
      
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.json({
        applications: data || [],
        totalCount: count || 0,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      })
    } catch (error) {
      console.error('Applications list error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const authContext = await getUserFromRequest(req)
      if (authContext.error) {
        return res.status(401).json({ error: authContext.error })
      }

      const { data, error } = await supabaseAdminClient
        .from('applications_new')
        .insert({
          ...req.body,
          user_id: authContext.user.id
        })
        .select()
        .single()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(201).json(data)
    } catch (error) {
      console.error('Application creation error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}