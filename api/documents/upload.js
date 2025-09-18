const { supabaseAdminClient, getUserFromRequest } = require('../_lib/supabaseClient')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await getUserFromRequest(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  try {
    const { fileName, fileData, documentType, applicationId } = req.body || {}

    if (!fileName || !fileData || !documentType || !applicationId) {
      return res.status(400).json({ error: 'Missing required document fields' })
    }

    const { data: application, error: applicationError } = await supabaseAdminClient
      .from('applications_new')
      .select('id, user_id')
      .eq('id', applicationId)
      .maybeSingle()

    if (applicationError) {
      return res.status(400).json({ error: applicationError.message })
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found' })
    }

    if (!authContext.isAdmin && application.user_id !== authContext.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const filePath = `${application.user_id}/${applicationId}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabaseAdminClient.storage
      .from('documents')
      .upload(filePath, fileData)

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message })
    }

    const { data, error } = await supabaseAdminClient
      .from('application_documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        document_name: fileName,
        file_url: uploadData.path,
        system_generated: false,
        verification_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(201).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}