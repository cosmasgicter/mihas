import { describe, it, expect } from 'vitest'
import { routes } from '@/routes/config'

describe('Route Configuration', () => {
  it('should have correct route structure', () => {
    expect(routes).toBeDefined()
    expect(Array.isArray(routes)).toBe(true)
    expect(routes.length).toBeGreaterThan(0)
    
    routes.forEach(route => {
      expect(route).toHaveProperty('path')
      expect(route).toHaveProperty('element')
      expect(route).toHaveProperty('guard')
      expect(['public', 'auth', 'admin']).toContain(route.guard)
    })
  })

  it('should have lazy-loaded components for most routes', () => {
    const lazyRoutes = routes.filter(route => route.lazy === true)
    expect(lazyRoutes.length).toBeGreaterThan(10)
  })

  it('should include essential routes', () => {
    const paths = routes.map(route => route.path)
    
    expect(paths).toContain('/')
    expect(paths).toContain('/auth/signin')
    expect(paths).toContain('/student/dashboard')
    expect(paths).toContain('/admin')
    expect(paths).toContain('/404')
    expect(paths).toContain('*')
  })

  it('should have correct guard distribution', () => {
    const publicRoutes = routes.filter(r => r.guard === 'public')
    const authRoutes = routes.filter(r => r.guard === 'auth')
    const adminRoutes = routes.filter(r => r.guard === 'admin')
    
    expect(publicRoutes.length).toBeGreaterThan(0)
    expect(authRoutes.length).toBeGreaterThan(0)
    expect(adminRoutes.length).toBeGreaterThan(0)
  })
})