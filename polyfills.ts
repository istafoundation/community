/**
 * Polyfills for React Native environment
 * This file should be imported at the very top of the app
 */

// Convex expects browser environment with window.addEventListener
// React Native doesn't have this, so we polyfill it
if (typeof window !== 'undefined') {
  if (!window.addEventListener) {
    // @ts-ignore - polyfill for React Native
    window.addEventListener = () => {};
  }
  if (!window.removeEventListener) {
    // @ts-ignore
    window.removeEventListener = () => {};
  }
}

export {};
