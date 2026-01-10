/**
 * Comprehensive Ad Blocker Script for WebView
 * This script blocks ads at multiple levels: CSS hiding, DOM removal, and script blocking
 * Also forces light mode regardless of user's system preferences
 */

export const AD_BLOCKER_SCRIPT = `
(function() {
  'use strict';
  
  // ============================================
  // COMPREHENSIVE AD SELECTOR LIST (200+ selectors)
  // ============================================
  var adSelectors = [
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
    
    // === Newsletter & Subscription Prompts ===
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
    
    // === Cookie Banners & Consent ===
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
    '[class*="app-download"]', '[class*="download-app"]'
  ];

  // ============================================
  // BLOCKED DOMAINS (for script/resource blocking)
  // ============================================
  var blockedDomains = [
    'googlesyndication.com', 'doubleclick.net', 'googleadservices.com',
    'adservice.google.com', 'pagead2.googlesyndication.com',
    'googletagservices.com', 'securepubads.g.doubleclick.net',
    'adx.g.doubleclick.net', 'www.googletagmanager.com',
    'taboola.com', 'outbrain.com', 'outbrainimg.com',
    'amazon-adsystem.com', 'media.net', 'mgid.com', 'revcontent.com',
    'criteo.com', 'criteo.net', 'teads.tv',
    'pubmatic.com', 'openx.net', 'rubiconproject.com',
    'appnexus.com', 'adnxs.com', 'contextweb.com',
    'advertising.com', 'casalemedia.com', 'lijit.com',
    'sharethrough.com', 'triplelift.com', 'spotxchange.com',
    'gumgum.com', 'nativo.com', 'zergnet.com',
    'facebook.net/en_US/fbevents.js', 'connect.facebook.net',
    'hotjar.com', 'mouseflow.com', 'fullstory.com',
    'quantserve.com', 'scorecardresearch.com',
    'chartbeat.com', 'newrelic.com', 'nr-data.net',
    'piano.io', 'tinypass.com', 'pelcro.com',
    'onesignal.com', 'pushwoosh.com', 'pushengage.com',
    'cleverpush.com', 'webpush.com'
  ];

  // ============================================
  // FORCE LIGHT MODE - AGGRESSIVE
  // ============================================
  function forceLightMode() {
    // Remove any existing color-scheme meta
    var existingMeta = document.querySelector('meta[name="color-scheme"]');
    if (existingMeta) {
      existingMeta.remove();
    }
    
    // Add our own color-scheme meta forcing light
    var meta = document.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = 'light only';
    if (document.head) {
      document.head.insertBefore(meta, document.head.firstChild);
    } else if (document.documentElement) {
      document.documentElement.insertBefore(meta, document.documentElement.firstChild);
    }
    
    // Force light color scheme on documentElement
    if (document.documentElement) {
      document.documentElement.style.colorScheme = 'light only';
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark', 'dark-mode', 'dark-theme');
      document.documentElement.classList.add('light', 'light-mode', 'light-theme');
    }
  }

  // ============================================
  // CSS FOR AD BLOCKING & READER MODE
  // ============================================
  var adBlockerCSS = adSelectors.map(function(selector) {
    return selector + ' { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; width: 0 !important; max-width: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; position: absolute !important; z-index: -9999 !important; }';
  }).join(' ');

  // Reader mode CSS for clean article viewing with FORCED LIGHT MODE
  var readerModeCSS = [
    '/* FORCE LIGHT MODE EVERYWHERE */',
    ':root { color-scheme: light only !important; --color-scheme: light !important; }',
    'html { color-scheme: light only !important; }',
    
    '/* Override any dark mode classes */',
    'html.dark, html.dark-mode, html.dark-theme, html[data-theme="dark"], body.dark, body.dark-mode, body.dark-theme { background-color: #ffffff !important; color: #1a1a1a !important; }',
    
    '/* Hide navigation and chrome */',
    'header:not(article header), nav, .header, .nav, .navbar, .navigation, .site-header, .page-header, .top-bar, .top-header, footer, .footer, .site-footer, .page-footer, .sidebar:not(.article-sidebar), .side-bar, aside:not(article aside), .cookie-banner, .cookie-notice, .gdpr, .newsletter, .subscribe-box, .subscription, .social-share, .share-buttons, .social-buttons, .related-posts, .related-articles, .recommended, .comments, .comment-section, #comments, #disqus_thread, .breadcrumb, .breadcrumbs, .floating-button, .fab, .back-to-top, [role="banner"], [role="navigation"], [role="complementary"], .site-branding, .masthead, .utility-nav { display: none !important; }',
    
    '/* Clean body styling - FORCE WHITE */',
    'html, body { background-color: #ffffff !important; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.75 !important; font-size: 18px !important; -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; padding: 0 !important; margin: 0 !important; overflow-x: hidden !important; }',
    
    '/* Content container styling */',
    'body > *, main, article, .content, .article, .post, .entry-content, [class*="article-body"], [class*="story-body"], [class*="post-content"] { max-width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; box-sizing: border-box !important; background-color: #ffffff !important; }',
    
    '/* Typography - FORCE DARK TEXT */',
    'h1, h2, h3, h4, h5, h6 { color: #000000 !important; font-weight: 700 !important; line-height: 1.3 !important; margin-top: 28px !important; margin-bottom: 14px !important; background-color: transparent !important; }',
    'h1 { font-size: 28px !important; }',
    'h2 { font-size: 24px !important; }',
    'h3 { font-size: 20px !important; }',
    'h4 { font-size: 18px !important; }',
    
    'p { color: #2d2d2d !important; margin-bottom: 18px !important; font-size: 18px !important; line-height: 1.75 !important; background-color: transparent !important; }',
    
    'a { color: #007AFF !important; text-decoration: none !important; }',
    'a:hover { text-decoration: underline !important; }',
    
    '/* Images */',
    'img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 20px 0 !important; }',
    'figure { margin: 20px 0 !important; padding: 0 !important; background-color: transparent !important; }',
    'figcaption { font-size: 14px !important; color: #666 !important; text-align: center !important; margin-top: 8px !important; }',
    
    '/* Code blocks */',
    'pre, code { background-color: #f5f5f5 !important; color: #1a1a1a !important; border-radius: 6px !important; font-size: 15px !important; font-family: "SF Mono", Monaco, "Cascadia Code", Consolas, monospace !important; }',
    'code { padding: 2px 6px !important; }',
    'pre { padding: 16px !important; overflow-x: auto !important; margin: 16px 0 !important; }',
    'pre code { padding: 0 !important; background: transparent !important; }',
    
    '/* Lists */',
    'ul, ol { padding-left: 28px !important; margin-bottom: 18px !important; }',
    'li { margin-bottom: 10px !important; color: #2d2d2d !important; line-height: 1.6 !important; background-color: transparent !important; }',
    
    '/* Blockquotes */',
    'blockquote { border-left: 4px solid #007AFF !important; margin: 20px 0 !important; padding: 14px 20px !important; background-color: #f8f9fa !important; border-radius: 0 8px 8px 0 !important; font-style: italic !important; }',
    'blockquote p { margin-bottom: 0 !important; color: #2d2d2d !important; }',
    
    '/* Tables */',
    'table { width: 100% !important; border-collapse: collapse !important; margin: 20px 0 !important; background-color: #ffffff !important; }',
    'th, td { border: 1px solid #e0e0e0 !important; padding: 12px !important; text-align: left !important; color: #1a1a1a !important; background-color: #ffffff !important; }',
    'th { background-color: #f5f5f5 !important; font-weight: 600 !important; }',
    
    '/* Remove fixed/sticky elements */',
    '[style*="position: fixed"], [style*="position:fixed"], [style*="position: sticky"], [style*="position:sticky"] { position: relative !important; }',
    
    '/* Override dark mode media query - FORCE LIGHT */',
    '@media (prefers-color-scheme: dark) { :root { color-scheme: light only !important; } html, body { background-color: #ffffff !important; color: #1a1a1a !important; } * { color-scheme: light !important; } }',
    
    '/* Remove blur effects used for paywalls */',
    '[style*="blur"], [style*="filter: blur"] { filter: none !important; -webkit-filter: none !important; }',
    
    '/* Ensure article content is visible */',
    'article, .article, .story, .post, .entry, [class*="article-"], [class*="story-"], [class*="post-"] { display: block !important; visibility: visible !important; opacity: 1 !important; height: auto !important; max-height: none !important; overflow: visible !important; background-color: #ffffff !important; color: #1a1a1a !important; }',
    
    '/* Force all text to be dark on light */',
    'span, div, p, li, td, th, label, a { color: inherit !important; }',
    'body * { --tw-text-opacity: 1 !important; }'
  ].join(' ');

  // ============================================
  // INJECT CSS IMMEDIATELY
  // ============================================
  function injectStyles() {
    if (document.getElementById('ad-blocker-styles')) return;
    
    var style = document.createElement('style');
    style.type = 'text/css';
    style.id = 'ad-blocker-styles';
    style.textContent = adBlockerCSS + ' ' + readerModeCSS;
    
    // Try to inject as early as possible
    var target = document.head || document.documentElement;
    if (target) {
      target.insertBefore(style, target.firstChild);
    }
  }
  
  // Force light mode immediately
  forceLightMode();
  
  // Inject styles immediately
  injectStyles();
  
  // Also inject when head becomes available
  if (!document.head) {
    var headObserver = new MutationObserver(function(mutations, obs) {
      if (document.head) {
        forceLightMode();
        injectStyles();
        obs.disconnect();
      }
    });
    if (document.documentElement) {
      headObserver.observe(document.documentElement, { childList: true });
    }
  }

  // ============================================
  // AGGRESSIVE AD REMOVAL FUNCTION
  // ============================================
  function removeAds() {
    adSelectors.forEach(function(selector) {
      try {
        var elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
          elements[i].remove();
        }
      } catch (e) {}
    });
    
    // Remove suspicious iframes
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      var iframe = iframes[i];
      var src = (iframe.src || '').toLowerCase();
      var name = (iframe.name || '').toLowerCase();
      var id = (iframe.id || '').toLowerCase();
      var className = (iframe.className || '').toLowerCase();
      
      var isAd = false;
      for (var j = 0; j < blockedDomains.length; j++) {
        if (src.indexOf(blockedDomains[j]) !== -1) {
          isAd = true;
          break;
        }
      }
      
      if (!isAd) {
        isAd = src.indexOf('ad') !== -1 ||
               name.indexOf('ad') !== -1 ||
               id.indexOf('ad') !== -1 ||
               className.indexOf('ad') !== -1 ||
               src === '' ||
               src === 'about:blank';
      }
      
      if (isAd) {
        iframe.remove();
      }
    }
    
    // Remove high z-index overlay elements
    var overlays = document.querySelectorAll('[style*="z-index: 999"], [style*="z-index:999"], [style*="z-index: 9999"], [style*="z-index:9999"]');
    for (var i = 0; i < overlays.length; i++) {
      var el = overlays[i];
      var rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.3) {
        el.remove();
      }
    }
  }

  // ============================================
  // BLOCK AD SCRIPTS AND NETWORK REQUESTS
  // ============================================
  var originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    var element = originalCreateElement(tagName);
    
    if (tagName.toLowerCase() === 'script') {
      var originalSetAttribute = element.setAttribute.bind(element);
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          for (var i = 0; i < blockedDomains.length; i++) {
            if (value.indexOf(blockedDomains[i]) !== -1) {
              console.log('[AdBlocker] Blocked script:', value.substring(0, 50));
              return;
            }
          }
        }
        return originalSetAttribute(name, value);
      };
    }
    
    if (tagName.toLowerCase() === 'iframe') {
      var originalSetAttribute2 = element.setAttribute.bind(element);
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          for (var i = 0; i < blockedDomains.length; i++) {
            if (value.indexOf(blockedDomains[i]) !== -1) {
              console.log('[AdBlocker] Blocked iframe:', value.substring(0, 50));
              return;
            }
          }
        }
        return originalSetAttribute2(name, value);
      };
    }
    
    return element;
  };
  
  // Block fetch requests to ad domains
  if (window.fetch) {
    var originalFetch = window.fetch;
    window.fetch = function(url, options) {
      var urlStr = typeof url === 'string' ? url : (url.url || '');
      for (var i = 0; i < blockedDomains.length; i++) {
        if (urlStr.indexOf(blockedDomains[i]) !== -1) {
          console.log('[AdBlocker] Blocked fetch:', urlStr.substring(0, 50));
          return Promise.reject(new Error('Blocked by AdBlocker'));
        }
      }
      return originalFetch.apply(this, arguments);
    };
  }
  
  // Block XMLHttpRequest to ad domains
  var originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      for (var i = 0; i < blockedDomains.length; i++) {
        if (url.indexOf(blockedDomains[i]) !== -1) {
          console.log('[AdBlocker] Blocked XHR:', url.substring(0, 50));
          this._blocked = true;
          break;
        }
      }
    }
    return originalXHROpen.apply(this, arguments);
  };
  
  var originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this._blocked) {
      return;
    }
    return originalXHRSend.apply(this, arguments);
  };

  // ============================================
  // MUTATION OBSERVER FOR DYNAMIC ADS
  // ============================================
  var cleanupTimeout = null;
  var observer = new MutationObserver(function(mutations) {
    if (cleanupTimeout) clearTimeout(cleanupTimeout);
    cleanupTimeout = setTimeout(function() {
      removeAds();
      forceLightMode();
    }, 100);
  });

  // Start observing as soon as body is available
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      removeAds();
      forceLightMode();
    } else {
      requestAnimationFrame(startObserver);
    }
  }
  startObserver();

  // ============================================
  // RUN CLEANUP AT VARIOUS STAGES
  // ============================================
  removeAds();
  forceLightMode();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      removeAds();
      forceLightMode();
      injectStyles();
    });
  }
  
  window.addEventListener('load', function() {
    removeAds();
    forceLightMode();
    injectStyles();
    setTimeout(function() { removeAds(); forceLightMode(); }, 500);
    setTimeout(function() { removeAds(); forceLightMode(); }, 1500);
    setTimeout(function() { removeAds(); forceLightMode(); }, 3000);
  });

  console.log('[AdBlocker] Enhanced ad blocking + forced light mode active - ' + adSelectors.length + ' selectors, ' + blockedDomains.length + ' blocked domains');
  true;
})();
`;
