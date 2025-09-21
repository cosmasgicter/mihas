const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')
const { logAuditEvent } = require('../_lib/auditLogger')

module.exports = async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const req = {
    method: event.httpMethod,
    headers: event.headers,
    body: JSON.parse(event.body || '{}')
  }

  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) }
  }

  const { applicationId } = req.body
  if (!applicationId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Application ID is required' }) }
  }

  try {
    // Get application details
    const { data: application, error: appError } = await supabaseAdminClient
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', authContext.user.id)
      .single()

    if (appError || !application) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Application not found' }) }
    }

    // Queue email notification
    const { error: emailError } = await supabaseAdminClient
      .from('email_queue')
      .insert({
        to_email: application.email,
        subject: `Application Slip - ${application.application_number}`,
        template: 'application_slip',
        template_data: {
          full_name: application.full_name,
          application_number: application.application_number,
          status: application.status,
          program: application.program,
          institution: application.institution,
          intake: application.intake,
          tracking_code: application.public_tracking_code,
          submitted_at: application.submitted_at
        },
        priority: 'normal',
        scheduled_for: new Date().toISOString()
      })

    if (emailError) {
      console.error('Email queue error:', emailError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue email' }) }
    }

    await logAuditEvent({
      req,
      action: 'applications.slip.email',
      actorId: authContext.user.id,
      actorEmail: authContext.user.email,
      targetTable: 'applications',
      targetId: applicationId,
      metadata: { recipient: application.email }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Application slip will be sent to your email shortly' 
      })
    }

  } catch (error) {
    console.error('Email slip error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}