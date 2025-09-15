#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const accreditationDir = './public/images/accreditation';

// Secure path validation
function validatePath(inputPath) {
  const resolvedPath = path.resolve(inputPath);
  const basePath = path.resolve('./public/images');
  
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Path traversal attempt detected');
  }
  
  return resolvedPath;
}

// Sanitize file names
function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

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

  const validatedDir = validatePath(accreditationDir);
  const files = fs.readdirSync(validatedDir);
  
  files.forEach(file => {
    const sanitizedFile = sanitizeFileName(file);
    const filePath = validatePath(path.join(validatedDir, sanitizedFile));
    const ext = path.extname(sanitizedFile).toLowerCase();
    
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      console.log(`Optimizing ${sanitizedFile}...`);
      
      try {
        // Create backup
        const backupPath = filePath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(filePath, backupPath);
        }
        
        // Optimize image with safe command execution
        const args = [filePath, '-resize', '200x200>', '-quality', '85', '-strip', filePath];
        execSync(`convert ${args.map(arg => JSON.stringify(arg)).join(' ')}`, {
          stdio: 'ignore'
        });
        
        const originalSize = fs.statSync(backupPath).size;
        const optimizedSize = fs.statSync(filePath).size;
        const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        
        console.log(`✓ ${sanitizedFile}: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${savings}% reduction)`);
      } catch (error) {
        console.error(`Error optimizing ${sanitizedFile}:`, error.message);
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