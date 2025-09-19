const { supabaseAdminClient, requireUser } = require('../../_lib/supabaseClient')
const { fetchUserProfile, fetchActiveRole, parseUserId, parseAction } = require('./userHelpers')

module.exports = async function handler(req, res) {
  try {
    const { user, isAdmin } = await requireUser(req, { requireAdmin: true })
    const { id, action } = req.query
    const userId = parseUserId(id)
    const normalizedAction = parseAction(action)

    if (req.method === 'GET') {
      // Single user lookup
      if (userId) {
        if (normalizedAction === 'role') {
          const activeRole = await fetchActiveRole(userId)
          return res.status(200).json(activeRole)
        }

        const profile = await fetchUserProfile(userId)
        return res.status(200).json(profile)
      }

      // List all users
      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.status(200).json({ data })
    }

    if (req.method === 'POST') {
      const { email, password, full_name, phone, role } = req.body

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Create user profile
      const { data: profileData, error: profileError } = await supabaseAdminClient
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email,
          full_name,
          phone,
          role
        })
        .select()
        .single()

      if (profileError) throw profileError

      return res.status(201).json({ data: profileData })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('User API error:', error)
    return res.status(error.message === 'Access denied' ? 403 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}