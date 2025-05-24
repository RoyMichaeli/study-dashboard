import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Course } from '../types';
import { validateDataIntegrity, migrateCorruptedData } from './dataIntegrity';

/**
 * Comprehensive Firebase Sync Diagnostics Tool
 */
export class SyncDiagnostics {
  static async runFullDiagnostics(): Promise<void> {
    console.log('🔍 ========== FIREBASE SYNC DIAGNOSTICS ==========');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('🌐 Browser:', navigator.userAgent);
    
    // 1. Check authentication state
    await this.checkAuthState();
    
    // 2. Analyze localStorage data
    const localData = await this.analyzeLocalStorage();
    
    // 3. Analyze Firebase data
    const firebaseData = await this.analyzeFirebaseData();
    
    // 4. Compare data
    await this.compareDataSources(localData, firebaseData);
    
    // 5. Check IndexedDB
    await this.checkIndexedDB();
    
    // 6. Network connectivity
    this.checkNetworkStatus();
    
    console.log('🔍 ========== END DIAGNOSTICS ==========');
  }
  
  static async checkAuthState(): Promise<void> {
    console.log('\n📱 Authentication State:');
    if (!auth) {
      console.error('❌ Firebase auth not initialized');
      return;
    }
    
    const user = auth.currentUser;
    if (user) {
      console.log('✅ Authenticated as:', user.email || user.uid);
      console.log('   Provider:', user.providerData[0]?.providerId);
      console.log('   UID:', user.uid);
    } else {
      console.warn('⚠️ Not authenticated');
    }
  }
  
  static async analyzeLocalStorage(): Promise<Course[]> {
    console.log('\n💾 LocalStorage Analysis:');
    
    const coursesJson = localStorage.getItem('studyDashboardCourses');
    if (!coursesJson) {
      console.warn('⚠️ No courses in localStorage');
      return [];
    }
    
    try {
      const courses = JSON.parse(coursesJson);
      console.log(`📊 Found ${courses.length} courses in localStorage`);
      
      // Detailed analysis
      courses.forEach((course: any, index: number) => {
        const lessonCount = course.שיעורים?.length || 0;
        const topicCount = course.שיעורים?.reduce((sum: number, lesson: any) => 
          sum + (lesson.נושאים?.length || 0), 0) || 0;
        
        console.log(`   Course ${index + 1}: ${course.קורס || course.מצגת || 'Unknown'}`);
        console.log(`     - ID: ${course.id}`);
        console.log(`     - Lessons: ${lessonCount}`);
        console.log(`     - Total topics: ${topicCount}`);
        console.log(`     - Structure: ${this.detectStructureType(course)}`);
      });
      
      // Check data integrity
      const validation = validateDataIntegrity(courses);
      if (!validation.valid) {
        console.warn('⚠️ Data integrity issues:', validation.errors);
      }
      
      return courses;
    } catch (error) {
      console.error('❌ Failed to parse localStorage:', error);
      return [];
    }
  }
  
  static async analyzeFirebaseData(): Promise<Course[]> {
    console.log('\n☁️ Firebase Data Analysis:');
    
    if (!db || !auth?.currentUser) {
      console.error('❌ Cannot access Firebase - not authenticated or not configured');
      return [];
    }
    
    try {
      const userId = auth.currentUser.uid;
      const coursesRef = collection(db, `users/${userId}/courses`);
      const snapshot = await getDocs(coursesRef);
      
      console.log(`📊 Found ${snapshot.docs.length} courses in Firebase`);
      
      const courses: Course[] = [];
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const lessonCount = data.שיעורים?.length || 0;
        const topicCount = data.שיעורים?.reduce((sum: number, lesson: any) => 
          sum + (lesson.נושאים?.length || 0), 0) || 0;
        
        console.log(`   Course ${index + 1}: ${data.קורס || data.מצגת || 'Unknown'}`);
        console.log(`     - Doc ID: ${doc.id}`);
        console.log(`     - Data ID: ${data.id}`);
        console.log(`     - Lessons: ${lessonCount}`);
        console.log(`     - Total topics: ${topicCount}`);
        console.log(`     - Structure: ${this.detectStructureType(data)}`);
        console.log(`     - Last update: ${data.updatedAt?.toDate?.() || 'Unknown'}`);
        
        courses.push(data as Course);
      });
      
