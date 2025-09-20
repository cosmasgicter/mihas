import React from 'react'

export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
        <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
        </nav>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="h-16 w-full max-w-4xl mx-auto mb-4 bg-white/20 rounded-md animate-pulse" />
          <div className="h-8 w-full max-w-3xl mx-auto mb-8 bg-white/20 rounded-md animate-pulse" />
          <div className="flex gap-4 justify-center">
            <div className="h-12 w-48 bg-white/20 rounded-md animate-pulse" />
            <div className="h-12 w-32 bg-white/20 rounded-md animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[0,1,2,3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-12 w-20 mx-auto mb-2 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="h-12 w-3/4 mx-auto mb-6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-6 w-full max-w-3xl mx-auto bg-gray-200 rounded-md animate-pulse" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[0,1,2].map((i) => (
              <div key={i} className="p-6 text-center">
                <div className="h-20 w-20 mx-auto mb-6 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-6 w-3/4 mx-auto mb-4 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-full mb-2 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-5/6 mx-auto bg-gray-200 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}