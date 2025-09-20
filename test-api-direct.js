#!/usr/bin/env node

async function testAPI() {
  console.log('Testing API endpoints directly...')
  
  try {
    // Test the malformed URL issue
    const malformedUrl = 'http://localhost:8888/api/applications?page=0&amp;amp;pageSize=1&amp;amp;status=draft&amp;amp;sortBy=date&amp;amp;sortOrder=desc&amp;amp;mine=true'
    
    console.log('Testing malformed URL:', malformedUrl)
    
    const response = await fetch(malformedUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API call successful')
    } else {
      const error = await response.text()
      console.log('Response body:', error)
    }
    
    // Test with clean URL
    const cleanUrl = 'http://localhost:8888/api/applications?page=0&pageSize=1&status=draft&sortBy=date&sortOrder=desc&mine=true'
    
    console.log('\nTesting clean URL:', cleanUrl)
    
    const response2 = await fetch(cleanUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response2.status)
    
    if (response2.ok) {
      const data = await response2.json()
      console.log('✅ Clean URL API call successful')
    } else {
      const error = await response2.text()
      console.log('Response body:', error)
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testAPI()