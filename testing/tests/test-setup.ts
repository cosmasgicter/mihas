import { test as base } from '@playwright/test'

// Extend basic test by providing test users
export const test = base.extend<{
  testUser: { email: string; password: string; role: string }
  adminUser: { email: string; password: string; role: string }
}>({
  testUser: async (_, use) => {
    const password = process.env.TEST_USER_PASSWORD
    if (!password) throw new Error('TEST_USER_PASSWORD environment variable is required')
    
    await use({
      email: 'student@test.com',
      password,
      role: 'student'
    })
  },
  
  adminUser: async (_, use) => {
    const password = process.env.TEST_ADMIN_PASSWORD
    if (!password) throw new Error('TEST_ADMIN_PASSWORD environment variable is required')
    
    await use({
      email: 'admin@test.com',
      password,
      role: 'admin'
    })
  }
})

export { expect } from '@playwright/test'