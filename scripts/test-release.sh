#!/bin/bash

# Script to test the release build locally
# This will create a DMG file for testing purposes

echo "🚀 Starting release build test..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf dist-electron

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the web app
echo "🔨 Building web app..."
npm run build

# Check if build succeeded
if [ ! -d "dist" ]; then
  echo "❌ Web app build failed!"
  exit 1
fi

echo "✅ Web app built successfully!"

# Note: DMG build will only work on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🍎 Building macOS app..."
  npm run electron:pack
  
  if [ -d "dist-electron" ]; then
    echo "✅ macOS app built successfully!"
    echo "📁 Build artifacts:"
    ls -la dist-electron/
    
    # Copy .dmg files to client folder for easy release
    echo "📦 Copying .dmg files to client folder..."
    node scripts/copy-dmg-to-client.js
  else
    echo "❌ macOS app build failed!"
    exit 1
  fi
else
  echo "⚠️  DMG build skipped - requires macOS"
  echo "💡 Use the GitHub Actions workflow to build on macOS"
fi

echo "🎉 Release build test completed!"