'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { GraduationCap, ArrowLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type Program = 'Nursing' | 'Clinical Medicine' | 'Environmental Health'

export default function NewApplicationPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const createApplication = async (program: Program) => {
    if (!user) return
    
    setCreating(true)
    
    try {
      const institution = program === 'Nursing' ? 'MIHAS' : 'KATC'
      
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          institution,
          program,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Application created successfully!')
      router.push(`/apply/${data.id}`)
    } catch (error: any) {
      console.error('Error creating application:', error)
      toast.error('Failed to create application')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">New Application</h1>
                <p className="text-sm text-gray-600">Choose your program</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Select Your Diploma Program
          </h2>
          <p className="text-gray-600">
            Choose the program you wish to apply for. Each program has specific requirements and payment details.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Nursing - MIHAS */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-blue-600 mb-2">
                    Nursing
                  </CardTitle>
                  <Badge variant="secondary" className="mb-3">
                    MIHAS Institution
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Comprehensive nursing program preparing you for a rewarding career in healthcare.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">3 Years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Institution:</span>
                    <span className="font-medium">MIHAS</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium">MTN 0961515151</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => createApplication('Nursing')}
                    disabled={creating}
                  >
                    {creating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Apply for Nursing</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Medicine - KATC */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-green-600 mb-2">
                    Clinical Medicine
                  </CardTitle>
                  <Badge variant="secondary" className="mb-3">
                    KATC Institution
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Advanced clinical medicine program for future healthcare professionals.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">3 Years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Institution:</span>
                    <span className="font-medium">KATC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium">MTN 0966992299</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => createApplication('Clinical Medicine')}
                    disabled={creating}
                  >
                    {creating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Apply for Clinical Medicine</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environmental Health - KATC */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-purple-600 mb-2">
                    Environmental Health
                  </CardTitle>
                  <Badge variant="secondary" className="mb-3">
                    KATC Institution
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Specialized program focusing on public health and environmental safety.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">3 Years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Institution:</span>
                    <span className="font-medium">KATC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <span className="font-medium">MTN 0966992299</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => createApplication('Environmental Health')}
                    disabled={creating}
                  >
                    {creating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Apply for Environmental Health</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Requirements */}
        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Application Requirements
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Required Documents</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• National Registration Card (front and back)</li>
                <li>• Passport-size photograph</li>
                <li>• ECZ Grade 12 results/certificate</li>
                <li>• Additional program-specific documents</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Academic Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ECZ Grade 12 certificate</li>
                <li>• Minimum grade requirements vary by program</li>
                <li>• Subject-specific requirements apply</li>
                <li>• Eligibility will be verified automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}