const BASE_URL = 'http://localhost:5173/.netlify/functions'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjE1ZTkxenVweDltUlBkU00iLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL215bGdlZ2txb2RkY3J4dHdjY2xiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmYzZhMTUzNi0yZTVjLTQwOTktOWI5ZS1hMzg2NTM0MDhmOTUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NDY1NDc0LCJpYXQiOjE3NTg0NjE4NzQsImVtYWlsIjoiY29zbWFzQGJlYW5vbGEuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImNvc21hc0BiZWFub2xhLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImZjNmExNTM2LTJlNWMtNDA5OS05YjllLWEzODY1MzQwOGY5NSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU4NDYxODc0fV0sInNlc3Npb25faWQiOiI1NTQ3OWY5ZC00YzAwLTQzNGUtODExNi04ZWJiYWI3OTViODQiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.xoCECSj8fylzPQ7OsnxnZjRwdq8gtsAG9mUN1oUkh2M'

const authenticatedTests = [
  { method: 'GET', path: '/admin-dashboard' },
  { method: 'GET', path: '/admin-users' },
  { method: 'GET', path: '/applications' },
  { method: 'GET', path: '/analytics-metrics' },
  { method: 'GET', path: '/analytics-predictive-dashboard' },
  { method: 'GET', path: '/mcp-schema' },
  { method: 'POST', path: '/mcp-query', body: { query: 'SELECT COUNT(*) FROM applications_new' } },
  { method: 'GET', path: '/notifications-preferences' },
  { method: 'POST', path: '/notifications-send', body: { to: 'test@example.com', subject: 'Test', message: 'Test' } }
]

async function runAuthenticatedTests() {
  console.log('🔐 Testing Authenticated APIs...\n')
  
  for (const test of authenticatedTests) {
    try {
      const options = {
        method: test.method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        }
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

runAuthenticatedTests()