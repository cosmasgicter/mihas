#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const accreditationDir = './public/images/accreditation';

// Check if ImageMagick is available
function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log('ImageMagick not found. Please install it for image optimization.');
    console.log('Ubuntu/Debian: sudo apt-get install imagemagick');
    console.log('macOS: brew install imagemagick');
    return false;
  }
}

// Optimize images
function optimizeImages() {
  if (!checkImageMagick()) {
    console.log('Skipping image optimization...');
    return;
  }

  const files = fs.readdirSync(accreditationDir);
  
  files.forEach(file => {
    const filePath = path.join(accreditationDir, file);
    const ext = path.extname(file).toLowerCase();
    
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      console.log(`Optimizing ${file}...`);
      
      try {
        // Create backup
        const backupPath = filePath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(filePath, backupPath);
        }
        
        // Optimize image
        const command = `convert "${filePath}" -resize 200x200> -quality 85 -strip "${filePath}"`;
        execSync(command);
        
        const originalSize = fs.statSync(backupPath).size;
        const optimizedSize = fs.statSync(filePath).size;
        const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        
        console.log(`✓ ${file}: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${savings}% reduction)`);
      } catch (error) {
        console.error(`Error optimizing ${file}:`, error.message);
      }
    }
  });
}

// Check file sizes
function checkFileSizes() {
  console.log('\nCurrent file sizes:');
  const files = fs.readdirSync(accreditationDir);
  
  files.forEach(file => {
    if (!['.backup'].some(ext => file.includes(ext))) {
      const filePath = path.join(accreditationDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`${file}: ${sizeKB}KB`);
    }
  });
}

console.log('🖼️  Image Optimization Tool');
console.log('==========================');

checkFileSizes();
optimizeImages();

console.log('\n✅ Image optimization complete!');