import { supabaseAdminClient, getUserFromRequest } from '../_lib/supabaseClient'

const HISTORY_TABLE = 'application_status_history'
const DOCUMENTS_TABLE = 'application_documents'

function parseIncludeParam(includeParam) {
  if (!includeParam) return new Set()
  if (Array.isArray(includeParam)) {
    return new Set(includeParam.flatMap(value => value.split(',').map(item => item.trim()).filter(Boolean)))
  }
  return new Set(includeParam.split(',').map(item => item.trim()).filter(Boolean))
}

export default async function handler(req, res) {
  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid application id' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, authContext, id)
    case 'PUT':
      return handlePut(req, res, authContext, id)
    case 'PATCH':
      return handlePatch(req, res, authContext, id)
    case 'DELETE':
      return handleDelete(req, res, authContext, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res, { user, isAdmin }, id) {
  try {
    const include = parseIncludeParam(req.query.include)

    const selectClauses = ['*']
    if (include.has('documents')) {
      selectClauses.push(`documents:${DOCUMENTS_TABLE}(id, document_type, document_name, file_url, file_size, mime_type, verification_status, verified_by, verified_at, verification_notes)`)
    }
    if (include.has('grades')) {
      selectClauses.push('grades:application_grades(subject_id, grade, subject:grade12_subjects(name))')
    }
    if (include.has('statusHistory')) {
      selectClauses.push('status_history:application_status_history(id, status, changed_by, notes, created_at, changed_by_profile:changed_by(email))')
    }

    const { data, error } = await supabaseAdminClient
      .from('applications_new')
      .select(selectClauses.join(','))
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return res.status(404).json({ error: error.message })
    }

    if (!data) {
      return res.status(404).json({ error: 'Application not found' })
    }

    if (!isAdmin && data.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const {
      documents: rawDocuments = [],
      grades: rawGrades = [],
      status_history: rawHistory = [],
      ...application
    } = data

    let documents = undefined
    if (include.has('documents')) {
      documents = [...rawDocuments]

      const existingTypes = new Set(documents.map(doc => doc.document_type))
      if (application.result_slip_url && !existingTypes.has('result_slip')) {
        documents.push({
          id: 'result_slip',
          document_type: 'result_slip',
          document_name: 'Grade 12 Result Slip',
          file_url: application.result_slip_url,
          verification_status: 'pending'
        })
      }
      if (application.extra_kyc_url && !existingTypes.has('extra_kyc')) {
        documents.push({
          id: 'extra_kyc',
          document_type: 'extra_kyc',
          document_name: 'Additional KYC Document',
          file_url: application.extra_kyc_url,
          verification_status: 'pending'
        })
      }
      if (application.pop_url && !existingTypes.has('proof_of_payment')) {
        documents.push({
          id: 'proof_of_payment',
          document_type: 'proof_of_payment',
          document_name: 'Proof of Payment',
          file_url: application.pop_url,
          verification_status: 'pending'
        })
      }
    }

    const grades = include.has('grades')
      ? rawGrades.map(grade => ({
          subject_id: grade.subject_id,
          grade: grade.grade,
          subject_name: grade.subject?.name || null
        }))
      : undefined

    const statusHistory = include.has('statusHistory') ? rawHistory : undefined

    return res.status(200).json({
      application,
      documents,
      grades,
      statusHistory
    })
  } catch (error) {
    console.error('Application GET error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req, res, { user, isAdmin }, id) {
  try {
    const updates = req.body || {}

    let query = supabaseAdminClient
      .from('applications_new')
      .update(updates)
      .eq('id', id)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.select().single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Application UPDATE error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePatch(req, res, context, id) {
  const { action } = req.body || {}
  if (!action) {
    return res.status(400).json({ error: 'Action is required' })
  }

  switch (action) {
    case 'verify_document':
      return verifyDocument(req, res, context, id)
    case 'update_status':
      return updateApplicationStatus(req, res, context, id)
    case 'update_payment_status':
      return updatePaymentStatus(req, res, context, id)
    case 'send_notification':
      return sendNotification(req, res, context, id)
    case 'sync_grades':
      return syncGrades(req, res, context, id)
    default:
      return res.status(400).json({ error: 'Unsupported action' })
  }
}

async function handleDelete(req, res, { user, isAdmin }, id) {
  try {
    let query = supabaseAdminClient
      .from('applications_new')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { error } = await query
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Application DELETE error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function verifyDocument(req, res, { user, isAdmin }, id) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { documentId, documentType, status, notes } = req.body || {}
  if (!documentId && !documentType) {
    return res.status(400).json({ error: 'Document identifier is required' })
  }
  if (!status) {
    return res.status(400).json({ error: 'Status is required' })
  }

  try {
    let targetId = documentId

    if (!targetId) {
      const { data: existing, error: lookupError } = await supabaseAdminClient
        .from(DOCUMENTS_TABLE)
        .select('id')
        .eq('application_id', id)
        .eq('document_type', documentType)
        .maybeSingle()

      if (lookupError) {
        return res.status(400).json({ error: lookupError.message })
      }

      targetId = existing?.id
      if (!targetId) {
        return res.status(404).json({ error: 'Document not found' })
      }
    }

    const { data, error } = await supabaseAdminClient
      .from(DOCUMENTS_TABLE)
      .update({
        verification_status: status,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        verification_notes: notes || null
      })
      .eq('id', targetId)
      .eq('application_id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Document verification error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateApplicationStatus(req, res, { user, isAdmin }, id) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { status, notes } = req.body || {}
  if (!status) {
    return res.status(400).json({ error: 'Status is required' })
  }

  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'under_review') {
      updateData.review_started_at = new Date().toISOString()
    }

    if (['approved', 'rejected'].includes(status)) {
      updateData.decision_date = new Date().toISOString()
    }

    const { data, error } = await supabaseAdminClient
      .from('applications_new')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await supabaseAdminClient
      .from(HISTORY_TABLE)
      .insert({
        application_id: id,
        status,
        changed_by: user.id,
        notes: notes || null
      })

    return res.status(200).json(data)
  } catch (error) {
    console.error('Status update error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function updatePaymentStatus(req, res, { isAdmin }, id) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { paymentStatus } = req.body || {}
  if (!paymentStatus) {
    return res.status(400).json({ error: 'Payment status is required' })
  }

  try {
    const { data, error } = await supabaseAdminClient
      .from('applications_new')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Payment status update error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function sendNotification(req, res, { user, isAdmin }, id) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { title, message } = req.body || {}
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' })
  }

  try {
    const { data: application, error: fetchError } = await supabaseAdminClient
      .from('applications_new')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message })
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    await supabaseAdminClient
      .from('notifications')
      .insert({
        user_id: application.user_id,
        title,
        message,
        type: 'application_update'
      })

    await supabaseAdminClient
      .from('applications_new')
      .update({
        admin_feedback: message,
        admin_feedback_date: new Date().toISOString(),
        admin_feedback_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Notification error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function syncGrades(req, res, { user, isAdmin }, id) {
  const { grades } = req.body || {}
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: 'Grades must be an array' })
  }

  try {
    // Ensure application belongs to the user unless admin
    if (!isAdmin) {
      const { data: application, error } = await supabaseAdminClient
        .from('applications_new')
        .select('id, user_id')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      if (!application || application.user_id !== user.id) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // Remove existing grades for the application
    await supabaseAdminClient
      .from('application_grades')
      .delete()
      .eq('application_id', id)

    if (grades.length > 0) {
      const gradeRows = grades
        .filter(grade => grade.subject_id)
        .map(grade => ({
          application_id: id,
          subject_id: grade.subject_id,
          grade: grade.grade
        }))

      if (gradeRows.length > 0) {
        const { error: insertError } = await supabaseAdminClient
          .from('application_grades')
          .insert(gradeRows)

        if (insertError) {
          return res.status(400).json({ error: insertError.message })
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Sync grades error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
