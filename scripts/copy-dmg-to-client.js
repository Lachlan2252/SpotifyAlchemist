#!/usr/bin/env node

/**
 * Post-build script to copy .dmg files from dist-electron to client folder
 * This makes the .dmg files easily accessible for distribution
 */

const fs = require('fs');
const path = require('path');

const DIST_ELECTRON_DIR = path.join(__dirname, '..', 'dist-electron');
const CLIENT_DIR = path.join(__dirname, '..', 'client');

function copyDmgFiles() {
  console.log('🔍 Looking for .dmg files in dist-electron directory...');
  
  // Check if dist-electron directory exists
  if (!fs.existsSync(DIST_ELECTRON_DIR)) {
    console.log('ℹ️  dist-electron directory not found, skipping .dmg copy');
    return;
  }

  // Check if client directory exists
  if (!fs.existsSync(CLIENT_DIR)) {
    console.log('❌ client directory not found');
    process.exit(1);
  }

  // Find all .dmg files in dist-electron
  const files = fs.readdirSync(DIST_ELECTRON_DIR);
  const dmgFiles = files.filter(file => file.endsWith('.dmg'));

  if (dmgFiles.length === 0) {
    console.log('ℹ️  No .dmg files found in dist-electron directory');
    return;
  }

  console.log(`📦 Found ${dmgFiles.length} .dmg file(s):`);
  dmgFiles.forEach(file => console.log(`   - ${file}`));

  // Copy each .dmg file to client directory
  dmgFiles.forEach(file => {
    const sourcePath = path.join(DIST_ELECTRON_DIR, file);
    const targetPath = path.join(CLIENT_DIR, file);
    
    try {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied ${file} to client folder`);
    } catch (error) {
      console.error(`❌ Failed to copy ${file}:`, error.message);
      process.exit(1);
    }
  });

  console.log('🎉 Successfully copied all .dmg files to client folder for easy release!');
}

// Run the script
copyDmgFiles();