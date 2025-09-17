import { supabaseAdminClient } from '../_utils/supabaseClient'
import { getAuthenticatedUser } from '../_utils/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await getAuthenticatedUser(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    const { data, error } = await supabaseAdminClient
      .from('intakes')
      .select('*')
      .eq('is_active', true)
      .order('application_deadline')

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({ intakes: data || [] })
  } catch (error) {
    console.error('Intakes fetch error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
