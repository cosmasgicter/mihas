'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, FileText, Award, Star, ArrowRight, CheckCircle, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleNavigation = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white opacity-75"></div>
          <div className="absolute top-0 left-0 animate-ping rounded-full h-12 w-12 border border-white opacity-25"></div>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-violet-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/95 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <div className="relative flex items-center space-x-3 bg-white px-4 py-2 rounded-lg">
                  <Image 
                    src="/katc-logo.jpg" 
                    alt="KATC Logo" 
                    width={40} 
                    height={40} 
                    className="rounded-lg object-contain"
                  />
                  <GraduationCap className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">MIHAS & KATC</h1>
                    <p className="text-sm text-gray-600 font-medium">Application System</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => handleNavigation('/auth/login')}
                className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300 font-semibold px-6"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => handleNavigation('/auth/register')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          {/* Hero badge */}
          <div className="inline-flex items-center px-6 py-2 mb-8 text-sm font-medium bg-white/20 backdrop-blur-lg border border-white/30 rounded-full text-white shadow-lg">
            <Star className="w-4 h-4 mr-2 text-yellow-300" />
            <span>Premium Healthcare Education Programs</span>
            <Zap className="w-4 h-4 ml-2 text-yellow-300" />
          </div>
          
          {/* Main heading with gradient text */}
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-200 mb-6 leading-tight">
            Shape Your
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              Healthcare Career
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            Join the next generation of healthcare professionals with our comprehensive diploma programs in 
            <span className="text-cyan-300 font-semibold">Nursing</span>, 
            <span className="text-purple-300 font-semibold">Clinical Medicine</span>, and 
            <span className="text-pink-300 font-semibold">Environmental Health</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              size="lg" 
              onClick={() => handleNavigation('/auth/register')}
              className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 hover:from-cyan-600 hover:via-blue-700 hover:to-indigo-800 text-white font-bold px-12 py-4 text-lg shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 rounded-xl"
            >
              <Zap className="mr-3 h-5 w-5" />
              Start Your Journey
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => handleNavigation('/auth/login')}
              className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-lg font-semibold px-12 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              Continue Application
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
          
          {/* Stats section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="text-3xl font-bold text-cyan-300 mb-2">3 Years</div>
              <div className="text-blue-100 font-medium">Comprehensive Training</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="text-3xl font-bold text-purple-300 mb-2">3 Programs</div>
              <div className="text-blue-100 font-medium">Specialized Tracks</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="text-3xl font-bold text-pink-300 mb-2">100%</div>
              <div className="text-blue-100 font-medium">Digital Process</div>
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border-0 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-2xl border border-cyan-100">
                    <Users className="h-8 w-8 text-cyan-600" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">Nursing Program</CardTitle>
                  <CardDescription className="text-cyan-600 font-semibold">MIHAS Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-gray-700 mb-6 leading-relaxed">
                Comprehensive nursing program preparing you for a rewarding career in healthcare with hands-on clinical experience.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm text-gray-600 font-medium">3 Years Duration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm text-gray-600 font-medium">Clinical Practice Included</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm text-gray-600 font-medium">MTN Money: 0961515151</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                <div className="text-sm font-semibold text-cyan-700 mb-2">Program Highlights</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Patient Care Excellence</li>
                  <li>• Medical Equipment Training</li>
                  <li>• Professional Ethics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border-0 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">Clinical Medicine</CardTitle>
                  <CardDescription className="text-purple-600 font-semibold">KATC Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-gray-700 mb-6 leading-relaxed">
                Advanced clinical medicine program for future healthcare professionals with comprehensive medical training.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600 font-medium">3 Years Duration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600 font-medium">Advanced Medical Training</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-600 font-medium">MTN Money: 0966992299</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <div className="text-sm font-semibold text-purple-700 mb-2">Program Highlights</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Diagnostic Skills</li>
                  <li>• Emergency Medicine</li>
                  <li>• Research Methods</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl border-0 shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-500 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-2xl border border-pink-100">
                    <Award className="h-8 w-8 text-pink-600" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-pink-700 to-rose-700 bg-clip-text text-transparent">Environmental Health</CardTitle>
                  <CardDescription className="text-pink-600 font-semibold">KATC Institution</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-gray-700 mb-6 leading-relaxed">
                Specialized program focusing on public health and environmental safety with real-world applications.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-pink-500" />
                  <span className="text-sm text-gray-600 font-medium">3 Years Duration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-pink-500" />
                  <span className="text-sm text-gray-600 font-medium">Field Work Experience</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-pink-500" />
                  <span className="text-sm text-gray-600 font-medium">MTN Money: 0966992299</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100">
                <div className="text-sm font-semibold text-pink-700 mb-2">Program Highlights</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Environmental Assessment</li>
                  <li>• Public Health Policy</li>
                  <li>• Safety Management</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Process */}
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-3xl blur-3xl"></div>
          
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                Simple Application Process
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our streamlined 5-step process makes applying for your healthcare diploma program quick and easy
              </p>
            </div>
            
            <div className="grid md:grid-cols-5 gap-8">
              {[
                { 
                  step: 1, 
                  title: 'Register', 
                  desc: 'Create your secure account', 
                  icon: '👤',
                  color: 'from-cyan-500 to-blue-600',
                  bgColor: 'from-cyan-50 to-blue-50',
                  textColor: 'text-cyan-700'
                },
                { 
                  step: 2, 
                  title: 'Choose Program', 
                  desc: 'Select your desired program', 
                  icon: '🎓',
                  color: 'from-purple-500 to-indigo-600',
                  bgColor: 'from-purple-50 to-indigo-50',
                  textColor: 'text-purple-700'
                },
                { 
                  step: 3, 
                  title: 'Complete KYC', 
                  desc: 'Provide personal details', 
                  icon: '📝',
                  color: 'from-pink-500 to-rose-600',
                  bgColor: 'from-pink-50 to-rose-50',
                  textColor: 'text-pink-700'
                },
                { 
                  step: 4, 
                  title: 'Upload Documents', 
                  desc: 'Submit required documents', 
                  icon: '📄',
                  color: 'from-emerald-500 to-green-600',
                  bgColor: 'from-emerald-50 to-green-50',
                  textColor: 'text-emerald-700'
                },
                { 
                  step: 5, 
                  title: 'Payment', 
                  desc: 'Complete payment and submit', 
                  icon: '💳',
                  color: 'from-orange-500 to-red-600',
                  bgColor: 'from-orange-50 to-red-50',
                  textColor: 'text-orange-700'
                },
              ].map((item, index) => (
                <div key={index} className="relative group">
                  {/* Connection line */}
                  {index < 4 && (
                    <div className="hidden md:block absolute top-6 left-full w-8 h-0.5 bg-gradient-to-r from-gray-200 to-gray-300 z-0"></div>
                  )}
                  
                  <div className="text-center relative z-10">
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
                      <div className={`relative bg-gradient-to-r ${item.color} text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto text-xl font-bold shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
                        {item.step}
                      </div>
                    </div>
                    
                    <div className={`bg-gradient-to-r ${item.bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 min-h-[140px] flex flex-col justify-center`}>
                      <div className="text-2xl mb-3">{item.icon}</div>
                      <h3 className={`font-bold ${item.textColor} mb-2 text-lg`}>{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Button 
                size="lg"
                onClick={() => handleNavigation('/auth/register')}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-12 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-xl"
              >
                <Zap className="mr-3 h-5 w-5" />
                Begin Application Process
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-300 py-16 mt-20 overflow-hidden">
        {/* Footer background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl blur opacity-60"></div>
                  <div className="relative flex items-center space-x-3 bg-gray-900 px-4 py-3 rounded-lg border border-gray-700">
                    <Image 
                      src="/katc-logo.jpg" 
                      alt="KATC Logo" 
                      width={32} 
                      height={32} 
                      className="rounded-lg object-contain"
                    />
                    <GraduationCap className="h-6 w-6 text-cyan-400" />
                    <span className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                      MIHAS & KATC Application System
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-400 mb-6 text-lg leading-relaxed max-w-2xl">
                Streamlined application process for healthcare diploma programs in Zambia. 
                Join thousands of students who have successfully started their healthcare careers through our platform.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'Secure Platform', icon: '🔒' },
                  { label: '24/7 Support', icon: '🕒' },
                  { label: 'Quick Process', icon: '⚡' },
                  { label: 'Trusted by Students', icon: '⭐' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-sm text-gray-300 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="text-2xl mr-3">💬</span>
                Contact Information
              </h4>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-cyan-500/20 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h5 className="text-cyan-300 font-semibold">MIHAS Nursing</h5>
                    </div>
                  </div>
                  <p className="text-white font-mono bg-black/20 px-3 py-2 rounded-lg border border-cyan-500/30">
                    MTN Money: 0961515151
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <Award className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h5 className="text-purple-300 font-semibold">KATC Programs</h5>
                    </div>
                  </div>
                  <p className="text-white font-mono bg-black/20 px-3 py-2 rounded-lg border border-purple-500/30">
                    MTN Money: 0966992299
                  </p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-xl">
                <p className="text-sm text-yellow-200 leading-relaxed">
                  <span className="text-yellow-300 font-semibold">📞 Need Help?</span><br/>
                  For technical support or application assistance, please contact your institution directly.
                </p>
              </div>
            </div>
          </div>
          
          {/* Bottom section */}
          <div className="border-t border-gray-700/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-6">
                <p className="text-gray-400">
                  &copy; 2025 MIHAS & KATC Application System. All rights reserved.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="text-green-400">●</span>
                  <span>System Online</span>
                </div>
                <div className="w-px h-4 bg-gray-600"></div>
                <div className="text-sm text-gray-400">
                  Made with <span className="text-red-400">❤️</span> for Healthcare Education
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}