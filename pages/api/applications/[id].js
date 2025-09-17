import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { id } = req.query
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  switch (req.method) {
    case 'GET':
      return getApplication(req, res, user, id)
    case 'PUT':
      return updateApplication(req, res, user, id)
    case 'DELETE':
      return deleteApplication(req, res, user, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getApplication(req, res, user, id) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return res.status(404).json({ error: 'Application not found' })
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateApplication(req, res, user, id) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function deleteApplication(req, res, user, id) {
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(204).end()
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}