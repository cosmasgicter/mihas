// Test script to verify application works without document analysis
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Application Without Document Analysis...\n');

// Check if document analysis files exist
const filesToCheck = [
  'src/lib/documentAI.ts',
  'src/lib/freeOCR.ts',
  'src/lib/smartPatterns.ts',
  'src/components/application/DocumentUpload.tsx'
];

console.log('📁 Checking document analysis files:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${file}: ${exists ? '❌ Still exists' : '✅ Removed'}`);
});

// Check if ApplicationWizard imports document analysis
const wizardPath = path.join(__dirname, 'src/pages/student/ApplicationWizard.tsx');
if (fs.existsSync(wizardPath)) {
  const content = fs.readFileSync(wizardPath, 'utf8');
  
  console.log('\n🔍 Checking ApplicationWizard imports:');
  const badImports = [
    'documentAI',
    'predictiveAnalytics',
    'DocumentUpload'
  ];
  
  badImports.forEach(imp => {
    const hasImport = content.includes(imp);
    console.log(`  ${imp}: ${hasImport ? '❌ Still imported' : '✅ Removed'}`);
  });
  
  console.log('\n🔍 Checking for document analysis usage:');
  const badUsages = [
    'analyzeUploadedDocument',
    'documentAnalysis',
    'predictionResult',
    'processingDocument'
  ];
  
  badUsages.forEach(usage => {
    const hasUsage = content.includes(usage);
    console.log(`  ${usage}: ${hasUsage ? '❌ Still used' : '✅ Removed'}`);
  });
}

// Test build
console.log('\n🏗️ Testing build...');
try {
  execSync('npm run build', { stdio: 'pipe', cwd: __dirname });
  console.log('✅ Build successful!');
} catch (error) {
  console.log('❌ Build failed:');
  console.log(error.stdout?.toString() || error.message);
}

// Test TypeScript compilation
console.log('\n📝 Testing TypeScript compilation...');
try {
  execSync('npm run type-check', { stdio: 'pipe', cwd: __dirname });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
}

console.log('\n✨ Test completed!');