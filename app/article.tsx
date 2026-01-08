import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

// Ad blocker script to inject into WebView
const AD_BLOCKER_SCRIPT = `
(function() {
  // Common ad-related selectors to hide/remove
  const adSelectors = [
    // Google Ads
    'ins.adsbygoogle',
    '[id^="google_ads"]',
    '[id^="div-gpt-ad"]',
    '[class*="google-ad"]',
    '[class*="googleAd"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication"]',
    
    // Common ad containers
    '[class*="ad-container"]',
    '[class*="ad-wrapper"]',
    '[class*="ad-banner"]',
    '[class*="ad-slot"]',
    '[class*="advertisement"]',
    '[id*="ad-container"]',
    '[id*="ad-wrapper"]',
    '[id*="advertisement"]',
    '[data-ad]',
    '[data-ad-slot]',
    '[data-google-query-id]',
    
    // Sponsored content
    '[class*="sponsored"]',
    '[id*="sponsored"]',
    
    // Popups and overlays
    '[class*="popup-ad"]',
    '[class*="modal-ad"]',
    '[class*="overlay-ad"]',
    
    // Social tracking
    'iframe[src*="facebook.com/plugins"]',
    'iframe[src*="platform.twitter.com"]',
    
    // Common ad networks
    'iframe[src*="taboola"]',
    'iframe[src*="outbrain"]',
    'iframe[src*="mgid"]',
    'iframe[src*="revcontent"]',
    '[class*="taboola"]',
    '[class*="outbrain"]',
    '[id*="taboola"]',
    '[id*="outbrain"]',
    
    // Generic ad patterns
    '.ad', '.ads', '.advert',
    '#ad', '#ads', '#advert',
    '[aria-label*="advertisement"]',
    '[aria-label*="Advertisement"]',
    
    // Sticky ads
    '[class*="sticky-ad"]',
    '[class*="fixed-ad"]',
    '[class*="bottom-ad"]',
    '[class*="top-ad"]',
  ];

  // CSS to hide ads
  const adBlockerCSS = adSelectors.map(selector => 
    selector + ' { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; overflow: hidden !important; }'
  ).join('\\n');

  // CSS to force light mode and apply reader-friendly styling
  const readerModeCSS = \`
    /* Force light mode */
    :root {
      color-scheme: light only !important;
    }
    
    /* Hide website navigation and chrome */
    header, nav, .header, .nav, .navbar, .navigation,
    .site-header, .page-header, .top-bar, .top-header,
    footer, .footer, .site-footer, .page-footer,
    .sidebar, .side-bar, aside,
    .cookie-banner, .cookie-notice, .gdpr,
    .newsletter, .subscribe-box, .subscription,
    .social-share, .share-buttons, .social-buttons,
    .related-posts, .related-articles, .recommended,
    .comments, .comment-section, #comments,
    .breadcrumb, .breadcrumbs,
    [class*="menu"], [class*="Menu"],
    [class*="banner"], [class*="Banner"],
    [class*="popup"], [class*="modal"],
    .floating-button, .fab, .back-to-top {
      display: none !important;
    }
    
    /* Clean body styling */
    html, body {
      background-color: #ffffff !important;
      color: #1a1a1a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.7 !important;
      font-size: 17px !important;
      -webkit-font-smoothing: antialiased !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    /* Content container styling */
    body > *, main, article, .content, .article, .post, .entry-content {
      max-width: 100% !important;
      padding-left: 16px !important;
      padding-right: 16px !important;
      box-sizing: border-box !important;
    }
    
    /* Typography improvements */
    h1, h2, h3, h4, h5, h6 {
      color: #000000 !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      margin-top: 24px !important;
      margin-bottom: 12px !important;
    }
    
    h1 { font-size: 26px !important; }
    h2 { font-size: 22px !important; }
    h3 { font-size: 19px !important; }
    
    p {
      color: #333333 !important;
      margin-bottom: 16px !important;
      font-size: 17px !important;
    }
    
    /* Link styling */
    a {
      color: #007AFF !important;
      text-decoration: none !important;
    }
    
    /* Image styling */
    img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 8px !important;
      margin: 16px 0 !important;
    }
    
    /* Code blocks */
    pre, code {
      background-color: #f5f5f5 !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      padding: 4px 8px !important;
    }
    
    pre {
      padding: 16px !important;
      overflow-x: auto !important;
    }
    
    /* Lists */
    ul, ol {
      padding-left: 24px !important;
      margin-bottom: 16px !important;
    }
    
    li {
      margin-bottom: 8px !important;
      color: #333333 !important;
    }
    
    /* Blockquotes */
    blockquote {
      border-left: 4px solid #007AFF !important;
      margin: 16px 0 !important;
      padding: 12px 16px !important;
      background-color: #f8f9fa !important;
      border-radius: 0 8px 8px 0 !important;
      font-style: italic !important;
    }
    
    /* Remove fixed/sticky elements */
    [style*="position: fixed"],
    [style*="position:fixed"],
    [style*="position: sticky"],
    [style*="position:sticky"] {
      position: relative !important;
    }
    
    /* Fade-in animation */
    body {
      opacity: 0;
      animation: fadeInContent 0.3s ease-out 0.1s forwards;
    }
    
    @keyframes fadeInContent {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Override dark mode media query */
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: light only !important;
      }
      html, body {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }
    }
  \`;

  // Inject CSS
  const style = document.createElement('style');
  style.type = 'text/css';
  style.id = 'ad-blocker-styles';
  style.textContent = adBlockerCSS + readerModeCSS;
  document.head.appendChild(style);
  
  // Force light color scheme on meta tag
  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', 'light');
  } else {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.setAttribute('name', 'color-scheme');
    colorSchemeMeta.setAttribute('content', 'light');
    document.head.appendChild(colorSchemeMeta);
  }

  // Function to remove ad elements
  function removeAds() {
    adSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      } catch (e) {}
    });
    
    // Remove suspicious iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src || '';
      if (
        src.includes('ad') ||
        src.includes('doubleclick') ||
        src.includes('googlesyndication') ||
        src.includes('taboola') ||
        src.includes('outbrain') ||
        src.includes('amazon-adsystem')
      ) {
        iframe.remove();
      }
    });
  }

  // Run immediately
  removeAds();

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAds);
  }

  // Watch for dynamically added ads
  const observer = new MutationObserver((mutations) => {
    let shouldClean = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldClean = true;
      }
    });
    if (shouldClean) {
      removeAds();
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Block ad scripts from loading
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    const element = originalCreateElement(tagName);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          const blockedDomains = [
            'googlesyndication.com',
            'doubleclick.net',
            'googleadservices.com',
            'adservice.google',
            'pagead2.googlesyndication.com',
            'taboola.com',
            'outbrain.com',
            'amazon-adsystem.com',
            'mgid.com',
            'revcontent.com'
          ];
          if (blockedDomains.some(domain => value.includes(domain))) {
            return;
          }
        }
        return originalSetAttribute(name, value);
      };
    }
    return element;
  };

  console.log('[AdBlocker] Ad blocking active');
  true;
})();
`;

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
        injectedJavaScriptBeforeContentLoaded={AD_BLOCKER_SCRIPT}
        injectedJavaScript={AD_BLOCKER_SCRIPT}
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
