import { featureFlags } from '../utils/featureFlags';
import { useCloudSync } from './useCloudSync';
import { useEnhancedCloudSync } from './useEnhancedCloudSync';

/**
 * Adaptive Cloud Sync Hook
 * Automatically switches between original and enhanced implementations
 * based on feature flags, maintaining full backward compatibility
 */
export const useAdaptiveCloudSync = () => {
  const isEnhancedEnabled = featureFlags.isEnabled('enhancedFirebaseSync');
  
  // Log which version is being used (only once)
  if (typeof window !== 'undefined' && !(window as any).__syncVersionLogged) {
    console.log(
      isEnhancedEnabled 
        ? '🚀 Using Enhanced Firebase Sync (Firebase-first)'
        : '📦 Using Original Cloud Sync (localStorage-first)'
    );
    (window as any).__syncVersionLogged = true;
  }
  
  // Use the appropriate hook based on feature flag
  const originalHook = useCloudSync();
  const enhancedHook = useEnhancedCloudSync();
  
  if (!isEnhancedEnabled) {
    return originalHook;
  }
  
  // Enhanced version with additional features
  return {
    ...enhancedHook,
    
    // Add backward compatibility properties if needed
    syncPendingData: enhancedHook.syncPendingData || (() => Promise.resolve()),
    
    // Feature flag info
    __enhanced: true,
    __version: 'enhanced-1.0'
  };
};

// Export with the original name for drop-in replacement
export { useAdaptiveCloudSync as useCloudSync };