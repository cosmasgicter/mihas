import { supabaseAdminClient, getUserFromRequest } from '../_lib/supabaseClient'

export default async function handler(req, res) {
  const authContext = await getUserFromRequest(req, { requireAdmin: req.method !== 'GET' })
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getIntakes(req, res)
      case 'POST':
        return await createIntake(req, res)
      case 'PUT':
        return await updateIntake(req, res)
      case 'DELETE':
        return await deleteIntake(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Intakes API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getIntakes(req, res) {
  const { data, error } = await supabaseAdminClient
    .from('intakes')
    .select('*')
    .eq('is_active', true)
    .order('application_deadline')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ intakes: data || [] })
}

async function createIntake(req, res) {
  const { name, year, start_date, end_date, application_deadline, total_capacity, available_spots } = req.body

  if (!name?.trim() || !year || !start_date || !end_date || !application_deadline || !total_capacity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabaseAdminClient
    .from('intakes')
    .insert({
      name: name.trim(),
      year,
      start_date,
      end_date,
      application_deadline,
      total_capacity,
      available_spots: available_spots ?? total_capacity,
      is_active: true
    })
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(201).json({ intake: data[0] })
}

async function updateIntake(req, res) {
  const { id, name, year, start_date, end_date, application_deadline, total_capacity, available_spots } = req.body

  if (!id || !name?.trim() || !year || !start_date || !end_date || !application_deadline || !total_capacity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabaseAdminClient
    .from('intakes')
    .update({
      name: name.trim(),
      year,
      start_date,
      end_date,
      application_deadline,
      total_capacity,
      available_spots: available_spots ?? total_capacity
    })
    .eq('id', id)
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ intake: data[0] })
}

async function deleteIntake(req, res) {
  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Intake ID is required' })
  }

  const { data, error } = await supabaseAdminClient
    .from('intakes')
    .update({ is_active: false })
    .eq('id', id)
    .select()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ intake: data[0] })
}
