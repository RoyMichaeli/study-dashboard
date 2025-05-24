/**
 * Feature Flags for gradual rollout of enhanced Firebase features
 */

interface FeatureFlags {
  enhancedFirebaseSync: boolean;
  showDeviceActivity: boolean;
  useOptimisticUpdates: boolean;
  showSyncMetadata: boolean;
  autoRetryOnError: boolean;
  persistentSessions: boolean;
}

class FeatureFlagManager {
  private flags: FeatureFlags = {
    enhancedFirebaseSync: true, // Enable Firebase-first mode
    showDeviceActivity: true,
    useOptimisticUpdates: true,
    showSyncMetadata: true,
    autoRetryOnError: true,
    persistentSessions: true
  };
  
  constructor() {
    // Load flags from localStorage
    const saved = localStorage.getItem('featureFlags');
    if (saved) {
      try {
        this.flags = { ...this.flags, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load feature flags:', error);
      }
    }
    
    // Check URL params for overrides
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('enhancedSync') === 'true') {
        this.flags.enhancedFirebaseSync = true;
        this.saveFlags();
      }
    }
  }
  
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }
  
  enable(flag: keyof FeatureFlags): void {
    this.flags[flag] = true;
    this.saveFlags();
    console.log(`✅ Feature enabled: ${flag}`);
  }
  
  disable(flag: keyof FeatureFlags): void {
    this.flags[flag] = false;
    this.saveFlags();
    console.log(`❌ Feature disabled: ${flag}`);
  }
  
  toggle(flag: keyof FeatureFlags): void {
    this.flags[flag] = !this.flags[flag];
    this.saveFlags();
    console.log(`🔄 Feature toggled: ${flag} = ${this.flags[flag]}`);
  }
  
  getAll(): FeatureFlags {
    return { ...this.flags };
  }
  
  reset(): void {
    localStorage.removeItem('featureFlags');
    window.location.reload();
  }
  
  private saveFlags(): void {
    localStorage.setItem('featureFlags', JSON.stringify(this.flags));
  }
}

export const featureFlags = new FeatureFlagManager();

// Console commands for easy access
if (typeof window !== 'undefined') {
  (window as any).features = {
    enable: (flag: keyof FeatureFlags) => featureFlags.enable(flag),
    disable: (flag: keyof FeatureFlags) => featureFlags.disable(flag),
    toggle: (flag: keyof FeatureFlags) => featureFlags.toggle(flag),
    list: () => {
      const flags = featureFlags.getAll();
      console.table(flags);
      return flags;
    },
    reset: () => featureFlags.reset(),
    
    // Shortcuts
    enableEnhancedSync: () => {
      featureFlags.enable('enhancedFirebaseSync');
      console.log('🚀 Enhanced sync enabled! Reload the page to apply.');
    },
    disableEnhancedSync: () => {
      featureFlags.disable('enhancedFirebaseSync');
      console.log('🔄 Reverting to original sync. Reload the page to apply.');
    }
  };
  
  console.log(`
🚩 Feature Flags Available:
   features.list()                - Show all flags
   features.enableEnhancedSync()  - Enable enhanced Firebase sync
   features.disableEnhancedSync() - Disable enhanced sync
   features.enable('flagName')    - Enable specific flag
   features.disable('flagName')   - Disable specific flag
   features.reset()               - Reset all flags
   
   Or add ?enhancedSync=true to URL to enable
  `);
}