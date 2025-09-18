const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not configured')
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase access')
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
}

const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, clientOptions)
const supabaseAnonClient = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, clientOptions)
  : null

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'admissions_officer'])

async function getUserFromRequest(req, { requireAdmin = false } = {}) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return { error: 'No authorization header provided' }
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { error: 'Invalid authorization header' }
  }

  const { data, error } = await supabaseAdminClient.auth.getUser(token)
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

  const roles = rolesData?.map(role => role.role) ?? []
  const isAdmin = roles.some(role => ADMIN_ROLES.has(role))

  if (requireAdmin && !isAdmin) {
    return { error: 'Access denied' }
  }

  return { user, roles, isAdmin }
}

async function requireUser(req, options) {
  const authContext = await getUserFromRequest(req, options)
  if (authContext.error) {
    throw new Error(authContext.error)
  }
  return authContext
}

module.exports = {
  supabaseAdminClient,
  supabaseAnonClient,
  getUserFromRequest,
  requireUser
}
