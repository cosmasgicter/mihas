#!/usr/bin/env node

async function testCatalog() {
  const baseUrl = 'http://localhost:8888'
  
  try {
    console.log('Testing programs endpoint...')
    const programsResponse = await fetch(`${baseUrl}/api/catalog/programs`)
    console.log('Programs status:', programsResponse.status)
    
    if (programsResponse.ok) {
      const programsData = await programsResponse.json()
      console.log('Programs data:', programsData)
    } else {
      const error = await programsResponse.text()
      console.log('Programs error:', error)
    }
    
    console.log('\nTesting intakes endpoint...')
    const intakesResponse = await fetch(`${baseUrl}/api/catalog/intakes`)
    console.log('Intakes status:', intakesResponse.status)
    
    if (intakesResponse.ok) {
      const intakesData = await intakesResponse.json()
      console.log('Intakes data:', intakesData)
    } else {
      const error = await intakesResponse.text()
      console.log('Intakes error:', error)
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testCatalog()