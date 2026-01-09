#!/usr/bin/env node

/**
 * Sync Version Script
 * -------------------
 * This script syncs the version from package.json to app.json and app-version.json
 * and auto-increments the Android versionCode.
 * 
 * It's automatically called when you run version bump scripts.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packageJsonPath = path.join(root, 'package.json');
const appJsonPath = path.join(root, 'app.json');
const appVersionPath = path.join(root, 'app-version.json');

// GitHub repo info for generating download URL
const GITHUB_REPO = 'istafoundation/community';
const APK_NAME = 'ista-community';

// Read files
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Get the new version
const newVersion = packageJson.version;

// Update app.json version
appJson.expo.version = newVersion;

// Auto-increment Android versionCode
appJson.expo.android = appJson.expo.android || {};
const currentVersionCode = appJson.expo.android.versionCode || 1;
appJson.expo.android.versionCode = currentVersionCode + 1;

// Write back to app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// Update app-version.json (for version check)
if (fs.existsSync(appVersionPath)) {
  const appVersionConfig = JSON.parse(fs.readFileSync(appVersionPath, 'utf8'));
  appVersionConfig.latestVersion = newVersion;
  
  // Auto-generate downloadUrl for in-app updates
  // Format: https://github.com/{repo}/releases/download/v{version}/{apk-name}-v{version}.apk
  appVersionConfig.downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${newVersion}/${APK_NAME}-v${newVersion}.apk`;
  
  fs.writeFileSync(appVersionPath, JSON.stringify(appVersionConfig, null, 2) + '\n');
}

console.log('');
console.log('✅ Version synced successfully!');
console.log(`   📦 Version: ${newVersion}`);
console.log(`   🔢 Android versionCode: ${appJson.expo.android.versionCode}`);
console.log(`   📡 app-version.json updated`);
console.log(`   🔗 downloadUrl: https://github.com/${GITHUB_REPO}/releases/download/v${newVersion}/${APK_NAME}-v${newVersion}.apk`);
console.log('');
