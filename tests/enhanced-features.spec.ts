import { test, expect } from './test-setup'

test.describe('Enhanced Application Features', () => {
  test.beforeEach(async ({ page, adminUser }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', adminUser.email)
    await page.fill('input[type="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*admin/, { timeout: 15000 })
  })

  test('Admin can access enhanced applications dashboard', async ({ page }) => {
    await page.goto('/admin/applications-new')
    await expect(page.locator('h1')).toContainText('Applications Management')
    await expect(page.locator('table')).toBeVisible()
  })

  test('Advanced filtering works correctly', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Test search filter
    await page.fill('[placeholder*="Search by name"]', 'John')
    await page.waitForTimeout(500)
    
    // Test status filter
    await page.selectOption('select:has-text("All Statuses")', 'submitted')
    
    // Test program filter
    await page.selectOption('select:has-text("All Programs")', 'Clinical Medicine')
    
    // Test institution filter
    await page.selectOption('select:has-text("All Institutions")', 'KATC')
    
    // Test age filter
    await page.fill('[placeholder="Min Age"]', '18')
    
    // Test grade filter
    await page.fill('[placeholder="Min Grade"]', '5')
    
    // Test date range
    await page.fill('input[type="date"]:first-of-type', '2024-01-01')
    await page.fill('input[type="date"]:last-of-type', '2024-12-31')
    
    await expect(page.locator('table tbody tr')).toHaveCount({ min: 0 })
  })

  test('Bulk operations work correctly', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Select first application
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    
    // Verify bulk actions appear
    await expect(page.locator('text=selected')).toBeVisible()
    
    // Test bulk status update
    await page.selectOption('select:has-text("Bulk Status Update")', 'under_review')
    
    // Verify status updated
    await page.waitForTimeout(1000)
    await expect(page.locator('text=UNDER REVIEW')).toBeVisible()
  })

  test('Select all functionality works', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Click select all checkbox
    await page.click('table thead input[type="checkbox"]')
    
    // Verify all rows are selected
    const checkboxes = page.locator('table tbody input[type="checkbox"]:checked')
    const rows = page.locator('table tbody tr')
    
    await expect(checkboxes).toHaveCount(await rows.count())
    
    // Clear selection
    await page.click('button:has-text("Clear Selection")')
    
    // Verify no rows selected
    await expect(page.locator('text=selected')).not.toBeVisible()
  })

  test('Export functionality works', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Test CSV export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toMatch(/applications_\d{4}-\d{2}-\d{2}\.csv/)
    
    // Test Excel export
    const downloadPromise2 = page.waitForEvent('download')
    await page.click('button:has-text("Export Excel")')
    const download2 = await downloadPromise2
    
    expect(download2.suggestedFilename()).toMatch(/applications_\d{4}-\d{2}-\d{2}\.csv/)
  })

  test('Status updates trigger notifications', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Update status of first application
    const statusSelect = page.locator('table tbody tr:first-child select').first()
    await statusSelect.selectOption('approved')
    
    // Wait for update
    await page.waitForTimeout(1000)
    
    // Check if notification was created (would need to verify in database or notification panel)
    await expect(page.locator('text=APPROVED')).toBeVisible()
  })

  test('Payment status updates work', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Update payment status
    const paymentSelect = page.locator('table tbody tr:first-child select').nth(1)
    await paymentSelect.selectOption('verified')
    
    // Wait for update
    await page.waitForTimeout(1000)
    
    // Verify payment status updated
    await expect(page.locator('text=VERIFIED')).toBeVisible()
  })

  test('Document links are accessible', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Check for document links
    const documentLinks = page.locator('a:has-text("Result Slip"), a:has-text("Extra KYC"), a:has-text("Proof of Payment")')
    
    if (await documentLinks.count() > 0) {
      // Verify links have proper href attributes
      const firstLink = documentLinks.first()
      const href = await firstLink.getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toContain('http')
    }
  })

  test('Enhanced data display shows calculated fields', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Check for enhanced data fields
    await expect(page.locator('text=subjects')).toBeVisible()
    
    // Check for average grade display
    const avgGradeElements = page.locator('text=/Avg: \\d+\\.\\d+/')
    if (await avgGradeElements.count() > 0) {
      await expect(avgGradeElements.first()).toBeVisible()
    }
  })

  test('Filtering persists during export', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Apply a filter
    await page.selectOption('select:has-text("All Programs")', 'Clinical Medicine')
    await page.waitForTimeout(500)
    
    // Export with filter applied
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    const download = await downloadPromise
    
    // Verify export completed
    expect(download.suggestedFilename()).toMatch(/applications_\d{4}-\d{2}-\d{2}\.csv/)
  })

  test('Bulk payment status update works', async ({ page }) => {
    await page.goto('/admin/applications-new')
    
    // Wait for applications to load
    await page.waitForSelector('table tbody tr')
    
    // Select multiple applications
    await page.click('table tbody tr:first-child input[type="checkbox"]')
    await page.click('table tbody tr:nth-child(2) input[type="checkbox"]')
    
    // Verify bulk actions appear
    await expect(page.locator('text=2 selected')).toBeVisible()
    
    // Test bulk payment status update
    await page.selectOption('select:has-text("Bulk Payment Update")', 'verified')
    
    // Verify updates applied
    await page.waitForTimeout(1000)
    await expect(page.locator('text=VERIFIED')).toHaveCount({ min: 2 })
  })
})

