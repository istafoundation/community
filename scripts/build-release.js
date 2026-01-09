#!/usr/bin/env node

/**
 * Build Release Script
 * --------------------
 * This script builds an Android release APK and renames it with the version number.
 * 
 * Usage: node scripts/build-release.js
 * 
 * Output: builds/ista-community-v1.0.0.apk
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const version = packageJson.version;

// Paths
const apkSourceDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release');
const apkSourceFile = path.join(apkSourceDir, 'app-release.apk');
const buildsDir = path.join(root, 'builds');
const outputFile = path.join(buildsDir, `ista-community-v${version}.apk`);

console.log('');
console.log('🚀 Building ISTA Community Release APK');
console.log(`   Version: ${version}`);
console.log('');

try {
  // Step 1: Run Expo Prebuild to regenerate native projects with updated version
  console.log('🔄 Running Expo Prebuild...');
  execSync('npx expo prebuild --clean', {
    cwd: root,
    stdio: 'inherit',
    shell: true
  });
  console.log('✅ Prebuild completed');
  console.log('');

  // Step 2: Run the Gradle build
  console.log('📦 Running Gradle assembleRelease...');
  execSync('gradlew.bat assembleRelease', {
    cwd: path.join(root, 'android'),
    stdio: 'inherit',
    shell: true
  });

  // Step 3: Create builds directory if it doesn't exist
  if (!fs.existsSync(buildsDir)) {
    fs.mkdirSync(buildsDir, { recursive: true });
    console.log('📁 Created builds/ directory');
  }

  // Step 4: Copy and rename the APK
  if (fs.existsSync(apkSourceFile)) {
    fs.copyFileSync(apkSourceFile, outputFile);
    
    const sizeInMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2);
    
    console.log('');
    console.log('✅ Build completed successfully!');
    console.log('');
    console.log('📱 APK Details:');
    console.log(`   File: builds/ista-community-v${version}.apk`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Path: ${outputFile}`);
    console.log('');
  } else {
    console.error('❌ APK file not found at expected location');
    console.error(`   Expected: ${apkSourceFile}`);
    process.exit(1);
  }
} catch (error) {
  console.error('');
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
