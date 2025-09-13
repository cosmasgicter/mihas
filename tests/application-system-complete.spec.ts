import { test, expect } from '@playwright/test'

test.describe('Complete Application System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('User can register, create application, and admin can review', async ({ page }) => {
    // Step 1: User Registration
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'testuser@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'John Doe')
    await page.fill('input[name="phone"]', '0977123456')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/student\/dashboard/)

    // Step 2: Start Application Wizard
    await page.click('text=Start New Application')
    await expect(page).toHaveURL(/\/student\/application-wizard/)

    // Step 3: Fill KYC Information (should be auto-populated)
    await expect(page.locator('input[name="full_name"]')).toHaveValue('John Doe')
    await expect(page.locator('input[name="email"]')).toHaveValue('testuser@example.com')
    await expect(page.locator('input[name="phone"]')).toHaveValue('0977123456')

    // Fill remaining KYC fields
    await page.fill('input[name="nrc_number"]', '123456/12/1')
    await page.fill('input[name="date_of_birth"]', '2000-01-01')
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="residence_town"]', 'Lusaka')
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')

    // Proceed to next step
    await page.click('text=Next Step')

    // Step 4: Add Subjects (minimum 5 required)
    // Add English
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=0', { label: 'English' })
    await page.selectOption('select >> nth=1', '7')

    // Add Mathematics
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=2', { label: 'Mathematics' })
    await page.selectOption('select >> nth=3', '8')

    // Add Biology
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=4', { label: 'Biology' })
    await page.selectOption('select >> nth=5', '7')

    // Add Chemistry
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=6', { label: 'Chemistry' })
    await page.selectOption('select >> nth=7', '6')

    // Add Physics
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=8', { label: 'Physics' })
    await page.selectOption('select >> nth=9', '6')

    // Check eligibility status appears
    await expect(page.locator('text=✓ Eligible')).toBeVisible()

    // Upload result slip
    await page.setInputFiles('input[type="file"] >> nth=0', 'tests/fixtures/result-slip.pdf')
    await expect(page.locator('text=✓ Upload complete!')).toBeVisible()

    // Proceed to payment step
    await page.click('text=Next Step')

    // Step 5: Payment Information
    await page.fill('input[name="payment_method"]', 'MTN Mobile Money')
    await page.fill('input[name="payer_name"]', 'John Doe')
    await page.fill('input[name="payer_phone"]', '0977123456')
    await page.fill('input[name="paid_at"]', '2024-01-15T10:00')
    await page.fill('input[name="momo_ref"]', 'MTN123456789')

    // Upload proof of payment
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/proof-of-payment.jpg')
    await expect(page.locator('text=✓ Upload complete!')).toBeVisible()

    // Proceed to review
    await page.click('text=Next Step')

    // Step 6: Review and Submit
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Clinical Medicine')).toBeVisible()
    await expect(page.locator('text=5 subjects selected')).toBeVisible()
    await expect(page.locator('text=✓ Eligible')).toBeVisible()

    // Confirm and submit
    await page.check('input[type="checkbox"]')
    await page.click('text=Submit Application')

    // Verify success
    await expect(page.locator('text=Application Submitted Successfully!')).toBeVisible()

    // Return to dashboard
    await page.click('text=Go to Dashboard')
    await expect(page).toHaveURL(/\/student\/dashboard/)

    // Verify application appears in dashboard
    await expect(page.locator('text=Clinical Medicine')).toBeVisible()
    await expect(page.locator('text=SUBMITTED')).toBeVisible()
  })

  test('Draft application persistence works', async ({ page }) => {
    // Register and login
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'draftuser@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'Jane Smith')
    await page.click('button[type="submit"]')

    // Start application
    await page.click('text=Start New Application')
    
    // Fill some KYC info
    await page.fill('input[name="nrc_number"]', '654321/12/1')
    await page.selectOption('select[name="program"]', 'Registered Nursing')
    
    // Navigate away (simulating user leaving)
    await page.goto('/student/dashboard')
    
    // Verify draft is saved
    await expect(page.locator('text=Draft Application')).toBeVisible()
    await expect(page.locator('text=Registered Nursing')).toBeVisible()
    
    // Continue draft
    await page.click('text=Continue Draft')
    
    // Verify data is restored
    await expect(page.locator('input[name="nrc_number"]')).toHaveValue('654321/12/1')
    await expect(page.locator('select[name="program"]')).toHaveValue('Registered Nursing')
  })

  test('Eligibility checker works correctly', async ({ page }) => {
    // Quick setup
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'eligibility@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'Test User')
    await page.click('button[type="submit"]')
    
    await page.click('text=Start New Application')
    
    // Fill basic info
    await page.fill('input[name="nrc_number"]', '111111/11/1')
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.click('text=Next Step')
    
    // Test insufficient subjects
    await page.click('text=+ Add New Subject')
    await page.selectOption('select >> nth=0', { label: 'English' })
    await page.selectOption('select >> nth=1', '7')
    
    // Should show not eligible
    await expect(page.locator('text=Minimum 5 subjects required')).toBeVisible()
    
    // Add required subjects for Clinical Medicine
    const subjects = ['Mathematics', 'Biology', 'Chemistry', 'Physics']
    for (const subject of subjects) {
      await page.click('text=+ Add New Subject')
      const selects = await page.locator('select').count()
      await page.selectOption(`select >> nth=${selects - 2}`, { label: subject })
      await page.selectOption(`select >> nth=${selects - 1}`, '7')
    }
    
    // Should now show eligible
    await expect(page.locator('text=✓ Eligible for Clinical Medicine')).toBeVisible()
    
    // Test low grades
    await page.selectOption('select >> nth=9', '4') // Set Physics to grade 4
    await expect(page.locator('text=✗ Not Eligible')).toBeVisible()
    await expect(page.locator('text=Grades below 6')).toBeVisible()
  })

  test('File uploads work correctly', async ({ page }) => {
    // Setup user
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'filetest@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'File Tester')
    await page.click('button[type="submit"]')
    
    await page.click('text=Start New Application')
    
    // Complete KYC step
    await page.fill('input[name="nrc_number"]', '222222/22/2')
    await page.selectOption('select[name="program"]', 'Environmental Health')
    await page.click('text=Next Step')
    
    // Add minimum subjects
    const subjects = ['English', 'Mathematics', 'Biology', 'Chemistry', 'Geography']
    for (let i = 0; i < subjects.length; i++) {
      await page.click('text=+ Add New Subject')
      const selects = await page.locator('select').count()
      await page.selectOption(`select >> nth=${selects - 2}`, { label: subjects[i] })
      await page.selectOption(`select >> nth=${selects - 1}`, '7')
    }
    
    // Test file upload
    await page.setInputFiles('input[type="file"] >> nth=0', 'tests/fixtures/result-slip.pdf')
    
    // Wait for upload progress and completion
    await expect(page.locator('text=Uploading...')).toBeVisible()
    await expect(page.locator('text=✓ Upload complete!')).toBeVisible({ timeout: 10000 })
    
    // Test invalid file type
    await page.setInputFiles('input[type="file"] >> nth=1', 'tests/fixtures/invalid.txt')
    await expect(page.locator('text=Only PDF, JPG, JPEG, and PNG files are allowed')).toBeVisible()
  })

  test('Admin can view and manage applications', async ({ page }) => {
    // First create an application as a student
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'student@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'Student User')
    await page.click('button[type="submit"]')
    
    // Create a complete application
    await page.click('text=Start New Application')
    await page.fill('input[name="nrc_number"]', '333333/33/3')
    await page.selectOption('select[name="program"]', 'Registered Nursing')
    await page.click('text=Next Step')
    
    // Add subjects
    const subjects = ['English', 'Mathematics', 'Biology', 'Chemistry', 'Civic Education']
    for (let i = 0; i < subjects.length; i++) {
      await page.click('text=+ Add New Subject')
      const selects = await page.locator('select').count()
      await page.selectOption(`select >> nth=${selects - 2}`, { label: subjects[i] })
      await page.selectOption(`select >> nth=${selects - 1}`, '8')
    }
    
    await page.setInputFiles('input[type="file"] >> nth=0', 'tests/fixtures/result-slip.pdf')
    await expect(page.locator('text=✓ Upload complete!')).toBeVisible()
    await page.click('text=Next Step')
    
    // Payment info
    await page.fill('input[name="payment_method"]', 'MTN Mobile Money')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/proof-of-payment.jpg')
    await expect(page.locator('text=✓ Upload complete!')).toBeVisible()
    await page.click('text=Next Step')
    
    // Submit
    await page.check('input[type="checkbox"]')
    await page.click('text=Submit Application')
    await expect(page.locator('text=Application Submitted Successfully!')).toBeVisible()
    
    // Logout
    await page.click('text=Sign Out')
    
    // Login as admin (assuming admin user exists)
    await page.click('text=Sign In')
    await page.fill('input[name="email"]', 'cosmas@beanola.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Navigate to admin applications
    await page.goto('/admin/applications')
    
    // Verify application appears
    await expect(page.locator('text=Student User')).toBeVisible()
    await expect(page.locator('text=Registered Nursing')).toBeVisible()
    await expect(page.locator('text=SUBMITTED')).toBeVisible()
    
    // Test status update
    await page.click('text=Start Review')
    await expect(page.locator('text=UNDER REVIEW')).toBeVisible()
    
    // Test approval
    await page.click('text=Approve')
    await expect(page.locator('text=APPROVED')).toBeVisible()
  })

  test('Application tracking works', async ({ page }) => {
    // Create application and get tracking code
    await page.click('text=Sign Up')
    await page.fill('input[name="email"]', 'tracker@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="full_name"]', 'Track User')
    await page.click('button[type="submit"]')
    
    // Complete application quickly
    await page.click('text=Start New Application')
    await page.fill('input[name="nrc_number"]', '444444/44/4')
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.click('text=Next Step')
    
    // Add subjects quickly
    for (let i = 0; i < 5; i++) {
      await page.click('text=+ Add New Subject')
    }
    
    await page.setInputFiles('input[type="file"] >> nth=0', 'tests/fixtures/result-slip.pdf')
    await page.click('text=Next Step')
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/proof-of-payment.jpg')
    await page.click('text=Next Step')
    await page.check('input[type="checkbox"]')
    await page.click('text=Submit Application')
    
    // Get tracking code from success page or dashboard
    await page.click('text=Go to Dashboard')
    const trackingCode = await page.locator('[data-testid="tracking-code"]').textContent()
    
    // Test public tracking
    await page.goto('/track')
    await page.fill('input[name="tracking_code"]', trackingCode || 'TRK123456')
    await page.click('text=Track Application')
    
    await expect(page.locator('text=Track User')).toBeVisible()
    await expect(page.locator('text=Clinical Medicine')).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('Handles network errors gracefully', async ({ page }) => {
    // Simulate network failure during file upload
    await page.route('**/storage/v1/object/app_docs/**', route => {
      route.abort('failed')
    })
    
    await page.goto('/student/application-wizard')
    // Test error handling for file uploads
  })
  
  test('Validates form inputs properly', async ({ page }) => {
    await page.goto('/student/application-wizard')
    
    // Test validation errors
    await page.click('text=Next Step')
    await expect(page.locator('text=Full name is required')).toBeVisible()
    
    // Test NRC/Passport validation
    await page.fill('input[name="full_name"]', 'Test User')
    await page.click('text=Next Step')
    await expect(page.locator('text=Either NRC or Passport number is required')).toBeVisible()
  })
})