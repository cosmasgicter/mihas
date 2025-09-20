#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')

// Download and compress external images
const images = [
  {
    url: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f4d8d7cb-b8b3-4a0a-ba36-084fa481da0d.png',
    name: 'katc-campus.webp'
  },
  {
    url: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/f703f321-4922-421e-8288-cf059bd92133.png', 
    name: 'mihas-campus.webp'
  }
]

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join('public/images', filename))
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', reject)
  })
}

async function main() {
  console.log('Downloading images for compression...')
  
  for (const img of images) {
    try {
      await downloadImage(img.url, img.name.replace('.webp', '.png'))
      console.log(`Downloaded: ${img.name}`)
    } catch (error) {
      console.error(`Failed to download ${img.name}:`, error.message)
    }
  }
}

main()