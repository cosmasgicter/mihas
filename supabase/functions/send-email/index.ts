import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EmailRequestBody = {
  to: string | string[]
  subject: string
  template: string
  data: Record<string, unknown>
}

type ParsedEmailRequest = {
  recipients: string[]
  subject: string
  template: string
  data: Record<string, unknown>
}

type TemplateResult = {
  html: string
  text: string
}

type EmailPayload = TemplateResult & {
  to: string[]
  subject: string
}

type SendResult = {
  provider: string
  id?: string
}

type TemplateRenderer = (data: Record<string, unknown>) => TemplateResult

const emailTemplates: Record<string, TemplateRenderer> = {
  'admin-new-application': (data) => {
    const templateId = 'admin-new-application'
    const applicationNumber = getStringField(data, 'applicationNumber', templateId)
    const applicantName = getStringField(data, 'applicantName', templateId)
    const programName = getStringField(data, 'programName', templateId)
    const submittedAt = typeof data.submittedAt === 'string' && data.submittedAt.trim()
      ? data.submittedAt.trim()
      : new Date().toISOString()
    const applicationStatus = typeof data.applicationStatus === 'string' && data.applicationStatus.trim()
      ? data.applicationStatus.trim()
      : 'unknown'
    const applicantEmail = typeof data.applicantEmail === 'string' ? data.applicantEmail.trim() : ''
    const applicantPhone = typeof data.applicantPhone === 'string' ? data.applicantPhone.trim() : ''

    const contactDetails = [
      applicantEmail ? `<li><strong>Email:</strong> ${escapeHtml(applicantEmail)}</li>` : '',
      applicantPhone ? `<li><strong>Phone:</strong> ${escapeHtml(applicantPhone)}</li>` : ''
    ].filter(Boolean).join('')

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>New Application Received</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; background: #f9fafb; padding: 24px; }
      .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; }
      h1 { color: #7c3aed; font-size: 24px; margin-bottom: 16px; }
      p { line-height: 1.6; margin-bottom: 16px; }
      .details { background: #f5f3ff; border-radius: 10px; padding: 16px; margin: 24px 0; }
      .details dt { font-weight: 600; }
      .details dd { margin: 0 0 12px 0; }
      .contacts { margin-top: 16px; padding: 16px; background: #eef2ff; border-radius: 8px; }
      .contacts ul { margin: 0; padding-left: 20px; }
      .footer { color: #6b7280; font-size: 14px; margin-top: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>New Application Received</h1>
      <p>A new application has been submitted in the admissions portal.</p>
      <div class="details">
        <dl>
          <dt>Application Number</dt>
          <dd>${escapeHtml(applicationNumber)}</dd>
          <dt>Applicant Name</dt>
          <dd>${escapeHtml(applicantName)}</dd>
          <dt>Program</dt>
          <dd>${escapeHtml(programName)}</dd>
          <dt>Status</dt>
          <dd>${escapeHtml(applicationStatus)}</dd>
          <dt>Submitted At</dt>
          <dd>${escapeHtml(submittedAt)}</dd>
        </dl>
      </div>
      ${contactDetails ? `<div class="contacts"><h2>Contact Details</h2><ul>${contactDetails}</ul></div>` : ''}
      <p>Please log into the admissions dashboard for full application details.</p>
      <p class="footer">This is an automated notification from the MIHAS admissions system.</p>
    </div>
  </body>
</html>`

    const contactsText = [
      applicantEmail ? `Email: ${applicantEmail}` : '',
      applicantPhone ? `Phone: ${applicantPhone}` : ''
    ].filter(Boolean).join('\n')

    const textLines = [
      'New Application Received',
      '',
      `Application Number: ${applicationNumber}`,
      `Applicant Name: ${applicantName}`,
      `Program: ${programName}`,
      `Status: ${applicationStatus}`,
      `Submitted At: ${submittedAt}`,
      contactsText,
      '',
      'Please log into the admissions dashboard for more information.'
    ].filter(Boolean)

    return {
      html,
      text: textLines.join('\n')
    }
  },
  'application-receipt': (data) => {
    const templateId = 'application-receipt'
    const applicationNumber = getStringField(data, 'applicationNumber', templateId)
    const trackingCode = getStringField(data, 'trackingCode', templateId)
    const programName = getStringField(data, 'programName', templateId)
    const submissionDate = getStringField(data, 'submissionDate', templateId)
    const paymentStatus = getStringField(data, 'paymentStatus', templateId)

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Application Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; background: #f9fafb; padding: 24px; }
      .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; }
      h1 { color: #0f766e; font-size: 24px; margin-bottom: 16px; }
      p { line-height: 1.6; margin-bottom: 16px; }
      .details { background: #ecfdf5; border-radius: 10px; padding: 16px; margin: 24px 0; }
      .details dt { font-weight: 600; }
      .details dd { margin: 0 0 12px 0; }
      .footer { color: #6b7280; font-size: 14px; margin-top: 32px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Application Received ✅</h1>
      <p>Dear Applicant,</p>
      <p>Thank you for submitting your application. We have received it successfully and our admissions team will review it shortly.</p>
      <div class="details">
        <dl>
          <dt>Application Number</dt>
          <dd>${escapeHtml(applicationNumber)}</dd>
          <dt>Tracking Code</dt>
          <dd>${escapeHtml(trackingCode)}</dd>
          <dt>Program</dt>
          <dd>${escapeHtml(programName)}</dd>
          <dt>Submission Date</dt>
          <dd>${escapeHtml(submissionDate)}</dd>
          <dt>Payment Status</dt>
          <dd>${escapeHtml(paymentStatus)}</dd>
        </dl>
      </div>
      <p>You can track the progress of your application at any time by signing into your MIHAS-KATC applicant portal.</p>
      <p>If you have any questions, please contact our admissions team.</p>
      <p class="footer">This message was sent automatically by the MIHAS-KATC admissions system.</p>
    </div>
  </body>
</html>`

    const text = `Application Received\n\nApplication Number: ${applicationNumber}\nTracking Code: ${trackingCode}\nProgram: ${programName}\nSubmission Date: ${submissionDate}\nPayment Status: ${paymentStatus}\n\nYou can track your application status in the MIHAS-KATC applicant portal.`

    return { html, text }
  },
  'application-slip': (data) => {
    const templateId = 'application-slip'
    const applicationNumber = getStringField(data, 'applicationNumber', templateId)
    const trackingCode = getStringField(data, 'trackingCode', templateId)
    const status = getStringField(data, 'status', templateId)
    const slipUrl = getStringField(data, 'slipUrl', templateId)

    const applicantName = typeof data.applicantName === 'string' && data.applicantName.trim()
      ? data.applicantName.trim()
      : 'Applicant'
    const programName = typeof data.programName === 'string' && data.programName.trim()
      ? data.programName.trim()
      : ''
    const paymentStatus = typeof data.paymentStatus === 'string' && data.paymentStatus.trim()
      ? data.paymentStatus.trim()
      : ''

    const formattedStatus = humanizeStatus(status)
    const formattedPayment = paymentStatus ? humanizeStatus(paymentStatus) : 'Pending Review'

    const programHtml = programName ? `<li><strong>Program:</strong> ${escapeHtml(programName)}</li>` : ''

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <title>Your MIHAS Application Slip</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; background: #f9fafb; padding: 24px; }
      .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; }
      h1 { color: #4c1d95; font-size: 24px; margin-bottom: 16px; }
      p { line-height: 1.6; margin-bottom: 16px; }
      .details { background: #f5f3ff; border-radius: 10px; padding: 16px; margin: 24px 0; }
      .details ul { margin: 0; padding-left: 20px; }
      .cta { text-align: center; margin: 32px 0; }
      .cta a { background: #4c1d95; color: #ffffff; padding: 14px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block; }
      .footer { color: #6b7280; font-size: 14px; margin-top: 32px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Your application slip is ready</h1>
      <p>Dear ${escapeHtml(applicantName)},</p>
      <p>We've generated your official MIHAS application slip. Keep this document for your records and present it during any admissions follow-up.</p>
      <div class="details">
        <ul>
          <li><strong>Application Number:</strong> ${escapeHtml(applicationNumber)}</li>
          <li><strong>Tracking Code:</strong> ${escapeHtml(trackingCode)}</li>
          <li><strong>Status:</strong> ${escapeHtml(formattedStatus)}</li>
          <li><strong>Payment Status:</strong> ${escapeHtml(formattedPayment)}</li>
          ${programHtml}
        </ul>
      </div>
      <div class="cta">
        <a href="${escapeHtml(slipUrl)}" target="_blank" rel="noopener noreferrer">Download Your Application Slip</a>
      </div>
      <p>You can also track your application progress any time by visiting the admissions portal and entering your tracking code.</p>
      <p class="footer">This is an automated notification from the MIHAS admissions system.</p>
    </div>
  </body>
</html>`

    const textLines = [
      `Hello ${applicantName},`,
      '',
      'Your MIHAS application slip is ready.',
      '',
      `Application Number: ${applicationNumber}`,
      `Tracking Code: ${trackingCode}`,
      `Status: ${formattedStatus}`,
      `Payment Status: ${formattedPayment}`,
      programName ? `Program: ${programName}` : '',
      '',
      `Download your slip: ${slipUrl}`,
      '',
      'You can track your application at any time using your tracking code.',
      '',
      'This is an automated notification from the MIHAS admissions system.'
    ].filter(Boolean)

    return {
      html,
      text: textLines.join('\n')
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await parseRequest(req)
    if ('error' in body) {
      return jsonResponse({ error: body.error }, 400)
    }

    const { recipients, subject, template, data } = body.value
    const templateResult = renderTemplate(template, data)
    if ('error' in templateResult) {
      return jsonResponse({ error: templateResult.error }, templateResult.status)
    }

    const sendResult = await sendEmail({
      to: recipients,
      subject,
      html: templateResult.html,
      text: templateResult.text,
    })

    return jsonResponse({ message: 'Email sent successfully', provider: sendResult.provider, id: sendResult.id ?? null })
  } catch (error) {
    console.error('send-email error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})

async function parseRequest(req: Request): Promise<{ value: ParsedEmailRequest } | { error: string }> {
  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return { error: 'Content-Type must be application/json' }
    }

    const body = (await req.json()) as Partial<EmailRequestBody>
    if (!body || typeof body !== 'object') {
      return { error: 'Invalid JSON body' }
    }

    const recipients = normalizeRecipients(body.to)
    if (!recipients.length) {
      return { error: 'Recipient email address is required' }
    }

    if (!recipients.every(isValidEmail)) {
      return { error: 'One or more recipient email addresses are invalid' }
    }

    if (!body.subject || typeof body.subject !== 'string' || !body.subject.trim()) {
      return { error: 'Email subject is required' }
    }

    if (!body.template || typeof body.template !== 'string' || !body.template.trim()) {
      return { error: 'Email template is required' }
    }

    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return { error: 'Template data must be an object' }
    }

    return {
      value: {
        recipients,
        subject: body.subject.trim(),
        template: body.template.trim(),
        data: body.data,
      },
    }
  } catch (error) {
    console.error('Failed to parse send-email request:', error)
    return { error: 'Invalid request body' }
  }
}

function renderTemplate(template: string, data: Record<string, unknown>): TemplateResult | { error: string; status: number } {
  const renderer = emailTemplates[template]
  if (!renderer) {
    return { error: `Unknown email template: ${template}`, status: 400 }
  }

  try {
    return renderer(data)
  } catch (error) {
    console.error('Template rendering error:', error)
    const message = error instanceof Error ? error.message : 'Failed to render email template'
    return { error: message, status: 400 }
  }
}

async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const provider = (Deno.env.get('EMAIL_PROVIDER') || '').toLowerCase()

  if (provider === 'smtp') {
    return await sendWithSmtp(payload)
  }

  if (provider === 'log') {
    console.log('Email payload (log provider):', {
      ...payload,
      html: '[omitted]',
    })
    return { provider: 'log' }
  }

  // Default to Resend if configured or explicitly selected
  if (provider === 'resend' || provider === '') {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (apiKey) {
      return await sendWithResend(payload, apiKey)
    }
  }

  throw new Error('Email provider not configured. Set EMAIL_PROVIDER or RESEND_API_KEY.')
}

async function sendWithResend(payload: EmailPayload, apiKey: string): Promise<SendResult> {
  const from = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('EMAIL_FROM')
  if (!from) {
    throw new Error('Resend sender address missing. Set RESEND_FROM_EMAIL or EMAIL_FROM.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = typeof result?.message === 'string' ? result.message : 'Failed to send email with Resend'
    throw new Error(message)
  }

  return { provider: 'resend', id: typeof result?.id === 'string' ? result.id : undefined }
}

async function sendWithSmtp(payload: EmailPayload): Promise<SendResult> {
  const { SmtpClient } = await import('https://deno.land/x/smtp/mod.ts')

  const host = Deno.env.get('SMTP_HOST')
  const port = Number(Deno.env.get('SMTP_PORT') || '587')
  const username = Deno.env.get('SMTP_USERNAME')
  const password = Deno.env.get('SMTP_PASSWORD')
  const from = Deno.env.get('SMTP_FROM_EMAIL') || Deno.env.get('EMAIL_FROM')
  const secure = (Deno.env.get('SMTP_SECURE') || 'true').toLowerCase() !== 'false'

  if (!host || !username || !password || !from) {
    throw new Error('SMTP configuration is incomplete. Check SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL or EMAIL_FROM.')
  }

  const client = new SmtpClient()

  if (secure) {
    await client.connectTLS({ hostname: host, port, username, password })
  } else {
    await client.connect({ hostname: host, port, username, password })
  }

  await client.send({
    from,
    to: payload.to,
    subject: payload.subject,
    content: payload.text || payload.html,
  })

  await client.close()

  return { provider: 'smtp' }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeRecipients(to: EmailRequestBody['to']): string[] {
  if (!to) return []
  if (Array.isArray(to)) {
    return to.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
  }
  if (typeof to === 'string' && to.trim()) {
    return [to.trim()]
  }
  return []
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getStringField(data: Record<string, unknown>, key: string, template: string): string {
  const value = data[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Field ${key} is required for template ${template}`)
  }
  return value.trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function humanizeStatus(value: string): string {
  if (!value) return ''

  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
