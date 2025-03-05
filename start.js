#!/usr/bin/env node

/**
 * Production server starter script for Learner_Bruh LMS
 * This script handles starting the application in production environments like DigitalOcean
 */

// Check and report environment
console.log('🚀 Starting Learner_Bruh LMS in production mode');
console.log(`📋 Node.js version: ${process.version}`);
console.log(`📋 Working directory: ${process.cwd()}`);
console.log(`📋 Environment vars: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT || 'not set'}`);
console.log(`📋 Database URL present: ${Boolean(process.env.DATABASE_URL)}`);

// Check for dist/index.js in various locations
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

// Get current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Possible locations for our application
const possibleLocations = [
  path.join(process.cwd(), 'dist', 'index.js'),
  path.join('/workspace', 'dist', 'index.js'),
  path.join('/app', 'dist', 'index.js'),
];

// Find valid location
let serverPath = null;
for (const location of possibleLocations) {
  try {
    if (fs.existsSync(location)) {
      serverPath = location;
      console.log(`✅ Found server file at: ${location}`);
      break;
    }
  } catch (e) {
    // Ignore errors
  }
}

// If no server file found, run the build
if (!serverPath) {
  console.log('⚠️ Server file not found in any expected location, attempting to build...');
  
  try {
    console.log('📦 Running build process...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Check if build succeeded
    for (const location of possibleLocations) {
      try {
        if (fs.existsSync(location)) {
          serverPath = location;
          console.log(`✅ Build succeeded, server file created at: ${location}`);
          break;
        }
      } catch (e) {
        // Ignore errors
      }
    }
  } catch (e) {
    console.error('❌ Build process failed:', e);
  }
}

// If still no server file, create an emergency one
if (!serverPath) {
  console.log('🚨 Server file still not found, creating emergency server...');
  
  const emergencyPath = path.join(process.cwd(), 'dist', 'index.js');
  const emergencyDir = path.dirname(emergencyPath);
  
  try {
    if (!fs.existsSync(emergencyDir)) {
      fs.mkdirSync(emergencyDir, { recursive: true });
    }
    
    // Create a simple Express server that at least responds to health checks
    fs.writeFileSync(emergencyPath, `
import express from 'express';
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'minimal',
    message: 'Emergency server running - build process failed',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req, res) => {
  res.send(\`
    <html>
      <head><title>Learner_Bruh LMS - Maintenance</title></head>
      <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
        <h1>Learner_Bruh LMS</h1>
        <p>The application is currently in maintenance mode.</p>
        <p>Please check back soon.</p>
      </body>
    </html>
  \`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Emergency server listening on port \${PORT}\`);
});
    `);
    
    serverPath = emergencyPath;
    console.log('✅ Emergency server file created successfully');
  } catch (e) {
    console.error('❌ Failed to create emergency server:', e);
    process.exit(1);
  }
}

// Start the server with the correct Node.js flags
console.log('🚀 Starting server...');

// Build command with correct flags for ESM
const nodeArgs = [
  '--experimental-specifier-resolution=node',  // Allow imports without .js extension
  serverPath
];

// Set environment variables
const env = {
  ...process.env,
  NODE_ENV: 'production',
};

// Start the server process
const serverProcess = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env
});

// Handle process events
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server process:', err);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Server process exited with code ${code} and signal ${signal}`);
    process.exit(code || 1);
  }
});

// Forward signals to child process
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => {
    console.log(`📌 Received ${signal}, forwarding to server process`);
    serverProcess.kill(signal);
  });
});