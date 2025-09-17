#!/usr/bin/env node

// Clear authentication tokens for development
console.log('Clearing authentication tokens for development...')

// Clear localStorage and sessionStorage if running in browser context
if (typeof window !== 'undefined') {
  localStorage.clear()
  sessionStorage.clear()
  console.log('Browser storage cleared')
}

// Clear any cached tokens
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Clear any potential auth cache files
const cacheFiles = [
  '.auth-cache',
  '.supabase-cache',
  'node_modules/.cache'
]

cacheFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    try {
      fs.rmSync(filePath, { recursive: true, force: true })
      console.log(`Cleared cache: ${file}`)
    } catch (error) {
      console.log(`Could not clear ${file}:`, error.message)
    }
  }
})

console.log('Authentication cache cleared. Please restart the development server.')