import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    }

    for (const email of pendingEmails) {
      try {
        // Call send-email function
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            to: email.recipient_email,
            subject: email.subject,
            html: email.body
          }
        })

        if (error) throw error

        // Mark as sent
        await supabase
          .from('email_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', email.id)

        results.sent++
      } catch (error) {
        // Mark as failed
        await supabase
          .from('email_notifications')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: (email.retry_count || 0) + 1
          })
          .eq('id', email.id)

        results.failed++
        results.errors.push({ id: email.id, error: error.message })
      }

      results.processed++
    }

    console.log('Email queue processed:', results)
    
    res.status(200).json({
      success: true,
      ...results
    })

  } catch (error) {
    console.error('Queue processing error:', error)
    res.status(500).json({ error: error.message })
  }
}