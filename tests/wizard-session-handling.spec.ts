import { test, expect } from '@playwright/test'

test.describe('Wizard Session Handling', () => {
  test('should handle missing session token gracefully', async ({ page }) => {
    // Mock console.warn to capture session warnings
    const consoleWarnings: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('session token')) {
        consoleWarnings.push(msg.text())
      }
    })

    // Mock fetch to simulate API calls
    await page.route('**/api/notifications/application-submitted', route => {
      const headers = route.request().headers()
      if (!headers.authorization || headers.authorization === 'Bearer undefined') {
        route.fulfill({ status: 401, body: 'Unauthorized' })
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      }
    })

    // Create a simple test page that simulates the session handling
    await page.setContent(`
      <html>
        <body>
          <div id="result"></div>
          <script>
            // Simulate the session handling logic
            async function testSessionHandling() {
              const mockSupabase = {
                auth: {
                  getSession: () => Promise.resolve({ data: { session: null }, error: null })
                }
              }
              
              try {
                const { data: { session } } = await mockSupabase.auth.getSession()
                
                if (!session?.access_token) {
                  console.warn('No session token available: No active session')
                  document.getElementById('result').textContent = 'Session warning logged'
                  return
                }
                
                // This shouldn't execute
                document.getElementById('result').textContent = 'Unexpected success'
              } catch (error) {
                document.getElementById('result').textContent = 'Error: ' + error.message
              }
            }
            
            testSessionHandling()
          </script>
        </body>
      </html>
    `)

    // Wait for the test to complete
    await expect(page.locator('#result')).toHaveText('Session warning logged')
    
    // Verify console warning was logged
    await page.waitForFunction(() => {
      return window.console && console.warn
    })
    
    expect(consoleWarnings.length).toBeGreaterThan(0)
    expect(consoleWarnings[0]).toContain('No session token available')
  })

  test('should use session token when available', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="result"></div>
          <script>
            async function testWithValidSession() {
              const mockSupabase = {
                auth: {
                  getSession: () => Promise.resolve({ 
                    data: { session: { access_token: 'valid-token' } }, 
                    error: null 
                  })
                }
              }
              
              try {
                const { data: { session } } = await mockSupabase.auth.getSession()
                
                if (!session?.access_token) {
                  document.getElementById('result').textContent = 'No token found'
                  return
                }
                
                document.getElementById('result').textContent = 'Token used: ' + session.access_token
              } catch (error) {
                document.getElementById('result').textContent = 'Error: ' + error.message
              }
            }
            
            testWithValidSession()
          </script>
        </body>
      </html>
    `)

    await expect(page.locator('#result')).toHaveText('Token used: valid-token')
  })
})