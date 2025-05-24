import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Course } from '../types';

/**
 * Comprehensive sync fix for data preservation issues
 */
export class SyncFix {
  /**
   * Main fix function - diagnose and repair sync issues
   */
  static async fixDataLoss(): Promise<void> {
    console.log('🔧 SYNC FIX: Starting comprehensive data loss repair...');
    
    if (!auth?.currentUser) {
      console.error('❌ Not authenticated. Please login first.');
      return;
    }

    try {
      // Step 1: Analyze current state
      console.log('\n1️⃣ Analyzing current state...');
      const localData = this.getLocalData();
      const firebaseData = await this.getFirebaseData();
      
      console.log(`   Local courses: ${localData.length}`);
      console.log(`   Firebase courses: ${firebaseData.length}`);

      // Step 2: Find כימיה אורגנית 1
      const localOrganic = localData.find(c => c.קורס === "כימיה אורגנית 1");
      const firebaseOrganic = firebaseData.find(c => c.קורס === "כימיה אורגנית 1");
      
      if (localOrganic) {
        console.log(`\n2️⃣ Found "כימיה אורגנית 1" locally:`);
        console.log(`   Lessons: ${localOrganic.שיעורים?.length || 0}`);
        
        if (localOrganic.שיעורים?.length === 10) {
          console.log('   ✅ All 10 lessons present locally');
          
          // Check Firebase
          if (!firebaseOrganic || firebaseOrganic.שיעורים?.length !== 10) {
            console.log('\n   ⚠️ Firebase data is incomplete or missing');
            console.log('   🚀 Forcing upload to Firebase...');
            
            await this.forceUploadCourse(localOrganic);
          }
        } else {
          console.error(`   ❌ Only ${localOrganic.שיעורים?.length} lessons found locally`);
          
          // Try to recover from Firebase if it has more data
          if (firebaseOrganic && firebaseOrganic.שיעורים?.length > (localOrganic.שיעורים?.length || 0)) {
            console.log('\n   📥 Firebase has more data, recovering...');
            await this.recoverFromFirebase(firebaseOrganic);
          }
        }
      } else {
        console.error('\n   ❌ "כימיה אורגנית 1" not found locally');
        
        if (firebaseOrganic) {
          console.log('   📥 Found in Firebase, recovering...');
          await this.recoverFromFirebase(firebaseOrganic);
        }
      }

      // Step 3: Fix sync configuration
      console.log('\n3️⃣ Fixing sync configuration...');
      await this.fixSyncConfiguration();

      // Step 4: Verify fix
      console.log('\n4️⃣ Verifying fix...');
      await this.verifyFix();

    } catch (error) {
      console.error('❌ Sync fix failed:', error);
    }
  }

  /**
   * Force upload a course to Firebase with all data
   */
  private static async forceUploadCourse(course: Course): Promise<void> {
    const userId = auth!.currentUser!.uid;
    const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
    
    // Calculate size
    const dataSize = new Blob([JSON.stringify(course)]).size;
    console.log(`   📏 Data size: ${(dataSize / 1024).toFixed(2)}KB`);
    
    if (dataSize > 900000) {
      console.warn('   ⚠️ Course data approaching Firestore limit');
      // Consider splitting large courses
      await this.uploadLargeCourse(course);
    } else {
      // Upload entire course
      await setDoc(docRef, {
        ...course,
        updatedAt: new Date(),
        syncFixed: true,
        fixTimestamp: new Date().toISOString()
      });
      
      console.log('   ✅ Course uploaded successfully');
    }
  }

  /**
   * Upload large course by splitting into chunks
   */
  private static async uploadLargeCourse(course: Course): Promise<void> {
    const userId = auth!.currentUser!.uid;
    
    // Upload course metadata
    const courseMetadata = {
      ...course,
      שיעורים: [], // Empty lessons array in main doc
      hasChunkedLessons: true,
      chunkCount: course.שיעורים?.length || 0
    };
    
    const metadataRef = doc(db, `users/${userId}/courses`, course.id.toString());
    await setDoc(metadataRef, courseMetadata);
    
    // Upload each lesson separately
    if (course.שיעורים) {
      for (let i = 0; i < course.שיעורים.length; i++) {
        const lesson = course.שיעורים[i];
        const lessonRef = doc(db, `users/${userId}/courses/${course.id}/lessons`, i.toString());
        
        await setDoc(lessonRef, {
          ...lesson,
          lessonIndex: i,
          courseId: course.id,
          courseName: course.קורס
        });
        
        console.log(`   ✅ Uploaded lesson ${i + 1}/${course.שיעורים.length}`);
      }
    }
    
    console.log('   ✅ Large course uploaded in chunks');
  }

  /**
   * Recover course from Firebase
   */
  private static async recoverFromFirebase(course: Course): Promise<void> {
    // Check if course has chunked lessons
    if ((course as any).hasChunkedLessons) {
      console.log('   📦 Course has chunked lessons, recovering...');
      
      const userId = auth!.currentUser!.uid;
      const lessonsRef = collection(db, `users/${userId}/courses/${course.id}/lessons`);
      const lessonsSnapshot = await getDocs(lessonsRef);
      
      const lessons: any[] = [];
      lessonsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        lessons[data.lessonIndex] = data;
      });
      