      return courses;
    } catch (error) {
      console.error('❌ Failed to fetch Firebase data:', error);
      return [];
    }
  }
  
  static async compareDataSources(local: Course[], firebase: Course[]): Promise<void> {
    console.log('\n🔄 Data Comparison:');
    console.log(`   Local courses: ${local.length}`);
    console.log(`   Firebase courses: ${firebase.length}`);
    
    // Find courses only in local
    const localOnly = local.filter(lc => 
      !firebase.find(fc => fc.id === lc.id)
    );
    
    // Find courses only in Firebase
    const firebaseOnly = firebase.filter(fc => 
      !local.find(lc => lc.id === fc.id)
    );
    
    if (localOnly.length > 0) {
      console.warn(`⚠️ ${localOnly.length} courses only in localStorage:`);
      localOnly.forEach(c => console.log(`   - ${c.קורס || 'Unknown'} (ID: ${c.id})`));
    }
    
    if (firebaseOnly.length > 0) {
      console.warn(`⚠️ ${firebaseOnly.length} courses only in Firebase:`);
      firebaseOnly.forEach(c => console.log(`   - ${c.קורס || 'Unknown'} (ID: ${c.id})`));
    }
    
    // Compare matching courses
    local.forEach(localCourse => {
      const firebaseCourse = firebase.find(fc => fc.id === localCourse.id);
      if (firebaseCourse) {
        const localLessons = localCourse.שיעורים?.length || 0;
        const firebaseLessons = firebaseCourse.שיעורים?.length || 0;
        
        if (localLessons !== firebaseLessons) {
          console.warn(`⚠️ Lesson count mismatch for "${localCourse.קורס}":`);
          console.warn(`   Local: ${localLessons}, Firebase: ${firebaseLessons}`);
        }
      }
    });
  }
  
  static async checkIndexedDB(): Promise<void> {
    console.log('\n🗄️ IndexedDB Status:');
    
    try {
      const dbs = await indexedDB.databases();
      console.log(`Found ${dbs.length} IndexedDB databases`);
      
      dbs.forEach(db => {
        console.log(`   - ${db.name} (v${db.version})`);
      });
      
      // Check for Firebase persistence DB
      const firebaseDb = dbs.find(db => db.name?.includes('firestore'));
      if (firebaseDb) {
        console.log('✅ Firebase persistence DB found');
      } else {
        console.warn('⚠️ No Firebase persistence DB found');
      }
    } catch (error) {
      console.error('❌ Cannot access IndexedDB:', error);
    }
  }
  
  static checkNetworkStatus(): void {
    console.log('\n🌐 Network Status:');
    console.log(`   Online: ${navigator.onLine ? '✅ Yes' : '❌ No'}`);
    console.log(`   Connection type: ${(navigator as any).connection?.effectiveType || 'Unknown'}`);
  }
  
  static detectStructureType(obj: any): string {
    if (obj.קורס && obj.שיעורים) return '✅ Valid Course';
    if (obj.מצגת && obj.נושאים) return '⚠️ Lesson as Course';
    if (obj.קורס && !obj.שיעורים) return '⚠️ Course without lessons';
    return '❓ Unknown structure';
  }
  
  // Manual sync operations
  static async forceUploadToFirebase(): Promise<void> {
    console.log('\n🚀 Force Upload to Firebase...');
    
    if (!db || !auth?.currentUser) {
      console.error('❌ Cannot upload - not authenticated');
      return;
    }
    
    const localJson = localStorage.getItem('studyDashboardCourses');
    if (!localJson) {
      console.error('❌ No local data to upload');
      return;
    }
    
    try {
      const courses = JSON.parse(localJson);
      const migrated = migrateCorruptedData(courses);
      const userId = auth.currentUser.uid;
      
      console.log(`📤 Uploading ${migrated.length} courses...`);
      
      for (const course of migrated) {
        const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
        await setDoc(docRef, {
          ...course,
          updatedAt: new Date(),
          forcedUpload: true,
          uploadTimestamp: new Date().toISOString()
        });
        console.log(`   ✅ Uploaded: ${course.קורס}`);
      }
      
      console.log('✅ Force upload completed');
    } catch (error) {
      console.error('❌ Force upload failed:', error);
    }
  }
  
  static async forceDownloadFromFirebase(): Promise<void> {
    console.log('\n🚀 Force Download from Firebase...');
    
    if (!db || !auth?.currentUser) {
      console.error('❌ Cannot download - not authenticated');
      return;
    }
    
    try {
      const userId = auth.currentUser.uid;
      const coursesRef = collection(db, `users/${userId}/courses`);
      const snapshot = await getDocs(coursesRef);
      
      const courses: Course[] = [];
      snapshot.docs.forEach(doc => {
        courses.push(doc.data() as Course);
      });
      
      const migrated = migrateCorruptedData(courses);
      
      console.log(`📥 Downloaded ${migrated.length} courses, saving to localStorage...`);
      localStorage.setItem('studyDashboardCourses', JSON.stringify(migrated));
      
      // Force reload to apply changes
      console.log('✅ Download complete. Reloading page...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('❌ Force download failed:', error);
    }
  }
  
  static clearAllData(): void {
    if (!confirm('⚠️ This will clear ALL local data. Are you sure?')) return;
    
    console.log('🗑️ Clearing all local data...');
    localStorage.removeItem('studyDashboardCourses');
    localStorage.removeItem('studyDashboardSessions');
    
    // Clear all timestamp keys
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('lastUpdate_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ Local data cleared');
  }
  
  static analyzeStorageUsage(): void {
    console.log('\n💾 Storage Usage Analysis:');
    
    let totalSize = 0;
    const items: { key: string; size: number }[] = [];
    
    // Analyze each localStorage item
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      totalSize += size;
      items.push({ key, size });
    });
    
    // Sort by size
    items.sort((a, b) => b.size - a.size);
    
    console.log(`Total localStorage usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('\nTop 10 storage consumers:');
    
    items.slice(0, 10).forEach((item, i) => {
      const sizeKB = (item.size / 1024).toFixed(2);
      console.log(`${i + 1}. ${item.key}: ${sizeKB} KB`);
    });
    
    // Check quota
    try {
      localStorage.setItem('__quota_test__', 'test');
      localStorage.removeItem('__quota_test__');
      console.log('\n✅ Storage quota OK');
    } catch (e) {
      console.error('\n❌ STORAGE QUOTA EXCEEDED!');
      console.log('Run syncDiag.cleanupStorage() to free space');
    }
  }
  
  static cleanupStorage(): void {
    console.log('🧹 Starting storage cleanup...');
    
    let cleaned = 0;
    let freedSpace = 0;
    
    // Clean Firebase cache (non-critical data)
    Object.keys(localStorage).forEach(key => {
      if (key.includes('firestore') && !key.includes('mutations')) {
        const size = new Blob([localStorage.getItem(key) || '']).size;
        localStorage.removeItem(key);
        cleaned++;
        freedSpace += size;
      }
      
      // Remove old timestamps
      if (key.startsWith('lastUpdate_') && Date.now() - parseInt(localStorage.getItem(key) || '0') > 86400000) {
        localStorage.removeItem(key);
        cleaned++;
      }
    });
    
    // Trim sync queue
    const syncQueue = localStorage.getItem('firebaseSyncQueue');
    if (syncQueue) {
      try {
        const queue = JSON.parse(syncQueue);
        if (queue.length > 50) {
          const trimmed = queue.slice(-50);
          localStorage.setItem('firebaseSyncQueue', JSON.stringify(trimmed));
          console.log(`Trimmed sync queue from ${queue.length} to 50 items`);
        }
      } catch (e) {
        // Ignore
      }
    }
    
    console.log(`✅ Cleaned ${cleaned} items, freed ${(freedSpace / 1024).toFixed(2)} KB`);
  }
}

// Console commands
(window as any).syncDiag = {
  run: () => SyncDiagnostics.runFullDiagnostics(),
  upload: () => SyncDiagnostics.forceUploadToFirebase(),
  download: () => SyncDiagnostics.forceDownloadFromFirebase(),
  clear: () => SyncDiagnostics.clearAllData(),
  storage: () => SyncDiagnostics.analyzeStorageUsage(),
  cleanupStorage: () => SyncDiagnostics.cleanupStorage(),
  
  // Quick status
  status: async () => {
    const local = localStorage.getItem('studyDashboardCourses');
    const localCount = local ? JSON.parse(local).length : 0;
    console.log(`📊 Quick Status:`);
    console.log(`   Local courses: ${localCount}`);
    console.log(`   Authenticated: ${auth?.currentUser ? '✅' : '❌'}`);
    console.log(`   Online: ${navigator.onLine ? '✅' : '❌'}`);
    
    // Check storage quota
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
    } catch (e) {
      console.error('   ❌ STORAGE QUOTA EXCEEDED!');
    }
  },
  
  // Emergency fix for sync loops
  fixLoop: async () => {
    console.log('🚨 EMERGENCY: Fixing sync loop...');
    try {
      // Import firebase service
      const { firebaseService } = await import('../services/FirebaseService');
      
      // Clean up embedded sessions
      await firebaseService.cleanupEmbeddedSessions();
      
      console.log('✅ Sync loop fix completed. Please refresh the page.');
    } catch (error) {
      console.error('❌ Failed to fix sync loop:', error);
      console.log('Try running this command after logging in.');
    }
  }
};

console.log(`
🔥 FIREBASE-FIRST MODE ENABLED! 🔥
Firebase is now the single source of truth!

🔧 Sync Diagnostics Commands Available:
   syncDiag.run()           - Run full diagnostics
   syncDiag.status()        - Quick status check
   syncDiag.storage()       - Analyze storage usage
   syncDiag.cleanupStorage()- Clean up storage space
   syncDiag.upload()        - Force upload local → Firebase
   syncDiag.download()      - Force download Firebase → local
   syncDiag.clear()         - Clear all local data
   
🔥 FIREBASE-FIRST COMMANDS:
   firebaseFirst.enable()   - Enable Firebase-first mode
   firebaseFirst.stats()    - Show storage statistics
   firebaseFirst.checkQuota() - Check storage quota
   
🚨 EMERGENCY FIXES:
   syncDiag.fixLoop()       - Fix infinite sync loop
   syncDiag.cleanupStorage()- Fix quota exceeded error
`);