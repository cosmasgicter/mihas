const { requireUser } = require('../../../_lib/supabaseClient')
const { logAuditEvent } = require('../../../_lib/auditLogger')
const { fetchActiveRole, parseUserId } = require('../../../_lib/adminUserHelpers')

module.exports = async function handler(req, res) {
  try {
    const { user, roles } = await requireUser(req, { requireAdmin: true })
    const userId = parseUserId(req.query?.id)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (req.method === 'GET') {
      const activeRole = await fetchActiveRole(userId)

      await logAuditEvent({
        req,
        action: 'admin.users.role.view',
        actorId: user.id,
        actorEmail: user.email || null,
        actorRoles: roles,
        targetTable: 'user_roles',
        targetId: userId,
        metadata: { activeRole: activeRole?.role || null }
      })

      return res.status(200).json(activeRole)
    }

    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin user role handler error:', error)
    const statusCode = error.message === 'Access denied' ? 403 : 500
    return res.status(statusCode).json({ error: error.message || 'Internal server error' })
  }
}
