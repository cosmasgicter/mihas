require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 8888

// Enable CORS for all origins in development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Load API routes dynamically
const apiDir = path.join(__dirname, 'api')

function loadApiRoutes(dir, basePath = '') {
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const itemPath = path.join(dir, item)
    const stat = fs.statSync(itemPath)
    
    if (stat.isDirectory() && item !== '_lib') {
      loadApiRoutes(itemPath, `${basePath}/${item}`)
    } else if (item.endsWith('.js')) {
      let routePath
      if (item === 'index.js') {
        routePath = basePath || '/'
      } else {
        const routeName = item.replace('.js', '')
        routePath = `${basePath}/${routeName}`
      }
      
      routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1')
      
      try {
        delete require.cache[require.resolve(itemPath)]
        const handler = require(itemPath)
        if (typeof handler === 'function') {
          app.all(`/api${routePath}`, handler)
          console.log(`Loaded route: /api${routePath}`)
        }
      } catch (error) {
        console.warn(`Failed to load route ${itemPath}:`, error.message)
      }
    }
  }
}

// Load all API routes
loadApiRoutes(apiDir)

// Health check
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT })
})

// Catch-all for unmatched routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

const server = app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`)
  console.log('Available routes:')
  console.log('- GET /api/health')
  console.log('Press Ctrl+C to stop')
})

server.on('error', (error) => {
  console.error('Server error:', error)
})

// Keep process alive
process.stdin.resume()