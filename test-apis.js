const BASE_URL = 'http://localhost:8888/.netlify/functions'

const tests = [
  // Auth APIs
  { method: 'POST', path: '/auth-login', body: { email: 'cosmaskanchepa8@gmail.com', password: 'Beanola2025' } },
  { method: 'POST', path: '/auth-login', body: { email: 'cosmas@beanola.com', password: 'Beanola2025' } },
  
  // Catalog APIs
  { method: 'GET', path: '/catalog-programs' },
  { method: 'GET', path: '/catalog-intakes' },
  { method: 'GET', path: '/catalog-subjects' },
  
  // Applications APIs
  { method: 'GET', path: '/applications' },
  { method: 'POST', path: '/applications', body: { full_name: 'Test Application', email: 'app@test.com' } },
  
  // Admin APIs
  { method: 'GET', path: '/admin-dashboard' },
  { method: 'GET', path: '/admin-users' },
  { method: 'GET', path: '/admin-queue-status' },
  
  // Analytics APIs
  { method: 'GET', path: '/analytics-metrics' },
  { method: 'GET', path: '/analytics-predictive-dashboard' },
  
  // Notifications APIs
  { method: 'GET', path: '/notifications-preferences' },
  { method: 'POST', path: '/notifications-send', body: { to: 'test@example.com', subject: 'Test', message: 'Test message' } },
  
  // MCP APIs
  { method: 'POST', path: '/mcp-query', body: { query: 'SELECT 1' } },
  { method: 'GET', path: '/mcp-schema' },
  
  // Test API
  { method: 'GET', path: '/test' }
]

async function runTests() {
  console.log('🧪 Testing APIs...\n')
  
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' }
      }
      
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }
      
      const response = await fetch(`${BASE_URL}${test.path}`, options)
      const status = response.status
      
      console.log(`${test.method} ${test.path}: ${status} ${status < 400 ? '✅' : '❌'}`)
      
    } catch (error) {
      console.log(`${test.method} ${test.path}: ERROR ❌ - ${error.message}`)
    }
  }
}

runTests()