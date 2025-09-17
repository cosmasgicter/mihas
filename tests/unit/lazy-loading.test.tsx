import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { routes } from '@/routes/config'

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: () => false
  })
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null })
    }
  }
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Lazy Loading Routes', () => {
  it('should have correct route configuration structure', () => {
    expect(routes).toBeDefined()
    expect(Array.isArray(routes)).toBe(true)
    expect(routes.length).toBeGreaterThan(0)
    
    // Check that routes have required properties
    routes.forEach(route => {
      expect(route).toHaveProperty('path')
      expect(route).toHaveProperty('element')
      expect(route).toHaveProperty('guard')
    })
  })

  it('should have lazy-loaded components for most routes', () => {
    const lazyRoutes = routes.filter(route => route.lazy === true)
    expect(lazyRoutes.length).toBeGreaterThan(10) // Most routes should be lazy
  })

  it('should have correct guard types', () => {
    const validGuards = ['public', 'auth', 'admin']
    routes.forEach(route => {
      expect(validGuards).toContain(route.guard)
    })
  })

  it('should include all essential routes', () => {
    const paths = routes.map(route => route.path)
    
    // Check for essential routes
    expect(paths).toContain('/')
    expect(paths).toContain('/auth/signin')
    expect(paths).toContain('/student/dashboard')
    expect(paths).toContain('/admin')
    expect(paths).toContain('/404')
    expect(paths).toContain('*')
  })
})