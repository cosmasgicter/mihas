import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  switch (req.method) {
    case 'GET':
      return getApplications(req, res, user)
    case 'POST':
      return createApplication(req, res, user)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function getApplications(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function createApplication(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const applicationData = {
      ...req.body,
      user_id: user.id,
      status: 'draft'
    }

    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
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