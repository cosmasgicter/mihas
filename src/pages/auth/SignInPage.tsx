import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GraduationCap, ArrowLeft, User, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type SignInForm = z.infer<typeof signInSchema>

export default function SignInPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnstileVerified, setTurnstileVerified] = useState(false)
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  // Test credentials
  const testCredentials = {
    student: {
      email: 'ycwlaodj@minimax.com',
      password: '3BGzARJBlC'
    },
    admin: {
      email: 'cbldpgkd@minimax.com',
      password: 'FDUHr6kote'
    }
  }

  const fillTestCredentials = (type: 'student' | 'admin') => {
    const credentials = testCredentials[type]
    setValue('email', credentials.email)
    setValue('password', credentials.password)
  }

  const onSubmit = async (data: SignInForm) => {
    // Skip Turnstile verification for now - can be enabled later with proper site key
    setLoading(true)
    setError('')

    try {
      // Proceed with sign in
      const { error: signInError } = await signIn(data.email, data.password)
      
      if (signInError) {
        throw signInError
      }

      navigate('/dashboard')
    } catch (error: any) {
      console.error('Sign in error:', error)
      setError(error.message || 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center justify-center mb-6">
          <GraduationCap className="h-12 w-12 text-blue-600" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link
            to="/auth/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Test Credentials Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">🧪 Test Credentials for Quick Access</h3>
            <p className="text-sm text-blue-700">Use these accounts for testing purposes</p>
          </div>
          
          <div className="space-y-3">
            {/* Student Account */}
            <div className="bg-white rounded-md p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Student Account</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestCredentials('student')}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Auto-fill
                </Button>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Email:</strong> {testCredentials.student.email}</p>
                <p><strong>Password:</strong> {testCredentials.student.password}</p>
              </div>
            </div>
            
            {/* Admin Account */}
            <div className="bg-white rounded-md p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">Admin Account</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillTestCredentials('admin')}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Auto-fill
                </Button>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Email:</strong> {testCredentials.admin.email}</p>
                <p><strong>Password:</strong> {testCredentials.admin.password}</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-blue-600 mt-3 text-center">
            Note: These are test accounts for demonstration purposes.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              error={errors.email?.message}
              required
            />

            <Input
              {...register('password')}
              type="password"
              label="Password"
              error={errors.password?.message}
              required
            />

            {/* Turnstile placeholder - to be enabled with proper site key */}
            <div className="text-center text-sm text-gray-500">
              Security verification temporarily disabled for development
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}