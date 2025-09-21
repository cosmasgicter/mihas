import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: emails } = await supabase
    .from('email_notifications')
    .select('*')
    .eq('status', 'pending')
    .limit(10)

  let sent = 0, failed = 0

  for (const email of emails || []) {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: email.recipient_email, subject: email.subject, html: email.body }
      })

      if (error) throw error

      await supabase
        .from('email_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', email.id)
      
      sent++
    } catch (error) {
      await supabase
        .from('email_notifications')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          retry_count: (email.retry_count || 0) + 1
        })
        .eq('id', email.id)
      
      failed++
    }
  }

  return new Response(JSON.stringify({ sent, failed }))
})