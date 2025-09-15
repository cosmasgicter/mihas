#!/usr/bin/env node

// Security audit script for MIHAS/KATC application
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Security patterns to check for
const securityPatterns = {
  xss: [
    /innerHTML\s*=\s*[^;]+/g,
    /dangerouslySetInnerHTML/g,
    /document\.write\s*\(/g,
    /eval\s*\(/g,
    /new\s+Function\s*\(/g
  ],
  logInjection: [
    /console\.(log|error|warn|info)\s*\([^)]*\+[^)]*\)/g,
    /console\.(log|error|warn|info)\s*\(`[^`]*\$\{[^}]*\}[^`]*`\)/g
  ],
  pathTraversal: [
    /\.\.\//g,
    /path\.join\s*\([^)]*\+[^)]*\)/g
  ],
  codeInjection: [
    /Function\s*\(/g,
    /setTimeout\s*\(\s*[^,)]*\+/g,
    /setInterval\s*\(\s*[^,)]*\+/g
  ]
}

// Files to audit
const filesToAudit = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx'
]

function auditFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const issues = []

    // Check for security patterns
    Object.entries(securityPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach(match => {
            issues.push({
              category,
              pattern: pattern.toString(),
              match: match.substring(0, 100),
              line: content.substring(0, content.indexOf(match)).split('\n').length
            })
          })
        }
      })
    })

    return issues
  } catch (error) {
    console.error(`Error auditing ${filePath}:`, error.message)
    return []
  }
}

function scanDirectory(dir) {
  const results = []
  
  try {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        results.push(...scanDirectory(fullPath))
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
        const issues = auditFile(fullPath)
        if (issues.length > 0) {
          results.push({ file: fullPath, issues })
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message)
  }
  
  return results
}

// Run security audit
console.log('🔍 Running security audit...\n')

const srcPath = path.join(__dirname, 'src')
const auditResults = scanDirectory(srcPath)

if (auditResults.length === 0) {
  console.log('✅ No security issues found!')
} else {
  console.log(`⚠️  Found ${auditResults.length} files with potential security issues:\n`)
  
  auditResults.forEach(result => {
    console.log(`📄 ${result.file}`)
    result.issues.forEach(issue => {
      console.log(`  ❌ ${issue.category.toUpperCase()} (Line ${issue.line}): ${issue.match}`)
    })
    console.log()
  })
  
  console.log('🛡️  Security recommendations:')
  console.log('  - Use sanitizeText() for all user inputs')
  console.log('  - Use sanitizeForLog() for all logging')
  console.log('  - Avoid dynamic code execution')
  console.log('  - Validate all file paths')
  console.log('  - Use DOMPurify for HTML sanitization')
}

console.log('\n🔒 Security audit complete.')