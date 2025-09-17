import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'

export function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}