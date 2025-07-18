#!/bin/bash

# Script to build SpotifyAlchemist.dmg
# This script handles the complete build process for the macOS DMG

set -e  # Exit on any error

echo "🚀 Starting DMG build process..."

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

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ DMG build requires macOS"
  exit 1
fi

# Build macOS app and DMG
echo "🍎 Building macOS app and DMG..."
npm run electron:pack

# Check if electron build succeeded
if [ ! -d "dist-electron" ]; then
  echo "❌ macOS app build failed!"
  exit 1
fi

echo "✅ macOS app built successfully!"

# List build artifacts
echo "📁 Build artifacts in dist-electron:"
ls -la dist-electron/

# Find DMG files
DMG_FILES=$(find dist-electron -name "*.dmg" -type f)
if [ -z "$DMG_FILES" ]; then
  echo "❌ No DMG files found in dist-electron!"
  exit 1
fi

echo "📦 Found DMG files:"
echo "$DMG_FILES"

# Ensure client directory exists (idempotent)
echo "📁 Ensuring client directory exists..."
mkdir -p client

# Copy DMG files to client folder using the existing script
echo "📦 Copying DMG files to client folder..."
node scripts/copy-dmg-to-client.js

# Verify DMG files were copied
if ls client/*.dmg 1> /dev/null 2>&1; then
  echo "✅ DMG files successfully copied to client folder:"
  ls -la client/*.dmg
else
  echo "❌ No DMG files found in client folder after copy!"
  exit 1
fi

echo "🎉 DMG build process completed successfully!"
echo "📦 DMG files are ready in the client/ directory"