import { mcpSupabase } from '../_lib/mcpClient.ts'
import { requireUser } from '../_lib/supabaseClient.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Require admin access for MCP queries
    await requireUser(req, { requireAdmin: true })

    const { sql, params } = req.body

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' })
    }

    const result = await mcpSupabase.query(sql, params)
    res.json({ data: result })
  } catch (error) {
    console.error('MCP query error:', error)
    res.status(500).json({ error: error.message })
  }
}