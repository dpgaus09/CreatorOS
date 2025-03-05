#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Display Node.js version
echo "📦 Node.js version:"
node --version
npm --version

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building application..."
npm run build

# Database initialization script
echo "🗄️ Running database checks..."
node deploy-scripts/pre-start.js || true

echo "✅ Deploy script completed successfully!"