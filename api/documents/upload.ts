import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    const { fileName, fileData, documentType, applicationId } = req.body

    // Upload file to Supabase Storage
    const filePath = `${user.id}/${applicationId}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileData)

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message })
    }

    // Save document record
    const { data, error } = await supabase
      .from('application_documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        document_name: fileName,
        file_url: uploadData.path,
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