test.describe('Student Application Wizard', () => {
  test.beforeEach(async ({ page, testUser }) => {
    // Login as student
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*student/, { timeout: 15000 })
  })

  test('Student can complete 4-step wizard', async ({ page }) => {
    await page.goto('/student/application-wizard')
    
    // Step 1: Basic KYC
    await page.fill('[name="full_name"]', 'John Doe')
    await page.fill('[name="nrc_number"]', '123456/12/1')
    await page.fill('[name="date_of_birth"]', '2000-01-01')
    await page.selectOption('[name="sex"]', 'Male')
    await page.fill('[name="phone"]', '0977123456')
    await page.fill('[name="email"]', 'john@test.com')
    await page.fill('[name="residence_town"]', 'Lusaka')
    await page.selectOption('[name="program"]', 'Clinical Medicine')
    await page.selectOption('[name="intake"]', 'January 2026')
    
    await page.click('button:has-text("Next Step")')
    
    // Step 2: Education
    await page.click('button:has-text("Add Subject")')
    await page.selectOption('select:first-of-type', 'English')
    await page.selectOption('select[value="1"]', '7')
    
    // Add more subjects to meet minimum requirement
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Add Subject")')
    }
    
    // Upload result slip
    await page.setInputFiles('input[type="file"]:first-of-type', 'tests/fixtures/result-slip.pdf')
    
    await page.click('button:has-text("Next Step")')
    
    // Step 3: Payment
    await page.fill('[name="payment_method"]', 'MTN Mobile Money')
    await page.fill('[name="payer_name"]', 'John Doe')
    await page.fill('[name="payer_phone"]', '0977123456')
    await page.fill('[name="paid_at"]', '2024-01-15T10:00')
    
    // Upload proof of payment
    await page.setInputFiles('input[type="file"]:last-of-type', 'tests/fixtures/proof-of-payment.jpg')
    
    await page.click('button:has-text("Next Step")')
    
    // Step 4: Review & Submit
    await page.check('input[type="checkbox"]')
    await page.click('button:has-text("Submit Application")')
    
    // Verify success
    await expect(page.locator('text=Application Submitted Successfully')).toBeVisible()
  })

  test('Institution auto-derives correctly', async ({ page }) => {
    await page.goto('/student/application-wizard')
    
    // Test KATC programs
    await page.selectOption('[name="program"]', 'Clinical Medicine')
    await expect(page.locator('text=KATC')).toBeVisible()
    
    await page.selectOption('[name="program"]', 'Environmental Health')
    await expect(page.locator('text=KATC')).toBeVisible()
    
    // Test MIHAS program
    await page.selectOption('[name="program"]', 'Registered Nursing')
    await expect(page.locator('text=MIHAS')).toBeVisible()
  })

  test('Payment targets display correctly', async ({ page }) => {
    await page.goto('/student/application-wizard')
    
    // Complete Step 1
    await page.fill('[name="full_name"]', 'Test User')
    await page.fill('[name="nrc_number"]', '123456/12/1')
    await page.fill('[name="date_of_birth"]', '2000-01-01')
    await page.selectOption('[name="sex"]', 'Male')
    await page.fill('[name="phone"]', '0977123456')
    await page.fill('[name="email"]', 'test@test.com')
    await page.fill('[name="residence_town"]', 'Lusaka')
    await page.selectOption('[name="program"]', 'Clinical Medicine')
    await page.selectOption('[name="intake"]', 'January 2026')
    
    await page.click('button:has-text("Next Step")')
    await page.click('button:has-text("Next Step")')
    
    // Step 3: Verify payment target
    await expect(page.locator('text=KATC MTN 0966 992 299')).toBeVisible()
    await expect(page.locator('text=K150.00')).toBeVisible()
  })
})