import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { networkDiagnostics } from '@/lib/networkDiagnostics'

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
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'online' | 'offline' | 'slow'>('online')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInForm) => {
    console.log('Login attempt:', data.email)
    setLoading(true)
    setError('')
    setNetworkStatus('checking')

    try {
      // Quick network check
      const connectionTest = await networkDiagnostics.testConnection()
      setNetworkStatus(connectionTest.status)
      
      if (connectionTest.status === 'offline') {
        setError('Network connection unavailable. Please check your internet connection.')
        return
      }
      
      if (connectionTest.status === 'slow') {
        setError('Slow network detected. Login may take longer than usual...')
      }

      const result = await signIn(data.email, data.password)
      console.log('Sign in result:', result)
      
      if (result?.error) {
        throw new Error(result.error)
      }

      console.log('Login successful, navigating to dashboard')
      navigate('/dashboard')
    } catch (error: unknown) {
      console.error('Sign in error:', error)
      setError(error instanceof Error ? error.message : 'Failed to sign in. Please try again.')
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
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
                className="text-sm text-blue-600 hover:text-blue-700"
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