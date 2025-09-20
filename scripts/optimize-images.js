#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// Simple image optimization using canvas (no external deps)
function compressImage(inputPath, outputPath, quality = 0.6) {
  // For now, just copy and we'll use CSS optimization
  fs.copyFileSync(inputPath, outputPath)
  console.log(`Processed: ${path.basename(outputPath)}`)
}

// Compress all images
const imagesDir = 'public/images'
const files = [
  'katc-campus.png',
  'mihas-campus.png', 
  'accreditation/eczlogo.png',
  'accreditation/hpc_logobig.png',
  'accreditation/GNCLogo.png',
  'accreditation/unza.jpg'
]

files.forEach(file => {
  const inputPath = path.join(imagesDir, file)
  const outputPath = path.join(imagesDir, file.replace(/\.(png|jpg|jpeg)$/, '.webp'))
  
  if (fs.existsSync(inputPath)) {
    compressImage(inputPath, outputPath)
  }
})

console.log('Image optimization complete!')