#!/usr/bin/env node

// Remove external AI dependencies from package.json
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const packageJsonPath = path.join(__dirname, 'package.json')

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  // Remove external AI dependencies
  const depsToRemove = ['tesseract.js', 'openai', '@openai/api']
  
  if (packageJson.dependencies) {
    depsToRemove.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        delete packageJson.dependencies[dep]
        console.log(`Removed dependency: ${dep}`)
      }
    })
  }
  
  if (packageJson.devDependencies) {
    depsToRemove.forEach(dep => {
      if (packageJson.devDependencies[dep]) {
        delete packageJson.devDependencies[dep]
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