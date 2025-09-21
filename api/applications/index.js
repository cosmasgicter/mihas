const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  console.log(`${req.method} /api/applications - Headers:`, req.headers)
  
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

      // Parse body if it's a string (Netlify functions)
      let body = req.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON in request body' })
        }
      }

      console.log('POST /api/applications - Request body:', JSON.stringify(body, null, 2))
      console.log('POST /api/applications - User ID:', authContext.user.id)

      // Development mode defaults
      const applicationData = {
        ...body,
        user_id: authContext.user.id
      }



      const { data, error } = await supabaseAdminClient
        .from('applications_new')
        .insert(applicationData)
        .select()
        .single()

      if (error) {
        console.error('Database insert error:', error)
        return res.status(400).json({ error: error.message })
      }

      return res.status(201).json(data)
    } catch (error) {
      console.error('Application creation error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const authContext = await getUserFromRequest(req)
      if (authContext.error) {
        return res.status(401).json({ error: authContext.error })
      }

      // Parse body if it's a string (Netlify functions)
      let body = req.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON in request body' })
        }
      }

      const { data, error } = await supabaseAdminClient
        .from('applications_new')
        .insert({
          ...body,
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

  res.setHeader('Allow', 'GET,POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}