import { useEffect, useCallback, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Version Check Hook
 * ------------------
 * Checks if the app is up-to-date by comparing with a remote version config.
 * Returns state and controls for the UpdateDownloader component.
 * 
 * Setup:
 * 1. Host a JSON file at VERSION_CHECK_URL with this structure:
 *    {
 *      "latestVersion": "1.0.1",
 *      "minVersion": "1.0.0",
 *      "downloadUrl": "https://direct-link-to.apk",
 *      "updateUrl": "https://fallback-page-url",
 *      "forceUpdate": false,
 *      "updateMessage": "A new version is available!"
 *    }
 * 
 * 2. Use in your root layout:
 *    const { showDownloader, ... } = useVersionCheck();
 *    return (
 *      <>
 *        <UpdateDownloader visible={showDownloader} ... />
 *        ...
 *      </>
 *    );
 */

// Raw GitHub URL for version config file
const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/istafoundation/community/main/app-version.json';

interface VersionConfig {
  latestVersion: string;
  minVersion?: string;
  downloadUrl?: string; // Direct APK link for in-app download
  updateUrl: string;    // Fallback URL (releases page)
  forceUpdate?: boolean;
  updateMessage?: string;
}

/**
 * Compares two semantic version strings
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const cleanVersion = v.replace(/-.*$/, '');
    return cleanVersion.split('.').map(Number);
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }
  
  return 0;
}

export function useVersionCheck() {
  const [showDownloader, setShowDownloader] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    downloadUrl: string;
  } | null>(null);

  const checkVersion = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const response = await fetch(VERSION_CHECK_URL, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        return;
      }

      const config: VersionConfig = await response.json();
      const currentVersion = Constants.expoConfig?.version || '0.0.0';
      
      const isOutdated = compareVersions(currentVersion, config.latestVersion) < 0;
      const isBelowMinimum = config.minVersion 
        ? compareVersions(currentVersion, config.minVersion) < 0 
        : false;
      
      const shouldForceUpdate = config.forceUpdate || isBelowMinimum;

      if (isOutdated) {
        const message = config.updateMessage || 
          `A new version (${config.latestVersion}) is available. Please update for the best experience.`;
        
        // Check if we have a direct download URL for in-app download
        const hasDirectDownload = config.downloadUrl && Platform.OS === 'android';
        
        const buttons: Array<{ text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void }> = [];
        
        if (!shouldForceUpdate) {
          buttons.push({ text: 'Later', style: 'cancel' });
        }
        
        if (hasDirectDownload) {
          // Show in-app downloader
          buttons.push({
            text: 'Download',
            onPress: () => {
              setUpdateInfo({
                version: config.latestVersion,
                downloadUrl: config.downloadUrl!,
              });
              setShowDownloader(true);
            }
          });
        } else {
          // Fallback to browser
          buttons.push({
            text: 'Update Now',
            onPress: () => Linking.openURL(config.updateUrl)
          });
        }

        Alert.alert(
          shouldForceUpdate ? 'Update Required' : 'Update Available',
          message,
          buttons,
          { cancelable: !shouldForceUpdate }
        );
      }
    } catch (error) {
      // Silently fail - version check is not critical
    }
  }, []);

  const closeDownloader = useCallback(() => {
    setShowDownloader(false);
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  return { 
    checkVersion, 
    showDownloader, 
    closeDownloader,
    updateInfo,
  };
}
