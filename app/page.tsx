'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, FileText, Award } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">MIHAS & KATC</h1>
                <p className="text-sm text-gray-600">Application System</p>
              </div>
            </div>
            <div className="space-x-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button 
                onClick={() => router.push('/auth/register')}
              >
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Apply for Diploma Programs
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Start your healthcare career with MIHAS Nursing program or KATC Clinical Medicine and Environmental Health programs. 
            Our comprehensive application system makes it easy to apply and track your progress.
          </p>
          <div className="space-x-4">
            <Button 
              size="lg" 
              onClick={() => router.push('/auth/register')}
              className="px-8 py-3"
            >
              Start Application
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push('/auth/login')}
              className="px-8 py-3"
            >
              Continue Application
            </Button>
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nursing</CardTitle>
                  <CardDescription>MIHAS Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Comprehensive nursing program preparing you for a rewarding career in healthcare.
              </p>
              <div className="text-sm text-gray-500">
                <p><strong>Duration:</strong> 3 Years</p>
                <p><strong>Payment:</strong> MTN Money 0961515151</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Clinical Medicine</CardTitle>
                  <CardDescription>KATC Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Advanced clinical medicine program for future healthcare professionals.
              </p>
              <div className="text-sm text-gray-500">
                <p><strong>Duration:</strong> 3 Years</p>
                <p><strong>Payment:</strong> MTN Money 0966992299</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Environmental Health</CardTitle>
                  <CardDescription>KATC Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Specialized program focusing on public health and environmental safety.
              </p>
              <div className="text-sm text-gray-500">
                <p><strong>Duration:</strong> 3 Years</p>
                <p><strong>Payment:</strong> MTN Money 0966992299</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Process */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Simple Application Process
          </h2>
          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: 1, title: 'Register', desc: 'Create your account' },
              { step: 2, title: 'Choose Program', desc: 'Select your desired program' },
              { step: 3, title: 'Complete KYC', desc: 'Provide personal details' },
              { step: 4, title: 'Upload Documents', desc: 'Submit required documents' },
              { step: 5, title: 'Payment', desc: 'Complete payment and submit' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-lg font-semibold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-white">MIHAS & KATC Application System</span>
              </div>
              <p className="text-gray-400 mb-4">
                Streamlined application process for healthcare diploma programs in Zambia.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Contact Information</h4>
              <div className="space-y-2">
                <p><strong>MIHAS:</strong> MTN Money 0961515151</p>
                <p><strong>KATC:</strong> MTN Money 0966992299</p>
                <p className="text-sm text-gray-400 mt-4">
                  For technical support or application assistance, please contact your institution directly.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MIHAS & KATC Application System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}