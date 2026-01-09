const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidSigning = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const keystoreSrc = path.join(projectRoot, 'certs', 'release.keystore');
      const keystoreDest = path.join(projectRoot, 'android', 'app', 'release.keystore');

      if (fs.existsSync(keystoreSrc)) {
        fs.copyFileSync(keystoreSrc, keystoreDest);
        console.log('✅ Copied release.keystore to android/app/');
      } else {
        console.warn('⚠️  release.keystore not found in certs/ directory');
      }
      return config;
    },
  ]);

  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addSigningConfig(config.modResults.contents);
    } else {
      console.warn('⚠️  Cannot modify build.gradle because it is not Groovy');
    }
    return config;
  });
};

function addSigningConfig(buildGradle) {
  if (buildGradle.includes('signingConfigs {')) {
     if (buildGradle.includes('storeFile file(\'release.keystore\')')) {
        return buildGradle;
     }
  }

  // Add the signing config if it doesn't exist
  // We'll insert it into the android block
  
  const signingConfig = `
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'android'
            keyAlias 'istacommunity'
            keyPassword 'android'
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
  `;

  // Insert signing config before buildTypes
  let newGradle = buildGradle.replace('buildTypes {', `${signingConfig}\n    buildTypes {`);
  
  // Update release build type to use the signing config
  newGradle = newGradle.replace(
      /signingConfig signingConfigs.debug/g,
      'signingConfig signingConfigs.release'
  );
  
    // Fallback if regex didn't match standard template (ensure release uses release signing)
   if (!newGradle.includes('signingConfig signingConfigs.release')) {
      newGradle = newGradle.replace(
          /buildTypes\s*\{\s*release\s*\{/,
          'buildTypes {\n        release {\n            signingConfig signingConfigs.release'
      );
   }

  return newGradle;
}

module.exports = withAndroidSigning;
