import { supabaseAdminClient, getUserFromRequest } from '../_lib/supabaseClient'

export default async function handler(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: req.method !== 'GET' })
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getPrograms(req, res)
      case 'POST':
        return await createProgram(req, res)
      case 'PUT':
        return await updateProgram(req, res)
      case 'DELETE':
        return await deleteProgram(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Programs API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getPrograms(req, res) {
  const { data, error } = await supabaseAdminClient
    .from('programs')
    .select(`
      *,
      institutions (
        id,
        name,
        slug
      )
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ programs: data || [] })
}

async function createProgram(req, res) {
  const { name, description, duration_years, institution_id } = req.body

  if (!name?.trim() || !institution_id || !duration_years) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabaseAdminClient
    .from('programs')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      duration_years,
      institution_id,
      is_active: true
    })
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(201).json({ program: data[0] })
}

async function updateProgram(req, res) {
  const { id, name, description, duration_years, institution_id } = req.body

  if (!id || !name?.trim() || !institution_id || !duration_years) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabaseAdminClient
    .from('programs')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      duration_years,
      institution_id
    })
    .eq('id', id)
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ program: data[0] })
}

async function deleteProgram(req, res) {
  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Program ID is required' })
  }

  const { data, error } = await supabaseAdminClient
    .from('programs')
    .update({ is_active: false })
    .eq('id', id)
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ program: data[0] })
}
