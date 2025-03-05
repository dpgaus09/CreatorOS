#!/bin/bash

# Print environment info
echo "Starting application deployment process..."
echo "Current directory: $(pwd)"
echo "Node environment: $NODE_ENV"
echo "Database URL available: $(if [ -n "$DATABASE_URL" ]; then echo "Yes"; else echo "No"; fi)"

# Verify build outputs exist
if [ ! -d "dist" ]; then
  echo "ERROR: dist directory not found. Build may have failed."
  exit 1
fi

if [ ! -d "dist/public" ]; then
  echo "ERROR: dist/public directory not found. Client build may have failed."
  ls -la dist/
  exit 1
fi

# Ensure server public directory exists and has content
mkdir -p server/public
echo "Copying client files to server/public if needed..."
cp -r dist/public/* server/public/ 2>/dev/null || true
ls -la server/public/

# Create uploads directory if it doesn't exist
mkdir -p uploads
chmod 777 uploads

# Run database migrations if needed
echo "Running database migrations..."
NODE_ENV=production npm run db:push

# Initialize database and verify connection
echo "Initializing database and verifying connection..."
node deploy-scripts/pre-start.js
if [ $? -ne 0 ]; then
  echo "ERROR: Database initialization failed. Check the logs for details."
  exit 1
fi

# Start the application
echo "Starting the application..."
NODE_ENV=production npm run start