const { supabaseAdminClient, getUserFromRequest } = require('./_lib/supabaseClient')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('./_lib/rateLimiter')

module.exports = async function handler(req, res) {
  const { resource } = req.query

  if (!resource || !['subjects', 'programs', 'intakes'].includes(resource)) {
    return res.status(400).json({ error: 'Invalid resource. Use: subjects, programs, or intakes' })
  }

  // Rate limiting temporarily disabled for testing
  // try {
  //   const rateKey = buildRateLimitKey(req, { prefix: `catalog-${resource}` })
  //   const rateResult = await checkRateLimit(
  //     rateKey,
  //     getLimiterConfig(`catalog_${resource}`, { maxAttempts: 45, windowMs: 60_000 })
  //   )

  //   if (rateResult.isLimited) {
  //     attachRateLimitHeaders(res, rateResult)
  //     return res.status(429).json({ error: 'Too many catalog requests. Please slow down.' })
  //   }
  // } catch (rateError) {
  //   console.error('Catalog rate limiter error:', rateError)
  //   return res.status(503).json({ error: 'Rate limiter unavailable' })
  // }

  const authContext = await getUserFromRequest(req, { requireAdmin: req.method !== 'GET' })
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    switch (resource) {
      case 'subjects':
        return await handleSubjects(req, res)
      case 'programs':
        return await handlePrograms(req, res)
      case 'intakes':
        return await handleIntakes(req, res)
    }
  } catch (error) {
    console.error(`${resource} API error:`, error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleSubjects(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data, error } = await supabaseAdminClient
    .from('grade12_subjects')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ subjects: data || [] })
}

async function handlePrograms(req, res) {
  switch (req.method) {
    case 'GET':
      const { data, error } = await supabaseAdminClient
        .from('programs')
        .select(`*, institutions (id, name, slug)`)
        .eq('is_active', true)
        .order('name')

      if (error) {
        return res.status(400).json({ error: error.message })
      }
      return res.status(200).json({ programs: data || [] })

    case 'POST':
      const { name, description, duration_years, institution_id } = req.body
      if (!name?.trim() || !institution_id || !duration_years) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const { data: newProgram, error: createError } = await supabaseAdminClient
        .from('programs')
        .insert({ name: name.trim(), description: description?.trim() || null, duration_years, institution_id, is_active: true })
        .select()

      if (createError) {
        return res.status(400).json({ error: createError.message })
      }
      return res.status(201).json({ program: newProgram[0] })

    case 'PUT':
      const { id, name: updateName, description: updateDesc, duration_years: updateDuration, institution_id: updateInstitution } = req.body
      if (!id || !updateName?.trim() || !updateInstitution || !updateDuration) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const { data: updatedProgram, error: updateError } = await supabaseAdminClient
        .from('programs')
        .update({ name: updateName.trim(), description: updateDesc?.trim() || null, duration_years: updateDuration, institution_id: updateInstitution })
        .eq('id', id)
        .select()

      if (updateError) {
        return res.status(400).json({ error: updateError.message })
      }
      return res.status(200).json({ program: updatedProgram[0] })

    case 'DELETE':
      const { id: deleteId } = req.body
      if (!deleteId) {
        return res.status(400).json({ error: 'Program ID is required' })
      }

      const { data: deletedProgram, error: deleteError } = await supabaseAdminClient
        .from('programs')
        .update({ is_active: false })
        .eq('id', deleteId)
        .select()

      if (deleteError) {
        return res.status(400).json({ error: deleteError.message })
      }
      return res.status(200).json({ program: deletedProgram[0] })

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleIntakes(req, res) {
  switch (req.method) {
    case 'GET':
      const { data, error } = await supabaseAdminClient
        .from('intakes')
        .select('*')
        .eq('is_active', true)
        .order('application_deadline')

      if (error) {
        return res.status(400).json({ error: error.message })
      }
      return res.status(200).json({ intakes: data || [] })

    case 'POST':
      const { name, year, start_date, end_date, application_deadline, total_capacity, available_spots } = req.body
      if (!name?.trim() || !year || !start_date || !end_date || !application_deadline || !total_capacity) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const { data: newIntake, error: createError } = await supabaseAdminClient
        .from('intakes')
        .insert({
          name: name.trim(), year, start_date, end_date, application_deadline, total_capacity,
          available_spots: available_spots ?? total_capacity, is_active: true
        })
        .select()

      if (createError) {
        return res.status(400).json({ error: createError.message })
      }
      return res.status(201).json({ intake: newIntake[0] })

    case 'PUT':
      const { id, name: updateName, year: updateYear, start_date: updateStart, end_date: updateEnd, 
              application_deadline: updateDeadline, total_capacity: updateCapacity, available_spots: updateSpots } = req.body
      if (!id || !updateName?.trim() || !updateYear || !updateStart || !updateEnd || !updateDeadline || !updateCapacity) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const { data: updatedIntake, error: updateError } = await supabaseAdminClient
        .from('intakes')
        .update({
          name: updateName.trim(), year: updateYear, start_date: updateStart, end_date: updateEnd,
          application_deadline: updateDeadline, total_capacity: updateCapacity, available_spots: updateSpots ?? updateCapacity
        })
        .eq('id', id)
        .select()

      if (updateError) {
        return res.status(400).json({ error: updateError.message })
      }
      return res.status(200).json({ intake: updatedIntake[0] })

    case 'DELETE':
      const { id: deleteId } = req.body
      if (!deleteId) {
        return res.status(400).json({ error: 'Intake ID is required' })
      }

      const { data: deletedIntake, error: deleteError } = await supabaseAdminClient
        .from('intakes')
        .update({ is_active: false })
        .eq('id', deleteId)
        .select()

      if (deleteError) {
        return res.status(400).json({ error: deleteError.message })
      }
      return res.status(200).json({ intake: deletedIntake[0] })

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}