const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')
const { logAuditEvent } = require('../_lib/auditLogger')
const {
  checkRateLimit,
  buildRateLimitKey,
  getLimiterConfig,
  attachRateLimitHeaders
} = require('../_lib/rateLimiter')

const DOCUMENT_BUCKET = 'documents'

const HISTORY_TABLE = 'application_status_history'
const DOCUMENTS_TABLE = 'application_documents'

function parseIncludeParam(includeParam) {
  if (!includeParam) return new Set()
  
  try {
    if (Array.isArray(includeParam)) {
      return new Set(includeParam.flatMap(value => 
        String(value).split(',').map(item => item.trim().replace(/:.*$/, '')).filter(Boolean)
      ))
    }
    return new Set(String(includeParam).split(',').map(item => item.trim().replace(/:.*$/, '')).filter(Boolean))
  } catch (error) {
    console.warn('Failed to parse include parameter:', includeParam, error)
    return new Set()
  }
}

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }


  try {
    const rateKey = buildRateLimitKey(req, { prefix: 'applications-detail' })
    const rateResult = await checkRateLimit(
      rateKey,
      getLimiterConfig('applications_detail', { maxAttempts: 60, windowMs: 60_000 })
    )

    if (rateResult.isLimited) {
      attachRateLimitHeaders(res, rateResult)
      return res.status(429).json({ error: 'Too many detail requests. Please slow down.' })
    }
  } catch (rateError) {
    console.error('Application detail rate limiter error:', rateError)
    return res.status(503).json({ error: 'Rate limiter unavailable' })
  }

  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  const { id } = req.params
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid application id' })
  }

  // Normalize request body parsing once
  let body = {}
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' })
    }
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, authContext, id)
    case 'PUT':
      return handlePut(req, res, authContext, id, body)
    case 'PATCH':
      return handlePatch(req, res, authContext, id, body)
    case 'DELETE':
      return handleDelete(req, res, authContext, id)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res, { user, isAdmin, roles }, id) {
  try {
    const include = parseIncludeParam(req.query.include)
    console.log('Include params:', Array.from(include))

    // Base application query
    const { data: application, error: appError } = await supabaseAdminClient
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (appError) {
      console.error('Application fetch error:', appError)
      return res.status(400).json({ error: appError.message })
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    if (!isAdmin && application.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Fetch related data separately to avoid complex join issues
    let documents = undefined
    let grades = undefined
    let statusHistory = undefined

    // Fetch documents if requested
    if (include.has('documents')) {
      try {
        const { data: docsData } = await supabaseAdminClient
          .from(DOCUMENTS_TABLE)
          .select('id, document_type, document_name, file_url, file_size, mime_type, system_generated, verification_status, verified_by, verified_at, verification_notes')
          .eq('application_id', id)
        documents = docsData || []
      } catch (docError) {
        console.warn('Failed to fetch documents:', docError)
        documents = []
      }
    }

    // Fetch grades if requested
    if (include.has('grades')) {
      try {
        const { data: gradesData, error: gradeError } = await supabaseAdminClient
          .from('application_grades')
          .select('subject_id, grade, subject:grade12_subjects(name)')
          .eq('application_id', id)
        
        if (gradeError) {
          console.warn('Grade fetch error:', gradeError)
          grades = []
        } else {
          grades = gradesData || []
        }
      } catch (gradeError) {
        console.warn('Failed to fetch grades:', gradeError)
        grades = []
      }
    }

    // Fetch status history if requested
    if (include.has('statusHistory')) {
      try {
        const { data: historyData, error: historyError } = await supabaseAdminClient
          .from('application_status_history')
          .select('id, status, changed_by, notes, created_at, changed_by_profile:changed_by(email)')
          .eq('application_id', id)
          .order('created_at', { ascending: false })
        
        if (historyError) {
          console.warn('History fetch error:', historyError)
          statusHistory = []
        } else {
          statusHistory = historyData || []
        }
      } catch (historyError) {
        console.warn('Failed to fetch status history:', historyError)
        statusHistory = []
      }
    }

    // Add legacy document URLs to documents array if they exist
    if (documents !== undefined) {
      const existingTypes = new Set(documents.map(doc => doc.document_type))
      if (application.result_slip_url && !existingTypes.has('result_slip')) {
        documents.push({
          id: 'result_slip',
          document_type: 'result_slip',
          document_name: 'Grade 12 Result Slip',
          file_url: application.result_slip_url,
          verification_status: 'pending',
          system_generated: false
        })
      }
      if (application.extra_kyc_url && !existingTypes.has('extra_kyc')) {
        documents.push({
          id: 'extra_kyc',
          document_type: 'extra_kyc',
          document_name: 'Additional KYC Document',
          file_url: application.extra_kyc_url,
          verification_status: 'pending',
          system_generated: false
        })
      }
      if (application.pop_url && !existingTypes.has('proof_of_payment')) {
        documents.push({
          id: 'proof_of_payment',
          document_type: 'proof_of_payment',
          document_name: 'Proof of Payment',
          file_url: application.pop_url,
          verification_status: 'pending',
          system_generated: false
        })
      }
    }

    // Format grades data
    if (grades !== undefined) {
      grades = grades.map(grade => ({
        subject_id: grade.subject_id,
        grade: grade.grade,
        subject_name: grade.subject?.name || null
      }))
    }

    await logAuditEvent({
      req,
      action: 'applications.detail.view',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: {
        include: Array.from(include),
        isAdmin,
        returnedDocuments: Array.isArray(documents) ? documents.length : 0
      }
    })

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

async function handlePut(req, res, { user, isAdmin, roles }, id, body) {
  try {
    const updates = body

    let query = supabaseAdminClient
      .from('applications')
      .update(updates)
      .eq('id', id)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.select().single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAuditEvent({
      req,
      action: 'applications.record.update',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: {
        fields: Object.keys(updates || {}),
        isAdmin
      }
    })

    return res.status(200).json(data)
  } catch (error) {
    console.error('Application UPDATE error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePatch(req, res, context, id, body) {
  const { action } = body
  if (!action) {
    return res.status(400).json({ error: 'Action is required' })
  }

  switch (action) {
    case 'verify_document':
      return verifyDocument(req, res, context, id, body)
    case 'update_status':
      return updateApplicationStatus(req, res, context, id, body)
    case 'update_payment_status':
      return updatePaymentStatus(req, res, context, id, body)
    case 'send_notification':
      return sendNotification(req, res, context, id, body)
    case 'sync_grades':
      return syncGrades(req, res, context, id, body)
    case 'generate_acceptance_letter':
      return generateAcceptanceLetter(req, res, context, id)
    case 'generate_finance_receipt':
      return generateFinanceReceipt(req, res, context, id)
    default:
      return res.status(400).json({ error: 'Unsupported action' })
  }
}

async function handleDelete(req, res, { user, isAdmin, roles }, id) {
  try {
    let query = supabaseAdminClient
      .from('applications')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { error } = await query
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAuditEvent({
      req,
      action: 'applications.record.delete',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: { isAdmin }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Application DELETE error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function verifyDocument(req, res, { user, isAdmin, roles }, id, body) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { documentId, documentType, status, notes } = body
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

    await logAuditEvent({
      req,
      action: 'applications.document.verify',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: DOCUMENTS_TABLE,
      targetId,
      targetLabel: data?.document_type || documentType || null,
      metadata: {
        applicationId: id,
        status,
        notes: notes || null
      }
    })

    return res.status(200).json(data)
  } catch (error) {
    console.error('Document verification error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function updateApplicationStatus(req, res, { user, isAdmin, roles }, id, body) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { status, notes } = body
  if (!status) {
    return res.status(400).json({ error: 'Status is required' })
  }

  try {
    const { data: existingApplication, error: fetchError } = await supabaseAdminClient
      .from('applications')
      .select('status, intake, intake_id, intake_name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message })
    }

    if (!existingApplication) {
      return res.status(404).json({ error: 'Application not found' })
    }

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
      .from('applications')
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

    const intakeId = existingApplication.intake_id || data?.intake_id || null
    const intakeName =
      existingApplication.intake || existingApplication.intake_name || data?.intake || data?.intake_name || null

    try {
      await adjustIntakeAvailability({
        previousStatus: existingApplication.status,
        newStatus: data?.status || status,
        intakeId,
        intakeName
      })
    } catch (adjustmentError) {
      console.error('Failed to adjust intake availability', adjustmentError)
    }

    await logAuditEvent({
      req,
      action: 'applications.status.update',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: {
        previousStatus: existingApplication.status,
        newStatus: data?.status || status,
        notes: notes || null
      }
    })

    return res.status(200).json(data)
  } catch (error) {
    console.error('Status update error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function updatePaymentStatus(req, res, { user, isAdmin, roles }, id, body) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { paymentStatus, verificationNotes } = body
  if (!paymentStatus) {
    return res.status(400).json({ error: 'Payment status is required' })
  }

  try {
    const now = new Date().toISOString()
    const updateData = {
      payment_status: paymentStatus,
      updated_at: now
    }

    if (paymentStatus === 'verified') {
      updateData.payment_verified_at = now
      updateData.payment_verified_by = user.id
    } else {
      updateData.payment_verified_at = null
      updateData.payment_verified_by = null
    }

    const { data, error } = await supabaseAdminClient
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    let verifierProfile = null
    if (paymentStatus === 'verified') {
      const { data: profileData } = await supabaseAdminClient
        .from('user_profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle()

      verifierProfile = profileData || null

      const { error: auditError } = await supabaseAdminClient
        .from('payment_audit_log')
        .insert({
          application_id: id,
          action: 'payment_verified',
          amount: data?.amount ?? null,
          payment_method: data?.payment_method ?? null,
          reference: data?.momo_ref ?? null,
          notes: verificationNotes || null,
          recorded_by: user.id,
          recorded_by_email: verifierProfile?.email || null,
          recorded_by_name: verifierProfile?.full_name || null,
          recorded_at: now
        })

      if (auditError) {
        console.error('Payment audit log error', auditError)
        return res.status(500).json({ error: 'Failed to record payment audit entry' })
      }
    }

    await logAuditEvent({
      req,
      action: 'applications.payment.update',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: {
        paymentStatus,
        verificationNotes: verificationNotes || null,
        verifiedAt: updateData.payment_verified_at,
        paymentVerifiedBy: updateData.payment_verified_by
      }
    })

    return res.status(200).json({
      ...data,
      payment_verified_at: updateData.payment_verified_at,
      payment_verified_by: updateData.payment_verified_by,
      payment_verified_by_name: verifierProfile?.full_name || null,
      payment_verified_by_email: verifierProfile?.email || null
    })

  } catch (error) {
    console.error('Payment status update error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function adjustIntakeAvailability({ previousStatus, newStatus, intakeId, intakeName }) {
  const normalizedPrevious = previousStatus || null
  const normalizedNext = newStatus || null

  const movedIntoApproved = normalizedNext === 'approved' && normalizedPrevious !== 'approved'
  const movedOutOfApproved = normalizedPrevious === 'approved' && normalizedNext !== 'approved'

  if (!movedIntoApproved && !movedOutOfApproved) {
    return
  }

  if (!intakeId && !intakeName) {
    console.warn('Skipping intake availability adjustment - no intake identifier found', {
      previousStatus,
      newStatus
    })
    return
  }

  let intakeQuery = supabaseAdminClient
    .from('intakes')
    .select('id, name, available_spots, total_capacity')
    .limit(1)

  intakeQuery = intakeId ? intakeQuery.eq('id', intakeId) : intakeQuery.eq('name', intakeName)

  const { data: intakeRecord, error: intakeError } = await intakeQuery.maybeSingle()

  if (intakeError) {
    console.warn('Failed to fetch intake for availability adjustment', {
      intakeId,
      intakeName,
      error: intakeError
    })
    return
  }

  if (!intakeRecord) {
    console.warn('No intake found for availability adjustment', { intakeId, intakeName })
    return
  }

  const rawAvailable =
    intakeRecord.available_spots === null || intakeRecord.available_spots === undefined
      ? 0
      : Number(intakeRecord.available_spots)
  const rawTotalCapacity =
    intakeRecord.total_capacity === null || intakeRecord.total_capacity === undefined
      ? null
      : Number(intakeRecord.total_capacity)

  const currentAvailable = Number.isFinite(rawAvailable) ? rawAvailable : 0
  let availableSpots = currentAvailable
  const totalCapacity = Number.isFinite(rawTotalCapacity) ? rawTotalCapacity : null

  if (movedIntoApproved) {
    availableSpots -= 1
  } else if (movedOutOfApproved) {
    availableSpots += 1
  }

  if (availableSpots < 0) {
    availableSpots = 0
  }

  if (totalCapacity !== null && availableSpots > totalCapacity) {
    availableSpots = totalCapacity
  }

  if (availableSpots === currentAvailable) {
    return
  }

  let updateQuery = supabaseAdminClient.from('intakes').update({ available_spots: availableSpots })
  updateQuery = intakeId ? updateQuery.eq('id', intakeId) : updateQuery.eq('name', intakeName)

  const { error: updateError } = await updateQuery
  if (updateError) {
    console.warn('Failed to update intake availability', {
      intakeId,
      intakeName,
      error: updateError
    })
  }
}

async function sendNotification(req, res, { user, isAdmin, roles }, id, body) {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { title, message } = body
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' })
  }

  try {
    const { data: application, error: fetchError } = await supabaseAdminClient
      .from('applications')
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
      .from('applications')
      .update({
        admin_feedback: message,
        admin_feedback_date: new Date().toISOString(),
        admin_feedback_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    await logAuditEvent({
      req,
      action: 'applications.notification.send',
      actorId: user.id,
      actorEmail: user.email,
      actorRoles: roles,
      targetTable: 'applications',
      targetId: id,
      metadata: {
        title,
        messageLength: message.length,
        recipientId: application.user_id
      }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Notification error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

async function generateAcceptanceLetter(req, res, context, id) {
  if (!context.isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    const documentRecord = await generateSystemDocument({
      applicationId: id,
      context,
      documentType: 'acceptance_letter',
      render: details => renderAcceptanceLetter({ ...details, admin: context.user })
    })

    await logAuditEvent({
      req,
      action: 'applications.document.generate',
      actorId: context.user.id,
      actorEmail: context.user?.email || null,
      actorRoles: context.roles,
      targetTable: DOCUMENTS_TABLE,
      targetId: documentRecord?.id || null,
      targetLabel: 'acceptance_letter',
      metadata: {
        applicationId: id,
        fileUrl: documentRecord?.file_url || null,
        size: documentRecord?.file_size || null
      }
    })

    return res.status(200).json(documentRecord)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Acceptance letter generation error', error)
    return res.status(500).json({ error: 'Failed to generate acceptance letter' })
  }
}

async function generateFinanceReceipt(req, res, context, id) {
  if (!context.isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    const documentRecord = await generateSystemDocument({
      applicationId: id,
      context,
      documentType: 'finance_receipt',
      render: details => renderFinanceReceipt({ ...details, admin: context.user })
    })

    await logAuditEvent({
      req,
      action: 'applications.document.generate',
      actorId: context.user.id,
      actorEmail: context.user?.email || null,
      actorRoles: context.roles,
      targetTable: DOCUMENTS_TABLE,
      targetId: documentRecord?.id || null,
      targetLabel: 'finance_receipt',
      metadata: {
        applicationId: id,
        fileUrl: documentRecord?.file_url || null,
        size: documentRecord?.file_size || null
      }
    })

    return res.status(200).json(documentRecord)
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Finance receipt generation error', error)
    return res.status(500).json({ error: 'Failed to generate finance receipt' })
  }
}

async function generateSystemDocument({ applicationId, context, documentType, render }) {
  const details = await fetchApplicationWithRelations(applicationId)
  if (!details.application) {
    throw new NotFoundError('Application not found')
  }

  const generatedAt = new Date()
  const renderResult = render({ ...details, generatedAt, admin: context.user })

  if (!renderResult) {
    throw new Error('Renderer did not return any document content')
  }

  const fileExtension = sanitizeExtension(renderResult.fileExtension || 'html')
  const mimeType = renderResult.mimeType || 'text/html'
  const fileName = renderResult.fileName || buildFileName(documentType, details.application, fileExtension)
  const documentName = renderResult.documentName || fileName

  const contentBuffer = Buffer.isBuffer(renderResult.content)
    ? renderResult.content
    : Buffer.from(renderResult.content || '', 'utf-8')

  if (!contentBuffer || contentBuffer.length === 0) {
    throw new Error('Generated document content was empty')
  }

  const filePath = `${details.application.user_id}/${applicationId}/${fileName}`
  const { data: uploadData, error: uploadError } = await supabaseAdminClient.storage
    .from(DOCUMENT_BUCKET)
    .upload(filePath, contentBuffer, {
      contentType: mimeType,
      upsert: true
    })

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload document to storage')
  }

  const nowIso = generatedAt.toISOString()
  const { data: documentRecord, error: upsertError } = await supabaseAdminClient
    .from(DOCUMENTS_TABLE)
    .upsert(
      {
        application_id: applicationId,
        document_type: documentType,
        document_name: documentName,
        file_url: uploadData?.path || filePath,
        file_size: contentBuffer.length,
        mime_type: mimeType,
        system_generated: true,
        verification_status: 'verified',
        verified_by: context.user.id,
        verified_at: nowIso,
        verification_notes: 'Automatically generated by the admissions portal',
        updated_at: nowIso
      },
      { onConflict: 'application_id,document_type' }
    )
    .select()
    .single()

  if (upsertError) {
    throw new Error(upsertError.message || 'Failed to record generated document')
  }

  return documentRecord
}

async function fetchApplicationWithRelations(applicationId) {
  const { data: application, error } = await supabaseAdminClient
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!application) {
    return { application: null, program: null, intake: null, latestPayment: null }
  }

  const [program, intake, latestPayment] = await Promise.all([
    application.program
      ? safeSelectSingle(() =>
          supabaseAdminClient
            .from('programs')
            .select('*')
            .eq('name', application.program)
            .limit(1)
            .maybeSingle()
        )
      : Promise.resolve(null),
    application.intake
      ? fetchIntakeDetails(application.intake)
      : Promise.resolve(null),
    safeSelectSingle(() =>
      supabaseAdminClient
        .from('payment_audit_log')
        .select('*')
        .eq('application_id', applicationId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  ])

  return { application, program, intake, latestPayment }
}

async function fetchIntakeDetails(intakeName) {
  const primary = await safeSelectSingle(() =>
    supabaseAdminClient
      .from('intakes')
      .select('*')
      .eq('name', intakeName)
      .limit(1)
      .maybeSingle()
  )

  if (primary) {
    return primary
  }

  return safeSelectSingle(() =>
    supabaseAdminClient
      .from('program_intakes')
      .select('*')
      .eq('name', intakeName)
      .limit(1)
      .maybeSingle()
  )
}

async function safeSelectSingle(executor) {
  try {
    const { data, error } = await executor()
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST214' || error.code === 'PGRST103') {
        return null
      }

      // Table might not exist in some environments; log and continue with minimal data
      if (error.code === '42P01') {
        console.warn('Optional relation table missing during document generation', error.message)
        return null
      }

      console.warn('Failed to fetch related data for document generation', error)
      return null
    }

    return data || null
  } catch (err) {
    console.warn('Unexpected error while fetching related data', err)
    return null
  }
}

function renderAcceptanceLetter({ application, program, intake, latestPayment, generatedAt, admin }) {
  const issueDate = formatDate(generatedAt)
  const programName = program?.name || application.program
  const intakeName = intake?.name || application.intake
  const startDate = formatDate(intake?.start_date)
  const paymentStatus = application.payment_status || 'pending_review'
  const applicationFee = formatCurrency(toNumber(application.application_fee))
  const amountPaid = formatCurrency(
    toNumber(latestPayment?.amount ?? application.amount ?? application.application_fee)
  )
  const paymentReference = latestPayment?.reference || application.momo_ref || 'N/A'
  const adminName = getUserDisplayName(admin)

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Acceptance Letter</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; background: #f9fafb; margin: 0; padding: 32px; }
      .document { background: #ffffff; max-width: 720px; margin: 0 auto; padding: 40px 48px; border-radius: 16px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12); }
      h1 { font-size: 28px; margin-bottom: 8px; color: #0f172a; }
      h2 { font-size: 20px; margin-top: 32px; color: #1d4ed8; }
      p { line-height: 1.7; margin: 12px 0; }
      .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; color: #475569; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { padding: 12px 16px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
      th { background: #f1f5f9; font-weight: 600; }
      .footer { margin-top: 40px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      .signature { margin-top: 32px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="document">
      <div class="meta">
        <span>Issued: ${escapeHtml(issueDate)}</span>
        <span>Application #: ${escapeHtml(application.application_number || application.id)}</span>
      </div>
      <h1>Official Acceptance</h1>
      <p>Dear ${escapeHtml(application.full_name)},</p>
      <p>
        Congratulations! We are delighted to inform you that your application to the
        ${escapeHtml(programName)} programme for the ${escapeHtml(intakeName)} intake at
        ${escapeHtml(application.institution)} has been successful.
      </p>
      <p>
        This offer confirms your place in the upcoming academic session. Kindly review the programme
        information below and keep a copy of this letter for your records.
      </p>

      <h2>Programme Summary</h2>
      <table>
        <tr>
          <th>Programme</th>
          <td>${escapeHtml(programName)}</td>
        </tr>
        <tr>
          <th>Intake</th>
          <td>${escapeHtml(intakeName)}</td>
        </tr>
        <tr>
          <th>Intake Start Date</th>
          <td>${escapeHtml(startDate)}</td>
        </tr>
        <tr>
          <th>Campus / Institution</th>
          <td>${escapeHtml(application.institution)}</td>
        </tr>
      </table>

      <h2>Payment Summary</h2>
      <table>
        <tr>
          <th>Application Fee</th>
          <td>${escapeHtml(applicationFee)}</td>
        </tr>
        <tr>
          <th>Amount Received</th>
          <td>${escapeHtml(amountPaid)}</td>
        </tr>
        <tr>
          <th>Payment Status</th>
          <td>${escapeHtml(paymentStatus)}</td>
        </tr>
        <tr>
          <th>Reference</th>
          <td>${escapeHtml(paymentReference)}</td>
        </tr>
      </table>

      <p>
        Please remember to present this letter during your registration. Additional documentation may be requested
        during orientation. Our admissions office will reach out with further instructions ahead of the intake start date.
      </p>

      <p class="signature">${escapeHtml(adminName)}<br />Admissions Office</p>

      <div class="footer">
        Generated on ${escapeHtml(issueDate)} via the MIHAS Admissions Portal.
      </div>
    </div>
  </body>
</html>`

  return {
    content: html,
    fileExtension: 'html',
    mimeType: 'text/html',
    fileName: buildFileName('acceptance-letter', application, 'html'),
    documentName: buildFileName('acceptance-letter', application, 'html')
  }
}

function renderFinanceReceipt({ application, latestPayment, generatedAt, admin, program }) {
  const receiptDate = formatDate(generatedAt)
  const paymentDate = formatDate(latestPayment?.recorded_at || application.paid_at)
  const amountPaidNumber = toNumber(latestPayment?.amount ?? application.amount)
  const applicationFeeNumber = toNumber(application.application_fee)
  const balanceNumber =
    applicationFeeNumber !== null && amountPaidNumber !== null
      ? Math.max(applicationFeeNumber - amountPaidNumber, 0)
      : null

  const amountPaid = formatCurrency(amountPaidNumber)
  const totalFee = formatCurrency(applicationFeeNumber)
  const balance = formatCurrency(balanceNumber)

  const paymentMethod = latestPayment?.payment_method || application.payment_method || 'N/A'
  const reference = latestPayment?.reference || application.momo_ref || 'N/A'
  const payerName = application.payer_name || latestPayment?.recorded_by_name || 'N/A'
  const adminName = getUserDisplayName(admin)
  const programmeName = program?.name || application.program

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Finance Receipt</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
      .document { background: #ffffff; max-width: 720px; margin: 0 auto; padding: 40px 48px; border-radius: 18px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15); }
      h1 { font-size: 26px; margin-bottom: 4px; color: #0f172a; }
      .subtitle { color: #64748b; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { padding: 12px 16px; border: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
      th { background: #eff6ff; font-weight: 600; }
      .totals-row th, .totals-row td { font-size: 15px; font-weight: 600; }
      .footer { margin-top: 32px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    </style>
  </head>
  <body>
    <div class="document">
      <h1>Official Payment Receipt</h1>
      <div class="subtitle">Receipt #: ${escapeHtml(application.application_number || application.id)}</div>

      <table>
        <tr>
          <th>Student Name</th>
          <td>${escapeHtml(application.full_name)}</td>
        </tr>
        <tr>
          <th>Programme</th>
          <td>${escapeHtml(programmeName)}</td>
        </tr>
        <tr>
          <th>Payment Method</th>
          <td>${escapeHtml(paymentMethod)}</td>
        </tr>
        <tr>
          <th>Payment Reference</th>
          <td>${escapeHtml(reference)}</td>
        </tr>
        <tr>
          <th>Payment Date</th>
          <td>${escapeHtml(paymentDate)}</td>
        </tr>
        <tr>
          <th>Payer Name</th>
          <td>${escapeHtml(payerName)}</td>
        </tr>
      </table>

      <table>
        <tr class="totals-row">
          <th>Application Fee</th>
          <td>${escapeHtml(totalFee)}</td>
        </tr>
        <tr class="totals-row">
          <th>Amount Received</th>
          <td>${escapeHtml(amountPaid)}</td>
        </tr>
        <tr class="totals-row">
          <th>Balance Due</th>
          <td>${escapeHtml(balance)}</td>
        </tr>
      </table>

      <p>This receipt acknowledges payment received for the application fee associated with the above programme.</p>

      <div class="footer">
        Generated on ${escapeHtml(receiptDate)} by ${escapeHtml(adminName)} via the MIHAS Admissions Portal.
      </div>
    </div>
  </body>
</html>`

  return {
    content: html,
    fileExtension: 'html',
    mimeType: 'text/html',
    fileName: buildFileName('finance-receipt', application, 'html'),
    documentName: buildFileName('finance-receipt', application, 'html')
  }
}

function buildFileName(prefix, application, extension) {
  const cleanExtension = sanitizeExtension(extension || 'html')
  const parts = [prefix, application.application_number || application.id]
  const sanitizedParts = parts
    .filter(Boolean)
    .map(part =>
      part
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)

  const baseName = sanitizedParts.length ? sanitizedParts.join('-') : `${prefix}-${application.id}`
  return `${baseName}.${cleanExtension}`
}

function sanitizeExtension(extension) {
  return (extension || 'html').toString().replace(/^\.+/, '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'html'
}

function escapeHtml(value) {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(value) {
  if (!value) return 'N/A'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'N/A'
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ZMW' }).format(Number(amount))
  } catch (error) {
    return `ZMW ${Number(amount).toFixed(2)}`
  }
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getUserDisplayName(user) {
  if (!user) {
    return 'Admissions Office'
  }

  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Admissions Office'
  )
}

async function syncGrades(req, res, { user, isAdmin, roles }, id, body) {
  const { grades } = body
  if (!Array.isArray(grades)) {
    return res.status(400).json({ error: 'Grades must be an array' })
  }

  try {
    // Ensure application belongs to the user unless admin
    if (!isAdmin) {
      const { data: application, error } = await supabaseAdminClient
        .from('applications')
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

    let insertedCount = 0

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

        insertedCount = gradeRows.length
      }
    }

    await logAuditEvent({
      req,
      action: 'applications.grades.sync',
      actorId: user.id,
      actorEmail: user.email || null,
      actorRoles: roles,
      targetTable: 'application_grades',
      targetId: id,
      metadata: {
        isAdmin,
        submittedGrades: Array.isArray(grades) ? grades.length : 0,
        persistedGrades: insertedCount
      }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Sync grades error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
