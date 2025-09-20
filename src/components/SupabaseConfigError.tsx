import React from 'react'
import { SUPABASE_CONFIG_ERROR_MESSAGE } from '@/lib/supabase'

export function SupabaseConfigError() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 p-6"
      data-testid="supabase-config-error"
    >
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Configuration required</h1>
        <p className="text-gray-700">{SUPABASE_CONFIG_ERROR_MESSAGE}</p>
        <p className="text-sm text-gray-500">
          Update the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> environment variables to{' '}
          enable Supabase-backed authentication and analytics features.
        </p>
      </div>
    </div>
  )
}
