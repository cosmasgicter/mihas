import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Loader2 } from 'lucide-react'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    handleAuthCallback()
  }, [])
  
  const handleAuthCallback = async () => {
    try {
      // Get the hash fragment from the URL
      const hashFragment = window.location.hash
      
      if (hashFragment && hashFragment.length > 0) {
        // Exchange the auth code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(hashFragment)
        
        if (error) {
          console.error('Error exchanging code for session:', error)
          setError(error.message)
          setTimeout(() => {
            navigate('/login?error=' + encodeURIComponent(error.message))
          }, 3000)
          return
        }
        
        if (data.session) {
          // Successfully signed in, redirect to dashboard
          navigate('/dashboard')
          return
        }
      }
      
      // If we get here, something went wrong
      setError('No authentication session found')
      setTimeout(() => {
        navigate('/login?error=No session found')
      }, 3000)
      
    } catch (error: any) {
      console.error('Auth callback error:', error)
      setError(error.message || 'Authentication failed')
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <span className="text-white font-bold text-2xl">M</span>
        </div>
        
        {loading ? (
          <div>
            <Loader2 className="mx-auto w-8 h-8 animate-spin text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Account</h1>
            <p className="text-gray-600">Please wait while we confirm your email verification...</p>
          </div>
        ) : error ? (
          <div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Account Verified</h1>
            <p className="text-gray-600 mb-4">Welcome to the MIHAS Application Management System! Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback