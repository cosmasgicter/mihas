import { supabaseAdminClient, getUserFromRequest } from '../_lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await getUserFromRequest(req, { requireAdmin: true })
  if (authContext.error) {
    return res.status(403).json({ error: authContext.error })
  }

  try {
    const { userId, type, title, message, data } = req.body || {}

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title and message are required' })
    }

    const { data: notification, error } = await supabaseAdminClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(201).json(notification)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}