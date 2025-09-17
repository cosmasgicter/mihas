import { supabaseAnonClient } from './_lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseAnonClient) {
    return res.status(500).json({ error: 'Supabase anon key is not configured' })
  }

  const { action } = req.query
  
  if (!action || !['login', 'signin', 'register'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use: login, signin, or register' })
  }

  try {
    const { email, password, fullName } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    switch (action) {
      case 'login':
      case 'signin':
        const { data: loginData, error: loginError } = await supabaseAnonClient.auth.signInWithPassword({
          email,
          password
        })

        if (loginError) {
          return res.status(401).json({ error: loginError.message })
        }

        return res.status(200).json({
          user: loginData.user,
          session: loginData.session
        })

      case 'register':
        if (!fullName) {
          return res.status(400).json({ error: 'Full name is required for registration' })
        }

        const { data: registerData, error: registerError } = await supabaseAnonClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        })

        if (registerError) {
          return res.status(400).json({ error: registerError.message })
        }

        return res.status(201).json({
          user: registerData.user,
          session: registerData.session
        })

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}