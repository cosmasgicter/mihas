#!/usr/bin/env node

// Remove external AI dependencies from package.json
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Secure path validation to prevent path traversal
function validatePath(inputPath) {
  const resolvedPath = path.resolve(inputPath)
  const basePath = path.resolve(__dirname)
  
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Path traversal attempt detected')
  }
  
  return resolvedPath
}

const packageJsonPath = validatePath(path.join(__dirname, 'package.json'))

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  // Remove external AI dependencies
  const depsToRemove = ['tesseract.js', 'openai', '@openai/api']
  
  if (packageJson.dependencies) {
    depsToRemove.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = undefined
        console.log(`Removed dependency: ${dep}`)
      }
    })
  }
  
  if (packageJson.devDependencies) {
    depsToRemove.forEach(dep => {
      if (packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = undefined
        console.log(`Removed dev dependency: ${dep}`)
      }
    })
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log('✅ Removed all external AI dependencies')
  console.log('🎉 System is now 100% free with no external AI services')
} else {
  console.log('package.json not found')
}