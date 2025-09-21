const http = require('http')

// Test API server
function testAPI() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8888/api/health', (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log('✅ API Server: Running on port 8888')
        console.log('Response:', data || 'Empty response')
        resolve(true)
      })
    })
    req.on('error', () => {
      console.log('❌ API Server: Not running on port 8888')
      resolve(false)
    })
    req.setTimeout(2000, () => {
      console.log('⏰ API Server: Timeout')
      req.destroy()
      resolve(false)
    })
  })
}

// Test frontend server
function testFrontend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173/', (res) => {
      console.log('✅ Frontend Server: Running on port 5173')
      resolve(true)
    })
    req.on('error', () => {
      console.log('❌ Frontend Server: Not running on port 5173')
      resolve(false)
    })
    req.setTimeout(2000, () => {
      console.log('⏰ Frontend Server: Timeout')
      req.destroy()
      resolve(false)
    })
  })
}

async function testSetup() {
  console.log('🧪 Testing Local Development Setup...\n')
  
  const apiRunning = await testAPI()
  const frontendRunning = await testFrontend()
  
  console.log('\n📋 Setup Status:')
  console.log(`API Server (port 8888): ${apiRunning ? '✅ OK' : '❌ Not Running'}`)
  console.log(`Frontend (port 5173): ${frontendRunning ? '✅ OK' : '❌ Not Running'}`)
  
  if (apiRunning && frontendRunning) {
    console.log('\n🎉 Local development setup is working!')
    console.log('Access your app at: http://localhost:5173')
  } else {
    console.log('\n⚠️  Some services are not running. Start them with:')
    if (!apiRunning) console.log('  npm run dev:api')
    if (!frontendRunning) console.log('  npm run dev')
    console.log('  Or run both: npm run dev:full')
  }
}

testSetup()