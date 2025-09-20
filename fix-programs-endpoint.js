const fs = require('fs')

const fixedContent = `const { supabaseAdminClient, getUserFromRequest } = require('../../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    const authContext = await getUserFromRequest(req, { requireAdmin: true })
    if (authContext.error) {
      return res.status(401).json({ error: authContext.error })
    }
  }

  switch (req.method) {
    case 'GET':
      const { data, error } = await supabaseAdminClient
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        return res.status(400).json({ error: error.message })
      }
      return res.status(200).json({ programs: data || [] })

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}`

fs.writeFileSync('/home/cosmas/Documents/Visual Code/mihas/api/catalog/programs/index.js', fixedContent)
console.log('Fixed programs endpoint')