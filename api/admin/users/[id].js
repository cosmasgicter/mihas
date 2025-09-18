const { supabaseAdminClient, requireUser } = require('../../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  try {
    const { user, isAdmin } = await requireUser(req, { requireAdmin: true })
    const { id } = req.query

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', id)
        .single()

      if (error) throw error
      return res.status(200).json({ data })
    }

    if (req.method === 'PUT') {
      const { full_name, email, phone, role } = req.body

      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .update({ full_name, email, phone, role })
        .eq('user_id', id)
        .select()
        .single()

      if (error) throw error
      return res.status(200).json({ data })
    }

    if (req.method === 'DELETE') {
      // Soft delete by updating deleted_at timestamp
      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', id)
        .select()
        .single()

      if (error) throw error
      return res.status(200).json({ data })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('User API error:', error)
    return res.status(error.message === 'Access denied' ? 403 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}