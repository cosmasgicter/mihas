import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Please select a gender' }),
  nationality: z.string().min(2, 'Nationality is required'),
  address: z.string().min(10, 'Please enter your full address'),
  city: z.string().min(2, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  emergency_contact_name: z.string().min(2, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().min(10, 'Emergency contact phone is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpForm) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Proceed with sign up
      const { confirmPassword, ...userData } = data
      await signUp(data.email, data.password, userData)
      
      setSuccess('Account created successfully! Please check your email to verify your account before signing in.')
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-secondary mb-2">Account Created Successfully!</h3>
              <p className="text-sm text-secondary mb-6">{success}</p>
              <div className="space-y-3">
                <Link to="/auth/signin">
                  <Button className="w-full">
                    Go to Sign In
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link to="/" className="flex items-center justify-center text-primary hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="flex items-center justify-center mb-6">
          <GraduationCap className="h-12 w-12 text-primary" />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-secondary">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-secondary">
          Already have an account?{' '}
          <Link
            to="/auth/signin"
            className="font-medium text-primary hover:text-primary"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                {...register('full_name')}
                type="text"
                label="Full Name"
                error={errors.full_name?.message}
                required
              />
              
              <Input
                {...register('email')}
                type="email"
                label="Email Address"
                error={errors.email?.message}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                {...register('password')}
                type="password"
                label="Password"
                error={errors.password?.message}
                helperText="Must contain at least 8 characters with uppercase, lowercase, and number"
                required
              />
              
              <Input
                {...register('confirmPassword')}
                type="password"
                label="Confirm Password"
                error={errors.confirmPassword?.message}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                {...register('phone')}
                type="tel"
                label="Phone Number"
                error={errors.phone?.message}
                placeholder="+260-123-456-789"
                required
              />
              
              <Input
                {...register('date_of_birth')}
                type="date"
                label="Date of Birth"
                error={errors.date_of_birth?.message}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('gender')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                )}
              </div>
              
              <Input
                {...register('nationality')}
                type="text"
                label="Nationality"
                error={errors.nationality?.message}
                placeholder="Zambian"
                required
              />
              
              <Input
                {...register('country')}
                type="text"
                label="Country"
                error={errors.country?.message}
                placeholder="Zambia"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextArea
                {...register('address')}
                label="Full Address"
                error={errors.address?.message}
                placeholder="House number, street, area"
                rows={3}
                required
              />
              
              <Input
                {...register('city')}
                type="text"
                label="City"
                error={errors.city?.message}
                placeholder="Kitwe"
                required
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-secondary mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('emergency_contact_name')}
                  type="text"
                  label="Emergency Contact Name"
                  error={errors.emergency_contact_name?.message}
                  required
                />
                
                <Input
                  {...register('emergency_contact_phone')}
                  type="tel"
                  label="Emergency Contact Phone"
                  error={errors.emergency_contact_phone?.message}
                  required
                />
              </div>
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
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}