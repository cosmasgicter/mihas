import React, { lazy, Suspense } from 'react'
import { LandingPageSkeleton } from '@/components/ui/LandingPageSkeleton'

// Lazy load the full landing page
const LandingPageFull = lazy(() => import('./LandingPage'))

export default function LandingPageOptimized() {
  return (
    <Suspense fallback={<LandingPageSkeleton />}>
      <LandingPageFull />
    </Suspense>
  )
}