const { supabaseAdminClient, requireUser } = require('../../_lib/supabaseClient')
const { logAuditEvent } = require('../../_lib/auditLogger')
const { fetchUserProfile, fetchActiveRole, parseUserId, parseAction } = require('../../_lib/adminUserHelpers')

module.exports = async function handler(req, res) {
  try {
    const { user, isAdmin, roles } = await requireUser(req, { requireAdmin: true })
    const { id, action } = req.query
    const userId = parseUserId(id)
    const normalizedAction = parseAction(action)

    if (req.method === 'GET') {
      // Single user lookup
      if (userId) {
        if (normalizedAction === 'role') {
          const activeRole = await fetchActiveRole(userId)

          await logAuditEvent({
            req,
            action: 'admin.users.role.view',
            actorId: user.id,
            actorEmail: user.email || null,
            actorRoles: roles,
            targetTable: 'user_roles',
            targetId: userId,
            metadata: { requestedBy: isAdmin ? 'admin' : 'unknown' }
          })

          return res.status(200).json(activeRole)
        }

        const profile = await fetchUserProfile(userId)
        await logAuditEvent({
          req,
          action: 'admin.users.view',
          actorId: user.id,
          actorEmail: user.email || null,
          actorRoles: roles,
          targetTable: 'user_profiles',
          targetId: userId,
          metadata: { found: Boolean(profile) }
        })

        return res.status(200).json(profile)
      }

      // List all users
      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      await logAuditEvent({
        req,
        action: 'admin.users.list',
        actorId: user.id,
        actorEmail: user.email || null,
        actorRoles: roles,
        targetTable: 'user_profiles',
        metadata: { total: Array.isArray(data) ? data.length : 0 }
      })

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

      await logAuditEvent({
        req,
        action: 'admin.users.create',
        actorId: user.id,
        actorEmail: user.email || null,
        actorRoles: roles,
        targetTable: 'user_profiles',
        targetId: profileData?.user_id || null,
        metadata: { email, role }
      })

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