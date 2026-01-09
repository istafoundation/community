import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Paths, File } from 'expo-file-system';
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
  const [downloadedFile, setDownloadedFile] = useState<File | null>(null);
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
      const file = new File(Paths.cache, fileName);
      
      // Delete existing file if it exists
      if (file.exists) {
        file.delete();
      }

      // Fetch with progress tracking
      const response = await fetch(updateUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        received += value.length;
        
        if (total > 0) {
          setProgress(Math.round((received / total) * 100));
        }
      }

      // Combine chunks and write to file
      const blob = new Blob(chunks as BlobPart[], { type: 'application/vnd.android.package-archive' });
      const arrayBuffer = await blob.arrayBuffer();
      
      file.create();
      file.write(new Uint8Array(arrayBuffer));

      setDownloadedFile(file);
      setDownloadComplete(true);
      setDownloading(false);
    } catch (err) {
      console.error('[UpdateDownloader] Error:', err);
      setError('Download failed. Please try again or download from browser.');
      setDownloading(false);
    }
  }, [updateUrl, version]);

  const installUpdate = useCallback(async () => {
    if (!downloadedFile) return;

    try {
      // Launch Android's package installer
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: downloadedFile.uri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
      
      onClose();
    } catch (err) {
      Alert.alert(
        'Installation Error',
        'Could not open the installer. Please install manually from your Downloads folder.',
        [{ text: 'OK' }]
      );
      console.error('[UpdateDownloader] Install error:', err);
    }
  }, [downloadedFile, onClose]);

  const handleClose = () => {
    if (!downloading) {
      setDownloadComplete(false);
      setProgress(0);
      setError(null);
      setDownloadedFile(null);
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
