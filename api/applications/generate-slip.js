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
      .from('applications_new')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', authContext.user.id)
      .single()

    if (appError || !application) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Application not found' }) }
    }

    // Generate HTML slip
    const html = generateApplicationSlipHTML(application)
    
    await logAuditEvent({
      req,
      action: 'applications.slip.generate',
      actorId: authContext.user.id,
      actorEmail: authContext.user.email,
      targetTable: 'applications_new',
      targetId: applicationId,
      metadata: { format: 'html' }
    })

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="application-slip-${application.application_number}.html"`
      },
      body: html
    }

  } catch (error) {
    console.error('Generate slip error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

function generateApplicationSlipHTML(application) {
  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    })
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Slip - ${application.application_number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #1d4ed8; }
        .subtitle { color: #666; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { display: flex; }
        .label { font-weight: bold; min-width: 150px; }
        .value { flex: 1; }
        .status { padding: 5px 15px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
        .status.submitted { background: #dbeafe; color: #1d4ed8; }
        .status.approved { background: #dcfce7; color: #16a34a; }
        .status.rejected { background: #fee2e2; color: #dc2626; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">MIHAS-KATC Application System</div>
        <div class="subtitle">Official Application Slip</div>
    </div>

    <div class="section">
        <div class="section-title">Application Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Application Number:</span>
                <span class="value">${application.application_number}</span>
            </div>
            <div class="info-item">
                <span class="label">Status:</span>
                <span class="value"><span class="status ${application.status}">${application.status}</span></span>
            </div>
            <div class="info-item">
                <span class="label">Submitted Date:</span>
                <span class="value">${formatDate(application.submitted_at)}</span>
            </div>
            <div class="info-item">
                <span class="label">Tracking Code:</span>
                <span class="value">${application.public_tracking_code}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Personal Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Full Name:</span>
                <span class="value">${application.full_name}</span>
            </div>
            <div class="info-item">
                <span class="label">Email:</span>
                <span class="value">${application.email}</span>
            </div>
            <div class="info-item">
                <span class="label">Phone:</span>
                <span class="value">${application.phone}</span>
            </div>
            <div class="info-item">
                <span class="label">Nationality:</span>
                <span class="value">${application.nationality}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Program Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Program:</span>
                <span class="value">${application.program}</span>
            </div>
            <div class="info-item">
                <span class="label">Institution:</span>
                <span class="value">${application.institution}</span>
            </div>
            <div class="info-item">
                <span class="label">Intake:</span>
                <span class="value">${application.intake}</span>
            </div>
            <div class="info-item">
                <span class="label">Application Fee:</span>
                <span class="value">ZMW ${application.application_fee}</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Generated on ${formatDate(new Date())} | MIHAS-KATC Admissions Portal</p>
        <p>This is an official document. Please keep for your records.</p>
    </div>
</body>
</html>`
}