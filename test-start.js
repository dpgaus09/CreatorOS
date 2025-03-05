#!/usr/bin/env node

/**
 * Test script to validate start.js functionality
 */

console.log('🧪 Testing start.js script without actually starting the server');

// Import modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if start.js exists and is executable
try {
  const startPath = path.join(process.cwd(), 'start.js');
  const stats = fs.statSync(startPath);
  
  console.log(`✅ start.js exists: ${fs.existsSync(startPath)}`);
  console.log(`✅ start.js is executable: ${Boolean(stats.mode & fs.constants.S_IXUSR)}`);
  console.log(`✅ start.js size: ${stats.size} bytes`);
  
  // Check build artifacts
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.js');
  
  if (fs.existsSync(distPath)) {
    console.log(`✅ dist directory exists`);
    
    if (fs.existsSync(indexPath)) {
      const indexStats = fs.statSync(indexPath);
      console.log(`✅ dist/index.js exists and is ${indexStats.size} bytes`);
    } else {
      console.log(`❌ dist/index.js does not exist`);
    }
    
    // List files in dist directory
    console.log(`📋 Files in dist directory:`);
    fs.readdirSync(distPath).forEach(file => {
      console.log(`  - ${file} (${fs.statSync(path.join(distPath, file)).size} bytes)`);
    });
  } else {
    console.log(`❌ dist directory does not exist`);
  }
  
  // Check if package.json has the correct scripts
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`✅ package.json build script: ${packageJson.scripts.build}`);
    console.log(`✅ package.json start script: ${packageJson.scripts.start}`);
  }
  
  console.log('✅ Test completed successfully');
} catch (err) {
  console.error('❌ Test failed:', err);
  process.exit(1);
}