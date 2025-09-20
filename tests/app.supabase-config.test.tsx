import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('App Supabase configuration handling', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders a helpful configuration message when Supabase env vars are missing', async () => {
    const { default: App } = await import('@/App')

    render(<App />)

    expect(screen.getByTestId('supabase-config-error')).toBeTruthy()
    expect(screen.getByText(/Supabase client is not configured/i)).toBeTruthy()
  })
})
