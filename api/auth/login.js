import { supabaseAnonClient } from '../_lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseAnonClient) {
    return res.status(500).json({ error: 'Supabase anon key is not configured' })
  }

  try {
    const { email, password } = req.body

    const { data, error } = await supabaseAnonClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return res.status(401).json({ error: error.message })
    }

    return res.status(200).json({
      user: data.user,
      session: data.session
    })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}