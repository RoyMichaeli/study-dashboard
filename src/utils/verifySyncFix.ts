/**
 * Verification utility for sync fix
 * This can be imported and run to verify the sync loop has been fixed
 */

import { firebaseService } from '../services/FirebaseService';

export const verifySyncFix = {
  // Check if any courses have embedded session data
  async checkForEmbeddedData(): Promise<boolean> {
    const localCourses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    let hasEmbedded = false;
    
    localCourses.forEach((course: any, index: number) => {
      if (course.sessions || course.studySessions) {
        console.error(`❌ Course ${index + 1} (${course.קורס}) still has embedded session data`);
        hasEmbedded = true;
      }
    });
    
    if (!hasEmbedded) {
      console.log('✅ No embedded session data found in localStorage');
    }
    
    return hasEmbedded;
  },
  
  // Monitor real-time sync for loops
  async monitorSyncActivity(duration: number = 10000): Promise<void> {
    console.log(`🔍 Monitoring sync activity for ${duration/1000} seconds...`);
    
    let updateCount = 0;
    let lastUpdateTime = Date.now();
    const updateThreshold = 500; // If updates happen faster than 500ms, it's likely a loop
    
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      
      if (message.includes('Real-time update received')) {
        updateCount++;
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        
        if (timeSinceLastUpdate < updateThreshold && updateCount > 2) {
          console.error('🚨 SYNC LOOP DETECTED! Updates happening too rapidly');
        }
        
        lastUpdateTime = now;
      }
      
      originalLog.apply(console, args);
    };
    
    // Restore original console.log after monitoring
    setTimeout(() => {
      console.log = originalLog;
      console.log(`📊 Monitoring complete. Total updates: ${updateCount}`);
      
      if (updateCount > 20) {
        console.error('⚠️ High number of updates detected. Possible sync issue.');
      } else if (updateCount < 5) {
        console.log('✅ Normal sync activity detected');
      }
    }, duration);
  },
  
  // Run all verification checks
  async runAllChecks(): Promise<void> {
    console.log('🔧 Running sync fix verification...\n');
    
    // 1. Check for embedded data
    await this.checkForEmbeddedData();
    
    // 2. Check sync queue
    const syncStatus = firebaseService.getSyncQueueStatus();
    if (syncStatus.pending > 0) {
      console.warn(`⚠️ ${syncStatus.pending} items in sync queue`);
    } else {
      console.log('✅ Sync queue is empty');
    }
    
    // 3. Check feature flags
    const flags = localStorage.getItem('featureFlags');
    if (flags) {
      const parsed = JSON.parse(flags);
      console.log(`📋 Enhanced sync: ${parsed.enhancedFirebaseSync ? 'ENABLED' : 'DISABLED'}`);
    }
    
    console.log('\n✅ Verification complete');
  }
};

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).verifySyncFix = verifySyncFix;
  
  console.log(`
🔍 Sync Fix Verification Available:
   verifySyncFix.runAllChecks()     - Run all verification checks
   verifySyncFix.checkForEmbeddedData() - Check for problematic data
   verifySyncFix.monitorSyncActivity()  - Monitor for sync loops (10s)
  `);
}