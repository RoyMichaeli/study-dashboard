/**
 * Browser Compatibility Fixes for Firebase Sync
 */

export function setupBrowserCompatibility() {
  // Fix for Safari's aggressive ITP (Intelligent Tracking Prevention)
  if (isSafari()) {
    console.log('🦁 Safari detected, applying compatibility fixes...');
    
    // Ensure IndexedDB is properly initialized
    ensureIndexedDBSupport();
    
    // Fix for Safari's stricter security policies
    fixSafariStorageAccess();
  }
  
  // Fix for older browsers
  polyfillMissingFeatures();
}

function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isSafariBrowser = ua.includes('safari') && !ua.includes('chrome');
  const isIOSSafari = /iphone|ipad|ipod/.test(ua) && !ua.includes('crios');
  return isSafariBrowser || isIOSSafari;
}

function ensureIndexedDBSupport() {
  // Safari sometimes needs explicit IndexedDB initialization
  if ('indexedDB' in window) {
    try {
      // Attempt to open a test database
      const testRequest = indexedDB.open('test', 1);
      testRequest.onsuccess = () => {
        console.log('✅ IndexedDB working properly');
        // Clean up test database
        indexedDB.deleteDatabase('test');
      };
      testRequest.onerror = () => {
        console.error('❌ IndexedDB initialization failed');
      };
    } catch (error) {
      console.error('❌ IndexedDB not available:', error);
    }
  }
}

function fixSafariStorageAccess() {
  // Safari requires user interaction for certain storage operations
  // This ensures localStorage is properly accessible
  try {
    localStorage.setItem('safari_test', 'test');
    localStorage.removeItem('safari_test');
    console.log('✅ localStorage accessible');
  } catch (error) {
    console.error('❌ localStorage access issue:', error);
    
    // Fallback: Request storage access
    if ('requestStorageAccess' in document) {
      document.requestStorageAccess().then(
        () => console.log('✅ Storage access granted'),
        () => console.error('❌ Storage access denied')
      );
    }
  }
}

function polyfillMissingFeatures() {
  // Polyfill for older browsers missing modern features
  
  // Object.entries polyfill
  if (!Object.entries) {
    Object.entries = function(obj: any) {
      const ownProps = Object.keys(obj);
      let i = ownProps.length;
      const resArray = new Array(i);
      while (i--) {
        resArray[i] = [ownProps[i], obj[ownProps[i]]];
      }
      return resArray;
    };
  }
  
  // Array.prototype.includes polyfill
  if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement: any, fromIndex?: number) {
      return this.indexOf(searchElement, fromIndex) !== -1;
    };
  }
}

// Safari-specific Firebase initialization fix
export function getSafariFirebaseConfig() {
  return {
    // Disable experimental features that might cause issues in Safari
    experimentalForceLongPolling: false,
    experimentalAutoDetectLongPolling: false,
    
    // Use more compatible settings
    persistence: {
      synchronizeTabs: false, // Safari has issues with tab synchronization
    }
  };
}

// Enhanced error reporting for Safari
export function logSafariError(context: string, error: any) {
  if (isSafari()) {
    console.group(`🦁 Safari Error in ${context}`);
    console.error('Error:', error);
    console.error('Stack:', error?.stack);
    console.error('Browser:', navigator.userAgent);
    console.error('Online:', navigator.onLine);
    console.groupEnd();
  }
}