import { mcpSupabase } from '../_lib/mcpClient.ts'
import { requireUser } from '../_lib/supabaseClient.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Require admin access for schema queries
    await requireUser(req, { requireAdmin: true })

    const { table } = req.query

    if (table) {
      const result = await mcpSupabase.getTableInfo(table)
      res.json({ data: result })
    } else {
      const result = await mcpSupabase.getSchema()
      res.json({ data: result })
    }
  } catch (error) {
    console.error('MCP schema error:', error)
    res.status(500).json({ error: error.message })
  }
}