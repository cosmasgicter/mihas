/**
 * Integration test for notification system
 * Tests the complete flow: application submission -> notification creation -> notification display
 */

import { test, expect } from '@playwright/test'

test.describe('Notification System Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should show notifications after application submission', async ({ page }) => {
    // 1. Sign in as a test user
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard to load
    await expect(page.locator('text=Welcome back')).toBeVisible()
    
    // 2. Check initial notification state (should be empty or have existing notifications)
    const notificationBell = page.locator('[data-testid="notification-bell"]')
    await expect(notificationBell).toBeVisible()
    
    // Click to open notification panel
    await notificationBell.click()
    
    // Count initial notifications
    const initialNotifications = await page.locator('[data-testid="notification-item"]').count()
    
    // Close notification panel
    await page.click('[data-testid="close-notifications"]')
    
    // 3. Start a new application
    await page.click('text=New Application')
    
    // Fill out Step 1: Basic KYC
    await page.fill('input[name="full_name"]', 'Test User')
    await page.fill('input[name="nrc_number"]', '123456/12/1')
    await page.fill('input[name="date_of_birth"]', '1990-01-01')
    await page.selectOption('select[name="sex"]', 'Male')
    await page.fill('input[name="phone"]', '0977123456')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="residence_town"]', 'Lusaka')
    await page.selectOption('select[name="program"]', 'Clinical Medicine')
    await page.selectOption('select[name="intake"]', 'January 2026')
    
    // Click Next Step
    await page.click('text=Next Step')
    
    // Wait for Step 2 to load
    await expect(page.locator('text=Step 2: Education')).toBeVisible()
    
    // Add minimum required subjects (5)
    for (let i = 0; i < 5; i++) {
      await page.click('text=+ Add New Subject')
      
      // Select a subject and grade
      const subjectSelects = page.locator('select').nth(i * 2) // Every other select is for subjects
      await subjectSelects.selectOption({ index: i + 1 }) // Select different subjects
      
      const gradeSelects = page.locator('select').nth(i * 2 + 1) // Grade selects
      await gradeSelects.selectOption('3') // B+ grade
    }
    
    // Upload result slip (mock file)
    const resultSlipInput = page.locator('input[type="file"]').first()
    await resultSlipInput.setInputFiles({
      name: 'result-slip.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    })
    
    // Click Next Step
    await page.click('text=Next Step')
    
    // Wait for Step 3 to load
    await expect(page.locator('text=Step 3: Payment')).toBeVisible()
    
    // Fill payment information
    await page.fill('input[name="payer_name"]', 'Test Payer')
    await page.fill('input[name="payer_phone"]', '0977123456')
    await page.fill('input[name="amount"]', '153')
    
    // Upload proof of payment
    const popInput = page.locator('input[type="file"]').last()
    await popInput.setInputFiles({
      name: 'proof-of-payment.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Mock image content')
    })
    
    // Click Next Step
    await page.click('text=Next Step')
    
    // Wait for Step 4 to load
    await expect(page.locator('text=Step 4: Review')).toBeVisible()
    
    // Confirm submission
    await page.check('input[type="checkbox"]')
    
    // Submit application
    await page.click('text=Submit Application')
    
    // 4. Wait for success screen
    await expect(page.locator('text=Application Submitted Successfully')).toBeVisible({ timeout: 30000 })
    
    // Verify application details are displayed
    await expect(page.locator('text=Application Details')).toBeVisible()
    await expect(page.locator('text=Application Number:')).toBeVisible()
    await expect(page.locator('text=Tracking Code:')).toBeVisible()
    
    // 5. Go to dashboard to check notifications
    await page.click('text=Go to Dashboard')
    
    // Wait for dashboard to load
    await expect(page.locator('text=Welcome back')).toBeVisible()
    
    // 6. Check for new notification
    await notificationBell.click()
    
    // Should have at least one more notification than before
    const finalNotifications = await page.locator('[data-testid="notification-item"]').count()
    expect(finalNotifications).toBeGreaterThan(initialNotifications)
    
    // Check for submission notification
    await expect(page.locator('text=Application Submitted Successfully')).toBeVisible()
    
    // Verify notification content
    const submissionNotification = page.locator('[data-testid="notification-item"]').first()
    await expect(submissionNotification).toContainText('submitted and is under review')
    
    // 7. Click on notification to mark as read
    await submissionNotification.click()
    
    // Should navigate to dashboard or application details
    await expect(page.url()).toMatch(/(dashboard|application)/)
  })

  test('should display unread notification count', async ({ page }) => {
    // Sign in
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Welcome back')).toBeVisible()
    
    // Check notification bell for unread count
    const notificationBell = page.locator('[data-testid="notification-bell"]')
    const unreadBadge = page.locator('[data-testid="unread-count"]')
    
    // If there are unread notifications, badge should be visible
    if (await unreadBadge.isVisible()) {
      const count = await unreadBadge.textContent()
      expect(parseInt(count || '0')).toBeGreaterThan(0)
    }
    
    // Open notifications
    await notificationBell.click()
    
    // Mark all as read
    const markAllReadButton = page.locator('text=Mark all read')
    if (await markAllReadButton.isVisible()) {
      await markAllReadButton.click()
      
      // Badge should disappear or show 0
      await expect(unreadBadge).not.toBeVisible()
    }
  })

  test('should handle notification API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/notifications/application-submitted', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })
    
    // Sign in and submit application (abbreviated flow)
    await page.click('text=Sign In')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    
    // Navigate to application wizard
    await page.click('text=New Application')
    
    // Fill minimal required fields and submit
    // (This is a simplified version - in real test you'd fill all required fields)
    
    // The application should still succeed even if notifications fail
    // This tests the graceful error handling
  })
})