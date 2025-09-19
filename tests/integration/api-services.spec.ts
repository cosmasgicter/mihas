import { test, expect } from '@playwright/test'

test.describe('Microservices API Tests', () => {
  const API_BASE = 'http://localhost:3000'

  test('Auth service - login endpoint', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/auth?action=login`, {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword'
      }
    })
    
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('Applications service - unauthorized access', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/applications`)
    expect(response.status()).toBe(401)
  })

  test('Analytics service - metrics endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/analytics?action=metrics`)
    expect(response.status()).toBe(401)
  })

  test('Document service - upload without auth', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/documents/upload`, {
      data: { fileName: 'test.pdf' }
    })
    expect(response.status()).toBe(401)
  })
})