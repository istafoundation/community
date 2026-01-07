import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function ArticleScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${title}\n${url}`,
        url: url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[
        styles.header, 
        isDark && styles.headerDark,
        { paddingTop: insets.top || 10 }
      ]}>
        {/* Close Button */}
        <Pressable onPress={handleClose} style={styles.headerButton}>
          <Ionicons 
            name="close" 
            size={28} 
            color={isDark ? '#fff' : '#000'} 
          />
        </Pressable>

        {/* Title */}
        <Text 
          style={[styles.headerTitle, isDark && styles.headerTitleDark]} 
          numberOfLines={1}
        >
          {title || 'Article'}
        </Text>

        {/* Share Button */}
        <Pressable onPress={handleShare} style={styles.headerButton}>
          <Ionicons 
            name="share-outline" 
            size={24} 
            color={isDark ? '#fff' : '#000'} 
          />
        </Pressable>
      </View>

      {/* Progress Bar */}
      {loading && (
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${progress * 100}%` }
            ]} 
          />
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{ uri: url }}
        style={[styles.webview, isDark && styles.webviewDark]}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>Loading article...</Text>
          </View>
        )}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    backgroundColor: '#1c1c1e',
    borderBottomColor: '#333',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerTitleDark: {
    color: '#fff',
  },
  progressContainer: {
    height: 2,
    backgroundColor: '#e0e0e0',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webviewDark: {
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingTextDark: {
    color: '#aaa',
  },
});
