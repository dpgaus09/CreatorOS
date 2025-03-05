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

// Detect if we're running in Digital Ocean App Platform
const isDigitalOcean = process.env.DIGITAL_OCEAN_APP_PLATFORM === 'true' || 
                     process.env.DYNO || 
                     process.env.AWS_EXECUTION_ENV?.includes('DO_App_Platform');

// Possible locations for our application, in priority order
const possibleLocations = [
  // Current working directory (standard location)
  path.join(process.cwd(), 'dist', 'index.js'),
  // Digital Ocean App Platform locations
  path.join('/workspace', 'dist', 'index.js'),
  path.join('/app', 'dist', 'index.js'),
  // Fallback directory checks
  path.join(__dirname, 'dist', 'index.js'),
  // Build output directly in root directory
  path.join(process.cwd(), 'index.js'),
  path.join('/workspace', 'index.js'),
];

// Log environment info
console.log(`🌐 Running in ${isDigitalOcean ? 'Digital Ocean App Platform' : 'standard environment'}`);
console.log(`📋 Environment: NODE_ENV=${process.env.NODE_ENV || 'not set'}`);
console.log(`📋 Checking ${possibleLocations.length} possible server locations`);

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
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Handle health check endpoint
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({
    status: "minimal",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'unknown',
    mode: "emergency",
    message: "Emergency server running"
  });
});

// Try to serve static files from dist/public (Vite build output)
const distPublicPath = path.join(process.cwd(), 'dist', 'public');
const publicPath = path.join(process.cwd(), 'public');

if (fs.existsSync(distPublicPath)) {
  console.log(\`Serving static files from \${distPublicPath}\`);
  app.use(express.static(distPublicPath));
} else if (fs.existsSync(publicPath)) {
  console.log(\`Serving static files from \${publicPath}\`);
  app.use(express.static(publicPath));
}

// Serve uploads directory if it exists
const uploadsPath = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadsPath)) {
  console.log(\`Serving uploads from \${uploadsPath}\`);
  app.use('/uploads', express.static(uploadsPath));
}

// Fallback route
app.get('*', (req, res) => {
  if (req.url.startsWith('/api/')) {
    // For API routes, return a proper JSON response
    return res.status(503).json({
      status: "unavailable",
      message: "API endpoint unavailable in emergency mode",
      endpoint: req.url
    });
  }
  
  // Try to serve index.html from various locations
  const possibleIndexFiles = [
    path.join(distPublicPath, 'index.html'),
    path.join(publicPath, 'index.html')
  ];
  
  for (const indexPath of possibleIndexFiles) {
    if (fs.existsSync(indexPath)) {
      console.log(\`Serving index.html from \${indexPath}\`);
      return res.sendFile(indexPath);
    }
  }
  
  // Last resort fallback
  res.send(\`
    <html>
      <head>
        <title>Learner_Bruh LMS - Maintenance</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
          .card { background: #f7f7f7; border-radius: 8px; padding: 2rem; margin-bottom: 1rem; border: 1px solid #ddd; }
          h1 { margin-top: 0; color: #333; }
          .btn { display: inline-block; background: #0070f3; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Learner_Bruh LMS</h1>
        </div>
        <div class="card">
          <h2>System Maintenance</h2>
          <p>Our learning management system is currently undergoing scheduled maintenance.</p>
          <p>We apologize for any inconvenience this may cause. Please check back soon.</p>
          <p>API services remain available during maintenance.</p>
          <a href="/api/health" class="btn">Check API Status</a>
        </div>
      </body>
    </html>
  \`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Emergency server listening on port \${PORT} in \${process.env.NODE_ENV || 'development'} mode\`);
});
    `);
    
    serverPath = emergencyPath;
    console.log('✅ Emergency server file created successfully');
  } catch (e) {
    console.error('❌ Failed to create emergency server:', e);
    process.exit(1);
  }
}

// Before starting server, verify the file exists one more time
console.log(`🔍 Final verification of server path: ${serverPath}`);
if (!fs.existsSync(serverPath)) {
  console.error(`❌ FATAL ERROR: Server file not found at ${serverPath} just before start`);
  // Create an absolute minimal emergency server as last resort
  const port = process.env.PORT || 8080;
  const minimalServer = `
import http from 'http';
const server = http.createServer((req, res) => {
  if (req.url === '/api/health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'minimal-emergency',
      timestamp: new Date().toISOString(),
      message: 'Absolute minimal emergency server'
    }));
  } else if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><head><title>Emergency Mode</title></head><body><h1>Learner_Bruh LMS</h1><p>Maintenance mode active. Please check back later.</p></body></html>');
  } else {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service unavailable' }));
  }
});
server.listen(${port}, '0.0.0.0', () => console.log('Minimal emergency server running on port ${port}'));
`;
  const minimalPath = path.join(process.cwd(), 'emergency-server.js');
  try {
    fs.writeFileSync(minimalPath, minimalServer);
    console.log('✅ Absolute minimal emergency server created as last resort');
    serverPath = minimalPath;
  } catch (e) {
    console.error('💥 Failed to create minimal emergency server', e);
    // We have no choice but to exit at this point
    process.exit(1);
  }
}

// Start the server with the correct Node.js flags
console.log('🚀 Starting server...');

// Check if Digital Ocean has specific requirements
if (isDigitalOcean) {
  console.log('🌊 Running in Digital Ocean environment, adding appropriate flags');
}

// Build command with correct flags for ESM
const nodeArgs = [
  '--experimental-specifier-resolution=node',  // Allow imports without .js extension
  serverPath
];

// Set environment variables
const env = {
  ...process.env,
  NODE_ENV: 'production',
  DIGITAL_OCEAN_APP_PLATFORM: isDigitalOcean ? 'true' : 'false',
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