      course.שיעורים = lessons.filter(l => l !== undefined);
      console.log(`   ✅ Recovered ${course.שיעורים.length} lessons from chunks`);
    }
    
    // Save to localStorage
    const localData = this.getLocalData();
    const existingIndex = localData.findIndex(c => c.id === course.id);
    
    if (existingIndex >= 0) {
      localData[existingIndex] = course;
    } else {
      localData.push(course);
    }
    
    localStorage.setItem('studyDashboardCourses', JSON.stringify(localData));
    console.log('   ✅ Course recovered to localStorage');
  }

  /**
   * Fix sync configuration issues
   */
  private static async fixSyncConfiguration(): Promise<void> {
    // Clear problematic sync metadata
    const keysToCheck = [
      'firebaseSyncQueue',
      'firebaseSyncInProgress',
      'lastSyncAttempt'
    ];
    
    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          
          // Clear stuck sync queue
          if (key === 'firebaseSyncQueue' && Array.isArray(parsed) && parsed.length > 100) {
            console.log(`   🧹 Clearing oversized sync queue (${parsed.length} items)`);
            localStorage.removeItem(key);
          }
          
          // Clear stuck sync flag
          if (key === 'firebaseSyncInProgress' && parsed === true) {
            const lastAttempt = localStorage.getItem('lastSyncAttempt');
            if (lastAttempt && Date.now() - parseInt(lastAttempt) > 300000) { // 5 minutes
              console.log('   🧹 Clearing stuck sync flag');
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Invalid JSON, remove it
          localStorage.removeItem(key);
        }
      }
    });
    
    // Set sync priority for courses with many lessons
    const localData = this.getLocalData();
    localData.forEach(course => {
      if (course.שיעורים && course.שיעורים.length >= 10) {
        localStorage.setItem(`syncPriority_${course.id}`, 'high');
      }
    });
  }

  /**
   * Verify the fix worked
   */
  private static async verifyFix(): Promise<void> {
    const localData = this.getLocalData();
    const organicChem = localData.find(c => c.קורס === "כימיה אורגנית 1");
    
    if (organicChem && organicChem.שיעורים?.length === 10) {
      console.log('✅ Fix verified: "כימיה אורגנית 1" has all 10 lessons');
      
      // Double-check Firebase
      const userId = auth!.currentUser!.uid;
      const docRef = doc(db, `users/${userId}/courses`, organicChem.id.toString());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const firebaseData = docSnap.data();
        
        if (firebaseData.hasChunkedLessons) {
          console.log('✅ Course is properly chunked in Firebase');
        } else if (firebaseData.שיעורים?.length === 10) {
          console.log('✅ Firebase has all 10 lessons');
        } else {
          console.warn('⚠️ Firebase data may still be incomplete');
        }
      }
    } else {
      console.error('❌ Fix verification failed');
    }
  }

  /**
   * Emergency data restoration
   */
  static async emergencyRestore(): Promise<void> {
    console.log('🚨 EMERGENCY RESTORE: Attempting to restore from all available sources...');
    
    // Check all possible localStorage keys
    const possibleKeys = [
      'studyDashboardCourses',
      'studyDashboardCoursesBackup',
      'studyDashboardBackup',
      'courses_backup',
      'lastKnownGoodCourses'
    ];
    
    let bestData: Course[] = [];
    let bestSource = '';
    let maxLessons = 0;
    
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const courses = JSON.parse(data);
          const organicChem = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
          
          if (organicChem && organicChem.שיעורים?.length > maxLessons) {
            maxLessons = organicChem.שיעורים.length;
            bestData = courses;
            bestSource = key;
          }
        } catch (e) {
          console.error(`Failed to parse ${key}`);
        }
      }
    }
    
    if (bestData.length > 0 && maxLessons > 0) {
      console.log(`✅ Found best data in ${bestSource} with ${maxLessons} lessons`);
      
      // Backup current data
      const currentData = localStorage.getItem('studyDashboardCourses');
      if (currentData) {
        localStorage.setItem('studyDashboardCourses_beforeRestore', currentData);
      }
      
      // Restore best data
      localStorage.setItem('studyDashboardCourses', JSON.stringify(bestData));
      
      // Force sync to Firebase
      await this.fixDataLoss();
      
      console.log('✅ Emergency restore completed');
    } else {
      console.error('❌ No suitable backup data found');
    }
  }

  // Helper methods
  private static getLocalData(): Course[] {
    const data = localStorage.getItem('studyDashboardCourses');
    return data ? JSON.parse(data) : [];
  }

  private static async getFirebaseData(): Promise<Course[]> {
    if (!auth?.currentUser) return [];
    
    const userId = auth.currentUser.uid;
    const coursesRef = collection(db, `users/${userId}/courses`);
    const snapshot = await getDocs(coursesRef);
    
    return snapshot.docs.map(doc => doc.data() as Course);
  }
}

// Export to window
(window as any).syncFix = {
  fix: () => SyncFix.fixDataLoss(),
  restore: () => SyncFix.emergencyRestore(),
  
  // Quick status check
  status: async () => {
    const local = localStorage.getItem('studyDashboardCourses');
    const courses = local ? JSON.parse(local) : [];
    const organic = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
    
    console.log('📊 Quick Status:');
    console.log(`Total courses: ${courses.length}`);
    if (organic) {
      console.log(`כימיה אורגנית 1: ${organic.שיעורים?.length || 0} lessons`);
      if (organic.שיעורים?.length === 10) {
        console.log('✅ All lessons present!');
      } else {
        console.error('❌ Missing lessons!');
      }
    } else {
      console.error('❌ כימיה אורגנית 1 not found');
    }
  }
};

console.log(`
🔧 SYNC FIX LOADED 🔧

Commands to fix data loss:

syncFix.fix()      - Run comprehensive sync fix
syncFix.restore()  - Emergency restore from backups
syncFix.status()   - Quick status check

To fix the issue:
1. Run: syncFix.status() to check current state
2. Run: syncFix.fix() to repair sync issues
3. If still broken: syncFix.restore() for emergency recovery
`);