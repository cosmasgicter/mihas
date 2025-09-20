const { supabaseAdminClient } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { event, data } = req.body || {}
    
    if (!event) {
      return res.status(400).json({ error: 'Event type is required' })
    }

    // Store telemetry data (gracefully handle missing table)
    try {
      const { error } = await supabaseAdminClient
        .from('analytics_events')
        .insert({
          event_type: event,
          event_data: data || {},
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Telemetry storage error:', error)
        // Don't fail the request for telemetry errors
      }
    } catch (storageError) {
      console.error('Telemetry storage failed:', storageError)
      // Continue without failing
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Telemetry handler error:', error)
    return res.status(200).json({ success: true }) // Always return success for telemetry
  }
}