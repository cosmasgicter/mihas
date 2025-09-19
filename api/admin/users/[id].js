const {
  supabaseAdminClient,
  requireUser,
  clearRequestRoleCache
} = require('../../_lib/supabaseClient')

async function fetchUserProfile(userId) {
  const { data, error } = await supabaseAdminClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data ?? null
}

async function syncUserRole(userId, role) {
  if (!role) {
    return
  }

  const { error: deactivateError } = await supabaseAdminClient
    .from('user_roles')
    .update({ is_active: false })
    .eq('user_id', userId)
    .neq('role', role)

  if (deactivateError && deactivateError.code !== 'PGRST116') {
    throw deactivateError
  }

  const { data: existingRole, error: fetchError } = await supabaseAdminClient
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }

  if (existingRole) {
    const { error: activateError } = await supabaseAdminClient
      .from('user_roles')
      .update({ is_active: true })
      .eq('id', existingRole.id)

    if (activateError) {
      throw activateError
    }
    return
  }

  const { error: insertError } = await supabaseAdminClient
    .from('user_roles')
    .insert({ user_id: userId, role, is_active: true })

  if (insertError) {
    throw insertError
  }
}

function parseUserId(rawId) {
  if (Array.isArray(rawId)) {
    return rawId[0]
  }
  if (typeof rawId === 'string') {
    return rawId
  }
  return null
}

function parseRequestBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (error) {
      throw new Error('Invalid JSON body')
    }
  }

  return body
}

module.exports = async function handler(req, res) {
  try {
    await requireUser(req, { requireAdmin: true })

    const userId = parseUserId(req.query?.id)
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (req.method === 'GET') {
      const profile = await fetchUserProfile(userId)
      if (!profile) {
        return res.status(404).json({ error: 'User not found' })
      }
      return res.status(200).json({ data: profile })
    }

    if (req.method === 'PUT') {
      const payload = parseRequestBody(req.body)
      const allowedFields = ['full_name', 'email', 'phone', 'role']
      const updates = {}

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
          updates[field] = payload[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' })
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdminClient
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          return res.status(404).json({ error: 'User not found' })
        }
        throw updateError
      }

      if (updates.role) {
        await syncUserRole(userId, updates.role)
        clearRequestRoleCache(req)
      }

      return res.status(200).json({ data: updatedProfile })
    }

    if (req.method === 'DELETE') {
      const profile = await fetchUserProfile(userId)
      if (!profile) {
        return res.status(404).json({ error: 'User not found' })
      }

      const { error: deleteAuthError } = await supabaseAdminClient.auth.admin.deleteUser(userId)
      if (deleteAuthError && !/not\s+found/i.test(deleteAuthError.message || '')) {
        throw deleteAuthError
      }

      const { error: deleteRolesError } = await supabaseAdminClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteRolesError) {
        throw deleteRolesError
      }

      const { error: deleteProfileError } = await supabaseAdminClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (deleteProfileError) {
        throw deleteProfileError
      }

      clearRequestRoleCache(req)
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', 'GET,PUT,DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin user handler error:', error)
    const statusCode = error.message === 'Access denied' ? 403 : 500
    return res.status(statusCode).json({ error: error.message || 'Internal server error' })
  }
}
