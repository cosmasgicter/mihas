const { getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authResult = await getUserFromRequest(req)
    
    if (authResult.error) {
      return res.status(401).json({ error: authResult.error })
    }

    const { user, roles, isAdmin } = authResult

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      roles,
      isAdmin
    })
  } catch (error) {
    console.error('Auth me handler error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}