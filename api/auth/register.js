const { supabaseAdminClient } = require('../_lib/supabaseClient')
const { logAuditEvent } = require('../_lib/auditLogger')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { email, password, fullName } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required for registration' })
  }

  try {
    const { data, error } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName
      },
      email_confirm: true
    })

    if (error) {
      console.error('Supabase signup error:', error)
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
  } catch (err) {
    console.error('Registration error:', err)
    return res.status(500).json({ error: `Registration failed: ${err.message}` })
  }
}
