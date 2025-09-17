import { supabaseAuthClient, supabaseAdminClient } from './supabaseClient'

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'admissions_officer'])

export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return { error: 'No authorization header provided' }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return { error: 'Invalid authorization header' }
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token)
  if (error || !data?.user) {
    return { error: 'Invalid or expired token' }
  }

  const user = data.user

  const { data: rolesData, error: rolesError } = await supabaseAdminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (rolesError) {
    return { error: rolesError.message }
  }

  const isAdmin = rolesData?.some(role => ADMIN_ROLES.has(role.role)) || false

  return { user, isAdmin }
}
