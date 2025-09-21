const fs = require('fs')
const path = require('path')

const functionsDir = './netlify/functions'
const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'))

const corsHeaders = `      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'`

files.forEach(file => {
  const filePath = path.join(functionsDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Skip if already has CORS headers
  if (content.includes('Access-Control-Allow-Origin')) {
    console.log(`Skipping ${file} - already has CORS headers`)
    return
  }
  
  // Add CORS headers to res object
  content = content.replace(
    /headers: \{ 'Content-Type': 'application\/json' \}/,
    `headers: { 
      'Content-Type': 'application/json',
${corsHeaders}
    }`
  )
  
  // Add end() method if missing
  if (!content.includes('end: function')) {
    content = content.replace(
      /json: function\(data\) \{ this\.body = JSON\.stringify\(data\); return this \}/,
      `json: function(data) { this.body = JSON.stringify(data); return this },
    end: function(data) { this.body = data || ''; return this }`
    )
  }
  
  // Add OPTIONS handling if missing
  if (!content.includes('Handle OPTIONS preflight')) {
    content = content.replace(
      /try \{/,
      `// Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: res.headers,
      body: ''
    }
  }

  try {`
    )
  }
  
  fs.writeFileSync(filePath, content)
  console.log(`Fixed CORS for ${file}`)
})

console.log('CORS fix complete!')