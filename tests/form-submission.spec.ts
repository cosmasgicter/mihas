import { test, expect } from './test-setup'

test.describe('Form Submission', () => {
  test.beforeEach(async ({ page, testUser }) => {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*student/, { timeout: 15000 })
  })

  test('should submit application form successfully', async ({ page }) => {
    await page.goto('/student/application-multi')
    
    // Step 1: Program Selection
    await page.selectOption('[name="program_id"]', { index: 1 })
    await page.selectOption('[name="intake_id"]', { index: 1 })
    await page.click('button:has-text("Next Step")')

    // Step 2: Personal Information
    await page.fill('[name="nrc_number"]', '123456/12/1')
    await page.fill('[name="date_of_birth"]', '1995-01-01')
    await page.selectOption('[name="gender"]', 'Male')
    await page.selectOption('[name="marital_status"]', 'Single')
    await page.fill('[name="nationality"]', 'Zambian')
    await page.selectOption('[name="province"]', 'Lusaka')
    await page.fill('[name="district"]', 'Lusaka')
    await page.fill('[name="physical_address"]', '123 Test Street, Lusaka')
    await page.click('button:has-text("Next Step")')

    // Skip to final step
    for (let i = 3; i < 10; i++) {
      await page.click('button:has-text("Next Step")')
    }

    // Submit
    await page.click('button:has-text("Submit Application")')
    
    // Verify success
    await expect(page.locator('text=Application Submitted Successfully')).toBeVisible()
  })

  test('should handle file upload', async ({ page }) => {
    await page.goto('/student/application-multi')
    
    // Navigate to step with file upload
    await page.selectOption('[name="program_id"]', { index: 1 })
    await page.selectOption('[name="intake_id"]', { index: 1 })
    await page.click('button:has-text("Next Step")')
    await page.click('button:has-text("Next Step")')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/result-slip.pdf')
    
    // Verify upload success
    await expect(page.locator('text=Upload test passed')).toBeVisible({ timeout: 10000 })
  })
})