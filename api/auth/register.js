const { createAuthHandler } = require('../_lib/createAuthHandler')
const { logAuditEvent } = require('../_lib/auditLogger')

module.exports = createAuthHandler(async (req, res, { supabaseClient }) => {
  const { email, password, fullName } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required for registration' })
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) {
    await logAuditEvent({
      req,
      action: 'auth.register.failure',
      actorEmail: email,
      metadata: { reason: error.message }
    })
    return res.status(400).json({ error: error.message })
  }

  await logAuditEvent({
    req,
    action: 'auth.register.success',
    actorId: data.user?.id || null,
    actorEmail: email,
    metadata: { hasSession: Boolean(data.session) }
  })

  return res.status(201).json({
    user: data.user,
    session: data.session
  })
})
