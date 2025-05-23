import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Course } from '../types';
import { migrateCorruptedData, validateDataIntegrity } from './dataIntegrity';

/**
 * Manual Sync Bridge for resolving browser synchronization issues
 */
export class ManualSyncBridge {
  /**
   * Export complete localStorage data to a shareable format
   */
  static exportLocalData(): string {
    console.log('📤 Exporting local data...');
    
    const courses = localStorage.getItem('studyDashboardCourses');
    const sessions = localStorage.getItem('studyDashboardSessions');
    
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      data: {
        courses: courses ? JSON.parse(courses) : [],
        sessions: sessions ? JSON.parse(sessions) : []
      }
    };
    
    const json = JSON.stringify(exportData, null, 2);
    console.log('✅ Data exported. Copy the output below:');
    console.log(json);
    
    // Also copy to clipboard if available
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => console.log('✅ Data copied to clipboard'),
        () => console.log('⚠️ Could not copy to clipboard')
      );
    }
    
    return json;
  }
  
  /**
   * Import data from another browser
   */
  static async importData(jsonData: string): Promise<void> {
    console.log('📥 Importing data...');
    
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.data?.courses) {
        throw new Error('Invalid import data format');
      }
      
      // Migrate and validate
      const courses = migrateCorruptedData(importData.data.courses);
      const validation = validateDataIntegrity(courses);
      
      if (!validation.valid) {
        console.warn('⚠️ Data validation issues:', validation.errors);
      }
      
      // Save to localStorage
      localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
      if (importData.data.sessions) {
        localStorage.setItem('studyDashboardSessions', JSON.stringify(importData.data.sessions));
      }
      
      console.log(`✅ Imported ${courses.length} courses`);
      console.log('🔄 Syncing to Firebase...');
      
      // Sync to Firebase if authenticated
      if (auth?.currentUser && db) {
        await this.syncImportedDataToFirebase(courses);
      }
      
      console.log('✅ Import complete. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('❌ Import failed:', error);
    }
  }
  
  /**
   * Create a sync checkpoint in Firebase
   */
  static async createSyncCheckpoint(): Promise<void> {
    if (!db || !auth?.currentUser) {
      console.error('❌ Not authenticated');
      return;
    }
    
    console.log('🏁 Creating sync checkpoint...');
    
    const courses = localStorage.getItem('studyDashboardCourses');
    if (!courses) {
      console.error('❌ No local data');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      const checkpointRef = doc(db, `users/${userId}/sync_checkpoints`, 'latest');
      
      await setDoc(checkpointRef, {
        courses: JSON.parse(courses),
        timestamp: new Date().toISOString(),
        browser: navigator.userAgent,
        courseCount: JSON.parse(courses).length
      });
      
      console.log('✅ Checkpoint created');
    } catch (error) {
      console.error('❌ Checkpoint creation failed:', error);
    }
  }
  
  /**
   * Restore from sync checkpoint
   */
  static async restoreFromCheckpoint(): Promise<void> {
    if (!db || !auth?.currentUser) {
      console.error('❌ Not authenticated');
      return;
    }
    
    console.log('🏁 Restoring from checkpoint...');
    
    try {
      const userId = auth.currentUser.uid;
      const checkpointRef = doc(db, `users/${userId}/sync_checkpoints`, 'latest');
      const checkpoint = await getDoc(checkpointRef);
      
      if (!checkpoint.exists()) {
        console.error('❌ No checkpoint found');
        return;
      }
      
      const data = checkpoint.data();
      const courses = migrateCorruptedData(data.courses);
      
      localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
      
      console.log(`✅ Restored ${courses.length} courses from checkpoint`);
      console.log(`   Checkpoint created: ${data.timestamp}`);
      console.log('🔄 Reloading...');
      
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
    }
  }
  
  /**
   * Force complete resync from Chrome to Safari
   */
  static async forceChromeToSafariSync(): Promise<void> {
    console.log('🔄 Force Chrome → Safari sync...');
    
    if (!db || !auth?.currentUser) {
      console.error('❌ Not authenticated');
      return;
    }
    
    const courses = localStorage.getItem('studyDashboardCourses');
    if (!courses) {
      console.error('❌ No local data in Chrome');
      return;
    }
    
    try {
      const parsedCourses = JSON.parse(courses);
      const migrated = migrateCorruptedData(parsedCourses);
      const userId = auth.currentUser.uid;
      
      console.log(`📤 Syncing ${migrated.length} courses to Firebase...`);
      
      // Use individual document updates for better Safari compatibility
      for (let i = 0; i < migrated.length; i++) {
        const course = migrated[i];
        const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
        
        await setDoc(docRef, {
          ...course,
          lastSync: new Date().toISOString(),
          syncSource: 'forceChromeToSafari'
        }, { merge: false }); // Don't merge, replace entirely
        
        console.log(`   ✅ ${i + 1}/${migrated.length}: ${course.קורס}`);
        
        // Small delay for Safari
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ All courses synced to Firebase');
      console.log('📱 Now open Safari and run: syncBridge.pullFromFirebase()');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
    }
  }
  
  /**
   * Pull complete data from Firebase (for Safari)
   */
  static async pullFromFirebase(): Promise<void> {
    console.log('📥 Pulling complete data from Firebase...');
    
    if (!db || !auth?.currentUser) {
      console.error('❌ Not authenticated');
      return;
    }
    
    try {
      const { firebaseService } = await import('../services/FirebaseService');
      
      // Force fresh data fetch
      const courses = await firebaseService.getCourses();
      const migrated = migrateCorruptedData(courses);
      
      console.log(`📥 Received ${migrated.length} courses from Firebase`);
      
      // Clear existing data
      localStorage.removeItem('studyDashboardCourses');
      
      // Save new data
      localStorage.setItem('studyDashboardCourses', JSON.stringify(migrated));
      
      // Clear any cached timestamps
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('lastUpdate_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Pull complete. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('❌ Pull failed:', error);
    }
  }
  
  private static async syncImportedDataToFirebase(courses: Course[]): Promise<void> {
    if (!db || !auth?.currentUser) return;
    
    const userId = auth.currentUser.uid;
    
    for (const course of courses) {
      const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
      await setDoc(docRef, {
        ...course,
        importedAt: new Date().toISOString()
      });
    }
  }
}

// Console commands
(window as any).syncBridge = {
  // Export/Import
  export: () => ManualSyncBridge.exportLocalData(),
  import: (data: string) => ManualSyncBridge.importData(data),
  
  // Checkpoint system
  checkpoint: () => ManualSyncBridge.createSyncCheckpoint(),
  restore: () => ManualSyncBridge.restoreFromCheckpoint(),
  
  // Chrome → Safari sync
  pushToFirebase: () => ManualSyncBridge.forceChromeToSafariSync(),
  pullFromFirebase: () => ManualSyncBridge.pullFromFirebase(),
};

console.log(`
🌉 Manual Sync Bridge Commands:
   
   Chrome (source):
   syncBridge.export()           - Export all data
   syncBridge.pushToFirebase()   - Push to Firebase
   
   Safari (target):
   syncBridge.pullFromFirebase() - Pull from Firebase
   syncBridge.import(data)       - Import exported data
   
   Checkpoints:
   syncBridge.checkpoint()       - Save current state
   syncBridge.restore()          - Restore from checkpoint
`);