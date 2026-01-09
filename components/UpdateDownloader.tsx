import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import {
  documentDirectory,
  cacheDirectory,
  downloadAsync,
  createDownloadResumable,
  getContentUriAsync,
  deleteAsync,
  getInfoAsync,
} from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

interface UpdateDownloaderProps {
  visible: boolean;
  updateUrl: string;
  version: string;
  onClose: () => void;
}

export function UpdateDownloader({ visible, updateUrl, version, onClose }: UpdateDownloaderProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadUpdate = useCallback(async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Info', 'Direct download is only available on Android');
      return;
    }

    setDownloading(true);
    setProgress(0);
    setError(null);

    try {
      const fileName = `ista-community-v${version}.apk`;
      const fileUri = `${cacheDirectory}${fileName}`;
      
      // Delete existing file if it exists
      const fileInfo = await getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await deleteAsync(fileUri, { idempotent: true });
      }
      
      // Use createDownloadResumable for progress tracking
      const downloadResumable = createDownloadResumable(
        updateUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const percentComplete = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          setProgress(percentComplete > 0 ? percentComplete : 0);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result?.uri) {
        setDownloadedFileUri(result.uri);
        setDownloadComplete(true);
        setProgress(100);
      } else {
        throw new Error('Download failed - no URI returned');
      }
      
      setDownloading(false);
    } catch (err) {
      console.error('[UpdateDownloader] Download error:', err);
      setError(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDownloading(false);
    }
  }, [updateUrl, version]);

  const installUpdate = useCallback(async () => {
    if (!downloadedFileUri) {
      console.error('[UpdateDownloader] No downloaded file URI');
      return;
    }

    try {
      console.log('[UpdateDownloader] Getting content URI for:', downloadedFileUri);
      const contentUri = await getContentUriAsync(downloadedFileUri);
      console.log('[UpdateDownloader] Content URI:', contentUri);
      
      // Try using Linking.openURL first - this is more reliable on modern Android
      // The content URI with the proper MIME type should trigger the package installer
      console.log('[UpdateDownloader] Attempting to open APK via Linking...');
      
      // Try ACTION_INSTALL_PACKAGE intent first
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: contentUri,
          flags: 1 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
        });
        console.log('[UpdateDownloader] INSTALL_PACKAGE intent launched successfully');
        onClose();
        return;
      } catch (installErr) {
        console.log('[UpdateDownloader] INSTALL_PACKAGE failed, trying VIEW intent:', installErr);
      }

      // Fallback to ACTION_VIEW with package-archive MIME type
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
          type: 'application/vnd.android.package-archive',
        });
        console.log('[UpdateDownloader] VIEW intent launched successfully');
        onClose();
        return;
      } catch (viewErr) {
        console.log('[UpdateDownloader] VIEW intent also failed:', viewErr);
      }

      // Final fallback - try to open the file directly via Linking
      // Some Android versions support this
      try {
        const canOpen = await Linking.canOpenURL(contentUri);
        console.log('[UpdateDownloader] Can open content URI:', canOpen);
        if (canOpen) {
          await Linking.openURL(contentUri);
          onClose();
          return;
        }
      } catch (linkErr) {
        console.log('[UpdateDownloader] Linking also failed:', linkErr);
      }

      // If all methods fail, show permission help dialog
      Alert.alert(
        'Installation Permission Required',
        'To install updates, please enable "Install unknown apps" for ISTA Community in your device settings.\n\nGo to: Settings → Apps → ISTA Community → Install unknown apps → Allow',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: async () => {
              try {
                // Open app settings where user can grant the permission
                await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
                  data: 'package:com.istacommunity.mobile',
                });
              } catch {
                // Fallback to general app settings
                Linking.openSettings();
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('[UpdateDownloader] Install error:', err);
      Alert.alert(
        'Installation Error',
        'Could not open the installer. Would you like to open the download page in your browser instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Browser', 
            onPress: () => Linking.openURL('https://github.com/istafoundation/community/releases/latest')
          }
        ]
      );
    }
  }, [downloadedFileUri, onClose]);

  const openInBrowser = useCallback(() => {
    Linking.openURL('https://github.com/istafoundation/community/releases/latest');
    onClose();
  }, [onClose]);

  const handleClose = () => {
    if (!downloading) {
      setDownloadComplete(false);
      setProgress(0);
      setError(null);
      setDownloadedFileUri(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {downloadComplete ? '✅ Download Complete' : '⬇️ Download Update'}
          </Text>
          
          <Text style={styles.version}>Version {version}</Text>

          {error && (
            <Text style={styles.error}>{error}</Text>
          )}

          {downloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          <View style={styles.buttons}>
            {!downloading && !downloadComplete && (
              <>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadButton} onPress={downloadUpdate}>
                  <Text style={styles.downloadText}>Download</Text>
                </TouchableOpacity>
              </>
            )}

            {downloading && (
              <Text style={styles.downloadingText}>Downloading... Please wait</Text>
            )}

            {downloadComplete && (
              <>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelText}>Later</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.installButton} onPress={installUpdate}>
                  <Text style={styles.downloadText}>Install Now</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#3A3A3C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#30D158',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3A3A3C',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  installButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#30D158',
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  downloadingText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
