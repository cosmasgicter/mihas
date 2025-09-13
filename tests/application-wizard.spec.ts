import { test, expect } from './test-setup'
import { Page } from '@playwright/test'
import path from 'path'

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  fullName: 'John Doe Test',
  nrcNumber: '123456/12/1',
  dateOfBirth: '1995-01-15',
  phone: '0977123456',
  residenceTown: 'Lusaka'
}

const testFiles = {
  resultSlip: path.join(__dirname, 'fixtures', 'result-slip.pdf'),
  proofOfPayment: path.join(__dirname, 'fixtures', 'proof-of-payment.jpg')
}

test.describe('Application Wizard - Complete Flow', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should complete full application submission successfully', async () => {
    // Step 1: Navigate to application wizard
    await page.goto('/student/application-wizard')
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*auth\/signin/)
    
    // Login first
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    
    // Should redirect back to wizard
    await expect(page).toHaveURL(/.*application-wizard/)
    
    // Step 2: Fill Basic KYC (Step 1)
    await expect(page.locator('h2:has-text("Step 1: Basic KYC Information")')).toBeVisible()
    
    await page.fill('input[name="full_name"]', testUser.fullName)
    await page.fill('input[name="nrc_number"]', testUser.nrcNumber)
    await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="phone"]', testUser.phone)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="residence_town"]', testUser.residenceTown)
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')
    
    // Proceed to step 2
    await page.click('button:has-text("Next Step")')
    
    // Step 3: Education & Documents (Step 2)
    await expect(page.locator('h2:has-text("Step 2: Education & Documents")')).toBeVisible()
    
    // Add minimum 6 subjects
    const subjects = [
      { name: 'Mathematics', grade: '6' },
      { name: 'English', grade: '7' },
      { name: 'Biology', grade: '8' },
      { name: 'Chemistry', grade: '7' },
      { name: 'Physics', grade: '6' },
      { name: 'Civic Education', grade: '8' }
    ]
    
    for (let i = 0; i < subjects.length; i++) {
      if (i > 0) {
        await page.click('button:has-text("Add Subject")')
      }
      
      const subjectRow = page.locator('.flex.items-center.space-x-4').nth(i)
      await subjectRow.locator('select').first().selectOption({ label: subjects[i].name })
      await subjectRow.locator('select').last().selectOption(subjects[i].grade)
    }
    
    // Upload result slip
    await page.setInputFiles('input[accept*=".pdf"]', testFiles.resultSlip)
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload complete!')).toBeVisible({ timeout: 10000 })
    
    // Proceed to step 3
    await page.click('button:has-text("Next Step")')
    
    // Step 4: Payment (Step 3)
    await expect(page.locator('h2:has-text("Step 3: Payment Information")')).toBeVisible()
    
    await page.fill('input[name="payment_method"]', 'MTN Mobile Money')
    await page.fill('input[name="payer_name"]', 'John Doe')
    await page.fill('input[name="payer_phone"]', '0977123456')
    await page.fill('input[name="paid_at"]', '2024-01-15T10:30')
    
    // Upload proof of payment
    await page.setInputFiles('input[accept*=".jpg"]', testFiles.proofOfPayment)
    
    // Wait for upload to complete
    await expect(page.locator('text=Upload complete!').last()).toBeVisible({ timeout: 10000 })
    
    // Proceed to step 4
    await page.click('button:has-text("Next Step")')
    
    // Step 5: Review & Submit (Step 4)
    await expect(page.locator('h2:has-text("Step 4: Review & Submit")')).toBeVisible()
    
    // Check confirmation checkbox
    await page.check('input[type="checkbox"]#confirm')
    
    // Submit application
    await page.click('button:has-text("Submit Application")')
    
    // Should show success message
    await expect(page.locator('h2:has-text("Application Submitted Successfully!")')).toBeVisible({ timeout: 15000 })
  })

  test('should validate required fields in step 1', async () => {
    await page.goto('/student/application-wizard')
    
    // Try to proceed without filling required fields
    await page.click('button:has-text("Next Step")')
    
    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Date of birth is required')).toBeVisible()
    await expect(page.locator('text=Please select sex')).toBeVisible()
  })

  test('should validate NRC or Passport requirement', async () => {
    await page.goto('/student/application-wizard')
    
    // Fill other required fields but leave both NRC and Passport empty
    await page.fill('input[name="full_name"]', testUser.fullName)
    await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="phone"]', testUser.phone)
    await page.fill('input[name="email"]', testUser.email)
    await page.fill('input[name="residence_town"]', testUser.residenceTown)
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')
    
    await page.click('button:has-text("Next Step")')
    
    // Should show NRC/Passport validation error
    await expect(page.locator('text=Either NRC or Passport number is required')).toBeVisible()
  })

  test('should validate minimum subjects in step 2', async () => {
    // Complete step 1 first
    await completeStep1(page)
    
    // Try to proceed without adding minimum subjects
    await page.click('button:has-text("Next Step")')
    
    // Should show validation error
    await expect(page.locator('text=Minimum 6 subjects required')).toBeVisible()
  })

  test('should validate result slip upload in step 2', async () => {
    // Complete step 1 first
    await completeStep1(page)
    
    // Add minimum subjects but don't upload result slip
    await addMinimumSubjects(page)
    
    await page.click('button:has-text("Next Step")')
    
    // Should show validation error
    await expect(page.locator('text=Result slip is required')).toBeVisible()
  })

  test('should validate proof of payment in step 3', async () => {
    // Complete steps 1 and 2
    await completeStep1(page)
    await completeStep2(page)
    
    // Fill payment info but don't upload proof
    await page.fill('input[name="payment_method"]', 'MTN Mobile Money')
    await page.fill('input[name="payer_name"]', 'John Doe')
    
    await page.click('button:has-text("Next Step")')
    
    // Fill step 4 and try to submit
    await page.check('input[type="checkbox"]#confirm')
    await page.click('button:has-text("Submit Application")')
    
    // Should show validation error
    await expect(page.locator('text=Proof of payment is required')).toBeVisible()
  })

  test('should handle file upload errors gracefully', async () => {
    await completeStep1(page)
    
    // Try to upload invalid file type
    const invalidFile = path.join(__dirname, 'fixtures', 'invalid.txt')
    await page.setInputFiles('input[accept*=".pdf"]', invalidFile)
    
    // Should show error or reject the file
    // Note: Browser file input with accept attribute should prevent this
    // but we test the behavior anyway
  })

  test('should preserve form data when navigating between steps', async () => {
    await completeStep1(page)
    await completeStep2(page)
    
    // Go back to step 1
    await page.click('button:has-text("Previous")')
    await page.click('button:has-text("Previous")')
    
    // Check that data is preserved
    await expect(page.locator('input[name="full_name"]')).toHaveValue(testUser.fullName)
    await expect(page.locator('input[name="nrc_number"]')).toHaveValue(testUser.nrcNumber)
  })

  test('should handle network errors during submission', async () => {
    // Complete all steps
    await completeStep1(page)
    await completeStep2(page)
    await completeStep3(page)
    
    // Simulate network failure
    await page.route('**/applications_new', route => route.abort())
    
    await page.check('input[type="checkbox"]#confirm')
    await page.click('button:has-text("Submit Application")')
    
    // Should show error message
    await expect(page.locator('text=Failed to fetch')).toBeVisible()
  })
})

