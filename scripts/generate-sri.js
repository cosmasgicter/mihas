#!/usr/bin/env node
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

// Generate SRI hashes for built assets
const generateSRI = () => {
  const distPath = path.resolve('dist');
  const jsFiles = glob.sync(`${distPath}/**/*.js`);
  const cssFiles = glob.sync(`${distPath}/**/*.css`);
  
  const sriHashes = {};
  
  [...jsFiles, ...cssFiles].forEach(file => {
    const content = readFileSync(file);
    const hash = createHash('sha384').update(content).digest('base64');
    const relativePath = path.relative(distPath, file);
    sriHashes[relativePath] = `sha384-${hash}`;
  });
  
  // Write SRI hashes to a JSON file
  writeFileSync(
    path.resolve(distPath, 'sri-hashes.json'),
    JSON.stringify(sriHashes, null, 2)
  );
  
  console.log('✅ SRI hashes generated successfully');
};

generateSRI();