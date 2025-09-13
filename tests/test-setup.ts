import { test as base } from '@playwright/test'

// Extend basic test by providing test users
export const test = base.extend<{
  testUser: { email: string; password: string; role: string }
  adminUser: { email: string; password: string; role: string }
}>({
  testUser: async ({}, use) => {
    await use({
      email: 'student@test.com',
      password: 'password123',
      role: 'student'
    })
  },
  
  adminUser: async ({}, use) => {
    await use({
      email: 'admin@test.com', 
      password: 'password123',
      role: 'admin'
    })
  }
})

export { expect } from '@playwright/test'