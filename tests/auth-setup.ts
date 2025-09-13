import { test as setup } from '@playwright/test'

setup('create test user', async ({ page }) => {
  await page.goto('/auth/signup')
  
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.fill('[name="confirmPassword"]', 'password123')
  await page.fill('[name="fullName"]', 'Test User')
  await page.fill('[name="phone"]', '+260971234567')
  
  await page.click('button[type="submit"]')
  await page.waitForURL('/student/dashboard')
})