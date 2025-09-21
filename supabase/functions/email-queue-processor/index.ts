import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await supabaseClient
      .from('email_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    const results = { processed: 0, sent: 0, failed: 0, errors: [] }

    for (const email of pendingEmails) {
      try {
        // Call send-email function
        const { error } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: email.recipient_email,
            subject: email.subject,
            html: email.body
          }
        })

        if (error) throw error

        // Mark as sent
        await supabaseClient
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
        await supabaseClient
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

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Queue processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})