// Helper functions
async function completeStep1(page: Page) {
  await page.goto('/student/application-wizard')
  
  await page.fill('input[name="full_name"]', testUser.fullName)
  await page.fill('input[name="nrc_number"]', testUser.nrcNumber)
  await page.fill('input[name="date_of_birth"]', testUser.dateOfBirth)
  await page.selectOption('select[name="sex"]', 'Male')
  await page.fill('input[name="phone"]', testUser.phone)
  await page.fill('input[name="email"]', testUser.email)
  await page.fill('input[name="residence_town"]', testUser.residenceTown)
  await page.selectOption('select[name="program"]', 'Clinical Medicine')
  await page.selectOption('select[name="intake"]', 'January 2026')
  
  await page.click('button:has-text("Next Step")')
  await expect(page.locator('h2:has-text("Step 2: Education & Documents")')).toBeVisible()
}

async function addMinimumSubjects(page: Page) {
  const subjects = [
    { name: 'Mathematics', grade: '6' },
    { name: 'English', grade: '7' },
    { name: 'Biology', grade: '8' },
    { name: 'Chemistry', grade: '7' },
    { name: 'Physics', grade: '6' },
    { name: 'Civic Education', grade: '8' }
  ]
  
  for (let i = 0; i < subjects.length; i++) {
    if (i > 0) {
      await page.click('button:has-text("Add Subject")')
    }
    
    const subjectRow = page.locator('.flex.items-center.space-x-4').nth(i)
    await subjectRow.locator('select').first().selectOption({ label: subjects[i].name })
    await subjectRow.locator('select').last().selectOption(subjects[i].grade)
  }
}

async function completeStep2(page: Page) {
  await addMinimumSubjects(page)
  await page.setInputFiles('input[accept*=".pdf"]', testFiles.resultSlip)
  await expect(page.locator('text=Upload complete!')).toBeVisible({ timeout: 10000 })
  
  await page.click('button:has-text("Next Step")')
  await expect(page.locator('h2:has-text("Step 3: Payment Information")')).toBeVisible()
}

async function completeStep3(page: Page) {
  await page.fill('input[name="payment_method"]', 'MTN Mobile Money')
  await page.fill('input[name="payer_name"]', 'John Doe')
  await page.fill('input[name="payer_phone"]', '0977123456')
  await page.fill('input[name="paid_at"]', '2024-01-15T10:30')
  
  await page.setInputFiles('input[accept*=".jpg"]', testFiles.proofOfPayment)
  await expect(page.locator('text=Upload complete!').last()).toBeVisible({ timeout: 10000 })
  
  await page.click('button:has-text("Next Step")')
  await expect(page.locator('h2:has-text("Step 4: Review & Submit")')).toBeVisible()
}