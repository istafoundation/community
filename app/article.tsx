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

// Comprehensive Ad Blocker Script for WebView
// This script blocks ads at multiple levels: CSS hiding, DOM removal, and script blocking
const AD_BLOCKER_SCRIPT = `
(function() {
  'use strict';
  
  // ============================================
  // COMPREHENSIVE AD SELECTOR LIST (200+ selectors)
  // ============================================
  const adSelectors = [
    // === Google Ads ===
    'ins.adsbygoogle', '.adsbygoogle', '[data-ad-client]', '[data-ad-slot]',
    '[id^="google_ads"]', '[id^="div-gpt-ad"]', '[id*="google_ads"]',
    '[class*="google-ad"]', '[class*="googleAd"]', '[class*="GoogleAd"]',
    'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="googleads"]', 'iframe[src*="google.com/ads"]',
    '[data-google-query-id]', '[data-ad-layout]', '[data-ad-format]',
    '.google-auto-placed', 'div[data-google-container-id]',
    
    // === Common Ad Containers ===
    '[class*="ad-container"]', '[class*="ad_container"]',
    '[class*="ad-wrapper"]', '[class*="ad_wrapper"]',
    '[class*="ad-banner"]', '[class*="ad_banner"]',
    '[class*="ad-slot"]', '[class*="ad_slot"]',
    '[class*="ad-unit"]', '[class*="ad_unit"]',
    '[class*="ad-block"]', '[class*="ad_block"]',
    '[class*="ad-holder"]', '[class*="ad_holder"]',
    '[class*="ad-space"]', '[class*="ad_space"]',
    '[class*="ad-placement"]', '[class*="ad_placement"]',
    '[class*="ad-content"]', '[class*="ad_content"]',
    '[class*="ad-module"]', '[class*="ad_module"]',
    '[class*="advertisement"]', '[class*="Advertisement"]',
    '[class*="advertorial"]', '[class*="Advertorial"]',
    '[id*="ad-container"]', '[id*="ad_container"]',
    '[id*="ad-wrapper"]', '[id*="ad_wrapper"]',
    '[id*="advertisement"]', '[id*="Advertisement"]',
    '[id*="ad-slot"]', '[id*="ad_slot"]',
    '[id*="ad-banner"]', '[id*="ad_banner"]',
    '[data-ad]', '[data-ad-slot]', '[data-ads]',
    '[data-ad-unit]', '[data-ad-name]', '[data-ad-id]',
    
    // === Taboola, Outbrain, and Content Recommendation ===
    '[class*="taboola"]', '[class*="Taboola"]', '[id*="taboola"]',
    '[class*="outbrain"]', '[class*="Outbrain"]', '[id*="outbrain"]',
    'iframe[src*="taboola"]', 'iframe[src*="outbrain"]',
    '.OUTBRAIN', '#OUTBRAIN', '.ob-widget', '.ob-smartfeed',
    '.trc_rbox', '.trc_related_container', '.trc-content-sponsored',
    '[class*="content-recommendation"]', '[class*="recommended-content"]',
    '[class*="more-stories"]', '[class*="around-the-web"]',
    '[class*="from-the-web"]', '[class*="promoted-content"]',
    '[class*="sponsored-stories"]', '[class*="partner-content"]',
    
    // === MGID, RevContent, Nativo, and other networks ===
    '[class*="mgid"]', '[id*="mgid"]', 'iframe[src*="mgid"]',
    '[class*="revcontent"]', '[id*="revcontent"]', 'iframe[src*="revcontent"]',
    '[class*="nativo"]', '[id*="nativo"]', 'iframe[src*="nativo"]',
    '[class*="zergnet"]', 'iframe[src*="zergnet"]',
    '[class*="criteo"]', 'iframe[src*="criteo"]',
    '[class*="teads"]', 'iframe[src*="teads"]',
    '[class*="pubmatic"]', 'iframe[src*="pubmatic"]',
    '[class*="openx"]', 'iframe[src*="openx"]',
    '[class*="rubicon"]', 'iframe[src*="rubiconproject"]',
    '[class*="appnexus"]', 'iframe[src*="appnexus"]',
    '[class*="amazon-adsystem"]', 'iframe[src*="amazon-adsystem"]',
    '[class*="media.net"]', 'iframe[src*="media.net"]',
    '[class*="adnxs"]', 'iframe[src*="adnxs"]',
    
    // === Sponsored Content ===
    '[class*="sponsored"]', '[class*="Sponsored"]', '[id*="sponsored"]',
    '[data-sponsored]', '[data-is-sponsored]',
    '[class*="paid-content"]', '[class*="paid-post"]',
    '[class*="native-ad"]', '[class*="nativeAd"]',
    '[class*="partner-post"]', '[class*="branded-content"]',
    
    // === Popups, Modals, and Overlays ===
    '[class*="popup-ad"]', '[class*="modal-ad"]', '[class*="overlay-ad"]',
    '[class*="interstitial"]', '[class*="Interstitial"]',
    '[class*="splash-ad"]', '[class*="splash-screen-ad"]',
    '[class*="lightbox-ad"]', '[class*="floating-ad"]',
    '[class*="hover-ad"]', '[class*="slide-ad"]',
    '[class*="exit-intent"]', '[class*="exit-popup"]',
    
    // === Sticky and Fixed Ads ===
    '[class*="sticky-ad"]', '[class*="stickyAd"]',
    '[class*="fixed-ad"]', '[class*="fixedAd"]',
    '[class*="bottom-ad"]', '[class*="bottomAd"]',
    '[class*="top-ad"]', '[class*="topAd"]',
    '[class*="sidebar-ad"]', '[class*="sidebarAd"]',
    '[class*="rail-ad"]', '[class*="sky-ad"]', '[class*="skyscraper"]',
    '[class*="leaderboard"]', '[class*="billboard"]',
    '[class*="anchor-ad"]', '[class*="docked-ad"]',
    
    // === Generic Patterns ===
    '.ad', '.ads', '.advert', '.adverts',
    '#ad', '#ads', '#advert', '#adverts',
    '.Ad', '.Ads', '.Advert',
    '[aria-label*="advertisement"]', '[aria-label*="Advertisement"]',
    '[aria-label*="sponsored"]', '[aria-label*="Sponsored"]',
    
    // === Social & Tracking Widgets ===
    'iframe[src*="facebook.com/plugins"]',
    'iframe[src*="platform.twitter.com"]',
    'iframe[src*="platform.instagram.com"]',
    '[class*="fb-ad"]', '[class*="twitter-ad"]',
    
    // === Video Ads ===
    '[class*="video-ad"]', '[class*="videoAd"]', '[class*="preroll"]',
    '[class*="midroll"]', '[class*="postroll"]',
    '[class*="video-sponsor"]', '[class*="ad-overlay"]',
    
    // === Newsletter & Subscription Prompts (often annoying) ===
    '[class*="newsletter-popup"]', '[class*="subscribe-popup"]',
    '[class*="newsletter-modal"]', '[class*="subscription-modal"]',
    '[class*="email-capture"]', '[class*="signup-prompt"]',
    
    // === Paywall Bypassing ===
    '[class*="paywall"]', '[class*="Paywall"]', '[id*="paywall"]',
    '[class*="subscriber-only"]', '[class*="premium-content-gate"]',
    '[class*="registration-wall"]', '[class*="regwall"]',
    '[class*="piano-"]', '[id*="piano-"]',
    '.tp-modal', '.tp-backdrop', '[class*="tp-container"]',
    '[class*="offer-page"]', '[class*="subscription-required"]',
    
    // === Cookie Banners & Consent (often block content) ===
    '[class*="cookie-banner"]', '[class*="cookie-consent"]',
    '[class*="cookie-notice"]', '[class*="gdpr"]', '[class*="GDPR"]',
    '[class*="consent-banner"]', '[class*="consent-modal"]',
    '[class*="privacy-banner"]', '[class*="privacy-notice"]',
    '[id*="cookie"]', '[id*="consent"]', '[id*="gdpr"]',
    '#onetrust-consent-sdk', '.onetrust-pc-dark-filter',
    '[class*="sp_message"]', '[class*="cmp-"]',
    
    // === News Site Specific ===
    '[class*="breaking-news-bar"]', '[class*="ticker"]',
    '[class*="promo-bar"]', '[class*="alert-bar"]',
    '[class*="app-download"]', '[class*="download-app"]',
  ];

  // ============================================
  // BLOCKED DOMAINS (for script/resource blocking)
  // ============================================
  const blockedDomains = [
    // Google Ads
    'googlesyndication.com', 'doubleclick.net', 'googleadservices.com',
    'adservice.google.com', 'pagead2.googlesyndication.com',
    'googletagservices.com', 'securepubads.g.doubleclick.net',
    'adx.g.doubleclick.net', 'www.googletagmanager.com',
    
    // Major Ad Networks
    'taboola.com', 'outbrain.com', 'outbrainimg.com',
    'amazon-adsystem.com', 'media.net', 'mgid.com', 'revcontent.com',
    'criteo.com', 'criteo.net', 'teads.tv',
    'pubmatic.com', 'openx.net', 'rubiconproject.com',
    'appnexus.com', 'adnxs.com', 'contextweb.com',
    'advertising.com', 'casalemedia.com', 'lijit.com',
    'sharethrough.com', 'triplelift.com', 'spotxchange.com',
    'gumgum.com', 'nativo.com', 'zergnet.com',
    
    // Tracking & Analytics (often loads ads)
    'facebook.net/en_US/fbevents.js', 'connect.facebook.net',
    'hotjar.com', 'mouseflow.com', 'fullstory.com',
    'quantserve.com', 'scorecardresearch.com',
    'chartbeat.com', 'newrelic.com', 'nr-data.net',
    
    // Paywall/Subscription Services
    'piano.io', 'tinypass.com', 'pelcro.com',
    
    // Other annoying services
    'onesignal.com', 'pushwoosh.com', 'pushengage.com',
    'cleverpush.com', 'webpush.com',
  ];

  // ============================================
  // CSS FOR AD BLOCKING & READER MODE
  // ============================================
  const adBlockerCSS = adSelectors.map(selector => 
    selector + ' { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; width: 0 !important; max-width: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; z-index: -9999 !important; }'
  ).join('\\n');

  // Reader mode CSS for clean article viewing
  const readerModeCSS = \`
    /* Force light mode */
    :root {
      color-scheme: light only !important;
    }
    
    /* Hide website navigation and chrome */
    header:not(article header), nav, .header, .nav, .navbar, .navigation,
    .site-header, .page-header, .top-bar, .top-header,
    footer, .footer, .site-footer, .page-footer,
    .sidebar:not(.article-sidebar), .side-bar, aside:not(article aside),
    .cookie-banner, .cookie-notice, .gdpr,
    .newsletter, .subscribe-box, .subscription,
    .social-share, .share-buttons, .social-buttons,
    .related-posts, .related-articles, .recommended,
    .comments, .comment-section, #comments, #disqus_thread,
    .breadcrumb, .breadcrumbs,
    [class*="menu"]:not(article [class*="menu"]), 
    [class*="Menu"]:not(article [class*="Menu"]),
    [class*="banner"]:not(img[class*="banner"]), 
    [class*="Banner"]:not(img[class*="Banner"]),
    [class*="popup"], [class*="modal"],
    .floating-button, .fab, .back-to-top,
    [class*="app-promo"], [class*="download-app"],
    [class*="engagement-"], [class*="recirculation"],
    [class*="more-from"], [class*="trending"],
    [role="banner"], [role="navigation"], [role="complementary"],
    .site-branding, .masthead, .utility-nav {
      display: none !important;
    }
    
    /* Clean body styling */
    html, body {
      background-color: #ffffff !important;
      color: #1a1a1a !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      line-height: 1.75 !important;
      font-size: 18px !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow-x: hidden !important;
    }
    
    /* Content container styling */
    body > *, main, article, .content, .article, .post, .entry-content,
    [class*="article-body"], [class*="story-body"], [class*="post-content"] {
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
      margin-top: 28px !important;
      margin-bottom: 14px !important;
    }
    
    h1 { font-size: 28px !important; }
    h2 { font-size: 24px !important; }
    h3 { font-size: 20px !important; }
    h4 { font-size: 18px !important; }
    
    p {
      color: #2d2d2d !important;
      margin-bottom: 18px !important;
      font-size: 18px !important;
      line-height: 1.75 !important;
    }
    
    /* Link styling */
    a {
      color: #007AFF !important;
      text-decoration: none !important;
    }
    
    a:hover {
      text-decoration: underline !important;
    }
    
    /* Image styling */
    img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 8px !important;
      margin: 20px 0 !important;
    }
    
    figure {
      margin: 20px 0 !important;
      padding: 0 !important;
    }
    
    figcaption {
      font-size: 14px !important;
      color: #666 !important;
      text-align: center !important;
      margin-top: 8px !important;
    }
    
    /* Code blocks */
    pre, code {
      background-color: #f5f5f5 !important;
      border-radius: 6px !important;
      font-size: 15px !important;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace !important;
    }
    
    code {
      padding: 2px 6px !important;
    }
    
    pre {
      padding: 16px !important;
      overflow-x: auto !important;
      margin: 16px 0 !important;
    }
    
    pre code {
      padding: 0 !important;
      background: transparent !important;
    }
    
    /* Lists */
    ul, ol {
      padding-left: 28px !important;
      margin-bottom: 18px !important;
    }
    
    li {
      margin-bottom: 10px !important;
      color: #2d2d2d !important;
      line-height: 1.6 !important;
    }
    
    /* Blockquotes */
    blockquote {
      border-left: 4px solid #007AFF !important;
      margin: 20px 0 !important;
      padding: 14px 20px !important;
      background-color: #f8f9fa !important;
      border-radius: 0 8px 8px 0 !important;
      font-style: italic !important;
    }
    
    blockquote p {
      margin-bottom: 0 !important;
    }
    
    /* Tables */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 20px 0 !important;
    }
    
    th, td {
      border: 1px solid #e0e0e0 !important;
      padding: 12px !important;
      text-align: left !important;
    }
    
    th {
      background-color: #f5f5f5 !important;
      font-weight: 600 !important;
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
    
    /* Remove blur effects often used for paywalls */
    [style*="blur"], [style*="filter: blur"] {
      filter: none !important;
      -webkit-filter: none !important;
    }
    
    /* Ensure article content is visible (anti-paywall) */
    article, .article, .story, .post, .entry,
    [class*="article-"], [class*="story-"], [class*="post-"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  \`;

  // ============================================
  // INJECT CSS IMMEDIATELY
  // ============================================
  function injectStyles() {
    if (document.getElementById('ad-blocker-styles')) return;
    
    const style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'ad-blocker-styles';
    style.textContent = adBlockerCSS + readerModeCSS;
    
    // Try to inject as early as possible
    const target = document.head || document.documentElement;
    if (target) {
      target.insertBefore(style, target.firstChild);
    }
  }
  
  // Inject immediately
  injectStyles();
  
  // Also inject when head becomes available
  if (!document.head) {
    new MutationObserver((mutations, obs) => {
      if (document.head) {
        injectStyles();
        obs.disconnect();
      }
    }).observe(document.documentElement, { childList: true });
  }
  
  // Force light color scheme on meta tag
  function setColorScheme() {
    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (colorSchemeMeta) {
      colorSchemeMeta.setAttribute('content', 'light');
    } else if (document.head) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.setAttribute('name', 'color-scheme');
      colorSchemeMeta.setAttribute('content', 'light');
      document.head.appendChild(colorSchemeMeta);
    }
  }
  setColorScheme();

  // ============================================
  // AGGRESSIVE AD REMOVAL FUNCTION
  // ============================================
  function removeAds() {
    // Remove elements matching selectors
    adSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      } catch (e) {}
    });
    
    // Remove suspicious iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = (iframe.src || '').toLowerCase();
      const name = (iframe.name || '').toLowerCase();
      const id = (iframe.id || '').toLowerCase();
      const className = (iframe.className || '').toLowerCase();
      
      const isAd = blockedDomains.some(domain => src.includes(domain)) ||
                   src.includes('ad') ||
                   name.includes('ad') ||
                   id.includes('ad') ||
                   className.includes('ad') ||
                   src === '' || // Empty iframes are often ads
                   src === 'about:blank';
      
      if (isAd) {
        iframe.remove();
      }
    });
    
    // Remove elements with ad-related inline styles (often dynamically inserted)
    document.querySelectorAll('[style*="z-index: 999"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      // If it's covering a large portion of the screen, it's likely an overlay ad
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.3) {
        el.remove();
      }
    });
    
    // Remove script/noscript pairs that often contain ads
    document.querySelectorAll('noscript').forEach(el => {
      const content = el.innerHTML.toLowerCase();
      if (content.includes('ad') || content.includes('tracking') || content.includes('pixel')) {
        el.remove();
      }
    });
  }

  // ============================================
  // BLOCK AD SCRIPTS AND NETWORK REQUESTS
  // ============================================
  
  // Block script elements
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    const element = originalCreateElement(tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          if (blockedDomains.some(domain => value.includes(domain))) {
            console.log('[AdBlocker] Blocked script:', value.substring(0, 50));
            return; // Don't set the src
          }
        }
        return originalSetAttribute(name, value);
      };
      
      // Also intercept direct src assignment
      Object.defineProperty(element, 'src', {
        set: function(value) {
          if (typeof value === 'string' && blockedDomains.some(domain => value.includes(domain))) {
            console.log('[AdBlocker] Blocked script src:', value.substring(0, 50));
            return;
          }
          element.setAttribute('src', value);
        },
        get: function() {
          return element.getAttribute('src');
        }
      });
    }
    
    if (tagName.toLowerCase() === 'iframe') {
      const originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          if (blockedDomains.some(domain => value.includes(domain))) {
            console.log('[AdBlocker] Blocked iframe:', value.substring(0, 50));
            return;
          }
        }
        return originalSetAttribute(name, value);
      };
    }
    
    return element;
  };
  
  // Block fetch requests to ad domains
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const urlStr = typeof url === 'string' ? url : url.url || '';
    if (blockedDomains.some(domain => urlStr.includes(domain))) {
      console.log('[AdBlocker] Blocked fetch:', urlStr.substring(0, 50));
      return Promise.reject(new Error('Blocked by AdBlocker'));
    }
    return originalFetch.apply(this, arguments);
  };
  
  // Block XMLHttpRequest to ad domains
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && blockedDomains.some(domain => url.includes(domain))) {
      console.log('[AdBlocker] Blocked XHR:', url.substring(0, 50));
      this._blocked = true;
    }
    return originalXHROpen.apply(this, arguments);
  };
  
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this._blocked) {
      return;
    }
    return originalXHRSend.apply(this, arguments);
  };

  // ============================================
  // MUTATION OBSERVER FOR DYNAMIC ADS
  // ============================================
  let cleanupTimeout = null;
  const observer = new MutationObserver((mutations) => {
    // Debounce cleanup to avoid performance issues
    if (cleanupTimeout) clearTimeout(cleanupTimeout);
    cleanupTimeout = setTimeout(() => {
      removeAds();
    }, 100);
  });

  // Start observing as soon as body is available
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      removeAds(); // Initial cleanup
    } else {
      requestAnimationFrame(startObserver);
    }
  }
  startObserver();

  // ============================================
  // RUN CLEANUP AT VARIOUS STAGES
  // ============================================
  removeAds();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeAds();
      setColorScheme();
    });
  }
  
  window.addEventListener('load', () => {
    removeAds();
    // Run again after a delay to catch late-loading ads
    setTimeout(removeAds, 500);
    setTimeout(removeAds, 1500);
    setTimeout(removeAds, 3000);
  });

  console.log('[AdBlocker] Enhanced ad blocking active - ' + adSelectors.length + ' selectors, ' + blockedDomains.length + ' blocked domains');
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
