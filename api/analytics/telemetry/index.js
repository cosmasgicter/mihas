module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // For local development, just return success
    return res.json({ success: true, message: 'Telemetry received (local dev)' })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}