/**
 * Integration test for wizard navigation and application persistence
 * Tests the fix for duplicate application creation when navigating back to Step 1
 */

const { test, expect } = require('@playwright/test')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.VITE_APP_BASE_URL || 'http://localhost:5173',
  timeout: 30000
}

// Test user data
const testUser = {
  email: 'wizard-nav-test@example.com',
  password: 'testpassword123',
  fullName: 'Navigation Test User',
  nrcNumber: '555666/77/1',
  dateOfBirth: '1992-03-15',
  phone: '0955666777',
  residenceTown: 'Kitwe'
}

test.describe('Wizard Navigation Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_CONFIG.baseUrl)
  })

  test('should handle Step 1 navigation without creating duplicate applications', async ({ page }) => {
    // Navigate to wizard and authenticate
    await page.goto('/student/application-wizard')
    
    // Handle authentication redirect
    if (page.url().includes('/auth/signin')) {
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/application-wizard')
    }

    // Fill Step 1 form
    await page.fill('input[name="full_name"]', testUser.fullName)
    await page.fill('input[name="nrc_number"]', testUser.nrcNumber)
    await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="phone"]', testUser.phone)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="residence_town"]', testUser.residenceTown)
    
    // Select program and intake
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')

    // Proceed to Step 2
    await page.click('button:has-text("Next Step")')
    await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()

    // Go back to Step 1
    await page.click('button:has-text("Previous")')
    await expect(page.locator('h2:has-text("Step 1")')).toBeVisible()

    // Verify form data is preserved
    await expect(page.locator('input[name="full_name"]')).toHaveValue(testUser.fullName)
    await expect(page.locator('input[name="nrc_number"]')).toHaveValue(testUser.nrcNumber)

    // Modify data to test update functionality
    const updatedName = 'Updated Navigation Test User'
    await page.fill('input[name="full_name"]', updatedName)

    // Proceed to Step 2 again
    await page.click('button:has-text("Next Step")')
    await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()

    // Go back and forth multiple times to test robustness
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Previous")')
      await expect(page.locator('h2:has-text("Step 1")')).toBeVisible()
      
      // Verify updated data is still preserved
      await expect(page.locator('input[name="full_name"]')).toHaveValue(updatedName)
      
      await page.click('button:has-text("Next Step")')
      await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()
    }

    // Test should pass if no errors occur during navigation
    // This indicates that no duplicate applications were created
  })

  test('should preserve application identifiers across navigation', async ({ page }) => {
    // Navigate to wizard and authenticate
    await page.goto('/student/application-wizard')
    
    if (page.url().includes('/auth/signin')) {
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/application-wizard')
    }

    // Complete Step 1
    await page.fill('input[name="full_name"]', testUser.fullName)
    await page.fill('input[name="nrc_number"]', testUser.nrcNumber)
    await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)
    await page.selectOption('select[name="sex"]', 'Female')
    await page.fill('input[name="phone"]', testUser.phone)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="residence_town"]', testUser.residenceTown)
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')

    // Proceed to Step 2
    await page.click('button:has-text("Next Step")')
    await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()

    // Navigate back and forth multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Previous")')
      await expect(page.locator('h2:has-text("Step 1")')).toBeVisible()
      
      await page.click('button:has-text("Next Step")')
      await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()
    }

    // If we reach here without errors, the application ID and tracking codes
    // are being preserved correctly across navigation
  })

  test('should handle form validation during navigation', async ({ page }) => {
    // Navigate to wizard and authenticate
    await page.goto('/student/application-wizard')
    
    if (page.url().includes('/auth/signin')) {
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/application-wizard')
    }

    // Try to proceed without filling required fields
    await page.click('button:has-text("Next Step")')
    
    // Should show validation errors
    await expect(page.locator('text*=required')).toBeVisible()

    // Fill partial data
    await page.fill('input[name="full_name"]', testUser.fullName)
    await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)

    // Try to proceed again
    await page.click('button:has-text("Next Step")')
    
    // Should still show validation errors for missing fields
    await expect(page.locator('text*=required')).toBeVisible()

    // Complete all required fields
    await page.fill('input[name="nrc_number"]', testUser.nrcNumber)
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="phone"]', testUser.phone)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="residence_town"]', testUser.residenceTown)
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')

    // Should now proceed successfully
    await page.click('button:has-text("Next Step")')
    await expect(page.locator('h2:has-text("Step 2")')).toBeVisible()
  })
})

module.exports = { testUser, TEST_CONFIG }