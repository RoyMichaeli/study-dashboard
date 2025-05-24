import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Course } from '../types';

interface DataStats {
  courseCount: number;
  totalLessons: number;
  totalTopics: number;
  totalGoals: number;
  totalCompletedGoals: number;
  lessonsPerCourse: Record<string, number>;
  topicsPerLesson: Record<string, number>;
  goalsPerTopic: Record<string, number>;
  dataSizeBytes: number;
  nestedDepth: number;
}

interface CourseAudit {
  courseName: string;
  courseId: number;
  lessons: {
    name: string;
    topicCount: number;
    topics: {
      title: string;
      goalCount: number;
      completedGoalCount: number;
      goals: string[];
      completedGoals: string[];
    }[];
  }[];
  totalGoals: number;
  totalCompletedGoals: number;
  dataIntegrity: {
    hasLessons: boolean;
    allLessonsHaveTopics: boolean;
    allTopicsHaveGoals: boolean;
    duplicateGoals: string[];
    orphanedCompletedGoals: string[];
  };
}

/**
 * Deep Data Diagnostics for Complete Hierarchy Analysis
 */
export class DeepDataDiagnostics {
  /**
   * Comprehensive audit of course structure
   */
  static async auditCourseStructure(courseId: number): Promise<CourseAudit | null> {
    console.log(`\n🔍 DEEP AUDIT: Course ID ${courseId}`);
    
    // Check localStorage
    const localData = this.getLocalCourseById(courseId);
    if (!localData) {
      console.error('❌ Course not found in localStorage');
      return null;
    }
    
    const audit: CourseAudit = {
      courseName: localData.קורס || 'Unknown',
      courseId: localData.id,
      lessons: [],
      totalGoals: 0,
      totalCompletedGoals: 0,
      dataIntegrity: {
        hasLessons: false,
        allLessonsHaveTopics: true,
        allTopicsHaveGoals: true,
        duplicateGoals: [],
        orphanedCompletedGoals: []
      }
    };
    
    // Analyze lessons
    if (localData.שיעורים && Array.isArray(localData.שיעורים)) {
      audit.dataIntegrity.hasLessons = localData.שיעורים.length > 0;
      
      localData.שיעורים.forEach((lesson: any, lessonIndex: number) => {
        const lessonAudit = {
          name: lesson.שם || `Lesson ${lessonIndex + 1}`,
          topicCount: 0,
          topics: [] as any[]
        };
        
        // Analyze topics
        if (lesson.נושאים && Array.isArray(lesson.נושאים)) {
          lessonAudit.topicCount = lesson.נושאים.length;
          
          if (lesson.נושאים.length === 0) {
            audit.dataIntegrity.allLessonsHaveTopics = false;
          }
          
          lesson.נושאים.forEach((topic: any) => {
            const topicAudit = {
              title: topic.כותרת || 'Untitled Topic',
              goalCount: 0,
              completedGoalCount: 0,
              goals: [] as string[],
              completedGoals: [] as string[]
            };
            
            // Analyze goals
            if (topic.מטרות && Array.isArray(topic.מטרות)) {
              topicAudit.goalCount = topic.מטרות.length;
              topicAudit.goals = topic.מטרות.map((goal: any) => 
                typeof goal === 'string' ? goal : goal.text || 'Unknown Goal'
              );
              
              audit.totalGoals += topicAudit.goalCount;
              
              if (topic.מטרות.length === 0) {
                audit.dataIntegrity.allTopicsHaveGoals = false;
              }
            } else {
              audit.dataIntegrity.allTopicsHaveGoals = false;
            }
            
            // Analyze completed goals
            if (topic.completedGoals && Array.isArray(topic.completedGoals)) {
              topicAudit.completedGoalCount = topic.completedGoals.length;
              topicAudit.completedGoals = topic.completedGoals;
              audit.totalCompletedGoals += topicAudit.completedGoalCount;
              
              // Check for orphaned completed goals
              topic.completedGoals.forEach((completed: string) => {
                if (!topicAudit.goals.includes(completed)) {
                  audit.dataIntegrity.orphanedCompletedGoals.push(completed);
                }
              });
            }
            
            lessonAudit.topics.push(topicAudit);
          });
        } else {
          audit.dataIntegrity.allLessonsHaveTopics = false;
        }
        
        audit.lessons.push(lessonAudit);
      });
    } else {
      audit.dataIntegrity.hasLessons = false;
    }
    
    // Print detailed audit results
    console.log('\n📊 AUDIT RESULTS:');
    console.log(`Course: ${audit.courseName} (ID: ${audit.courseId})`);
    console.log(`Total Lessons: ${audit.lessons.length}`);
    console.log(`Total Topics: ${audit.lessons.reduce((sum, l) => sum + l.topicCount, 0)}`);
    console.log(`Total Goals: ${audit.totalGoals}`);
    console.log(`Completed Goals: ${audit.totalCompletedGoals}`);
    
    console.log('\n📋 Lesson Breakdown:');
    audit.lessons.forEach((lesson, i) => {
      console.log(`\n  Lesson ${i + 1}: ${lesson.name}`);
      console.log(`    Topics: ${lesson.topicCount}`);
      lesson.topics.forEach((topic, j) => {
        console.log(`      Topic ${j + 1}: ${topic.title}`);
        console.log(`        Goals: ${topic.goalCount}`);
        console.log(`        Completed: ${topic.completedGoalCount}`);
      });
    });
    
    console.log('\n🔍 Data Integrity:');
    console.log(`  Has Lessons: ${audit.dataIntegrity.hasLessons ? '✅' : '❌'}`);
    console.log(`  All Lessons Have Topics: ${audit.dataIntegrity.allLessonsHaveTopics ? '✅' : '❌'}`);
    console.log(`  All Topics Have Goals: ${audit.dataIntegrity.allTopicsHaveGoals ? '✅' : '❌'}`);
    if (audit.dataIntegrity.orphanedCompletedGoals.length > 0) {
      console.warn(`  ⚠️ Orphaned Completed Goals: ${audit.dataIntegrity.orphanedCompletedGoals.length}`);
    }
    
    return audit;
  }
  
  /**
   * Compare full structure between localStorage and Firebase
   */
  static async compareFullStructure(): Promise<void> {
    console.log('\n🔄 FULL STRUCTURE COMPARISON');
    
    const localCourses = this.getAllLocalCourses();
    const firebaseCourses = await this.getAllFirebaseCourses();
    
    console.log(`\nLocal Courses: ${localCourses.length}`);
    console.log(`Firebase Courses: ${firebaseCourses.length}`);
    
    // Compare each course
    for (const localCourse of localCourses) {
      const firebaseCourse = firebaseCourses.find(fc => fc.id === localCourse.id);
      
      if (!firebaseCourse) {
        console.error(`\n❌ Course "${localCourse.קורס}" (ID: ${localCourse.id}) NOT IN FIREBASE`);
        continue;
      }
      
      console.log(`\n📚 Comparing: ${localCourse.קורס}`);
      
      // Compare lesson counts
      const localLessons = localCourse.שיעורים?.length || 0;
      const firebaseLessons = firebaseCourse.שיעורים?.length || 0;
      
      if (localLessons !== firebaseLessons) {
        console.error(`  ❌ LESSON COUNT MISMATCH:`);
        console.error(`     Local: ${localLessons} lessons`);
        console.error(`     Firebase: ${firebaseLessons} lessons`);
        
        // Show lesson names
        if (localCourse.שיעורים) {
          console.log(`     Local lessons:`);
          localCourse.שיעורים.forEach((l: any, i: number) => 
            console.log(`       ${i + 1}. ${l.שם || 'Unnamed'}`)
          );
        }
        
        if (firebaseCourse.שיעורים) {
          console.log(`     Firebase lessons:`);
          firebaseCourse.שיעורים.forEach((l: any, i: number) => 
            console.log(`       ${i + 1}. ${l.שם || 'Unnamed'}`)
          );
        }
      } else {
        console.log(`  ✅ Lesson count matches: ${localLessons}`);
      }
      
      // Deep comparison of topics and goals
      if (localCourse.שיעורים && firebaseCourse.שיעורים) {
        let totalLocalTopics = 0;
        let totalFirebaseTopics = 0;
        let totalLocalGoals = 0;
        let totalFirebaseGoals = 0;
        
        localCourse.שיעורים.forEach((lesson: any) => {
          if (lesson.נושאים) {
            totalLocalTopics += lesson.נושאים.length;
            lesson.נושאים.forEach((topic: any) => {
              if (topic.מטרות) {
                totalLocalGoals += topic.מטרות.length;
              }
            });
          }
        });
        
        firebaseCourse.שיעורים.forEach((lesson: any) => {
          if (lesson.נושאים) {
            totalFirebaseTopics += lesson.נושאים.length;
            lesson.נושאים.forEach((topic: any) => {
              if (topic.מטרות) {
                totalFirebaseGoals += topic.מטרות.length;
              }
            });
          }
        });
        
        console.log(`  Topics - Local: ${totalLocalTopics}, Firebase: ${totalFirebaseTopics} ${
          totalLocalTopics === totalFirebaseTopics ? '✅' : '❌'
        }`);
        console.log(`  Goals - Local: ${totalLocalGoals}, Firebase: ${totalFirebaseGoals} ${
          totalLocalGoals === totalFirebaseGoals ? '✅' : '❌'
        }`);
      }
    }
  }
  
  /**
   * Get detailed data statistics
   */
  static async getDataStats(): Promise<DataStats> {
    const localCourses = this.getAllLocalCourses();
    
    const stats: DataStats = {
      courseCount: localCourses.length,
      totalLessons: 0,
      totalTopics: 0,
      totalGoals: 0,
      totalCompletedGoals: 0,
      lessonsPerCourse: {},
      topicsPerLesson: {},
      goalsPerTopic: {},
      dataSizeBytes: new Blob([JSON.stringify(localCourses)]).size,
      nestedDepth: 4 // courses -> lessons -> topics -> goals
    };
    
    localCourses.forEach((course: any) => {
      const courseName = course.קורס || `Course ${course.id}`;
      const lessons = course.שיעורים || [];
      
      stats.lessonsPerCourse[courseName] = lessons.length;
      stats.totalLessons += lessons.length;
      
      lessons.forEach((lesson: any, lessonIndex: number) => {
        const lessonName = lesson.שם || `${courseName} - Lesson ${lessonIndex + 1}`;
        const topics = lesson.נושאים || [];
        
        stats.topicsPerLesson[lessonName] = topics.length;
        stats.totalTopics += topics.length;
        
        topics.forEach((topic: any, topicIndex: number) => {
          const topicName = topic.כותרת || `${lessonName} - Topic ${topicIndex + 1}`;
          const goals = topic.מטרות || [];
          const completedGoals = topic.completedGoals || [];
          
          stats.goalsPerTopic[topicName] = goals.length;
          stats.totalGoals += goals.length;
          stats.totalCompletedGoals += completedGoals.length;
        });
      });
    });
    
    console.log('\n📊 DATA STATISTICS:');
    console.log(`Courses: ${stats.courseCount}`);
    console.log(`Total Lessons: ${stats.totalLessons}`);
    console.log(`Total Topics: ${stats.totalTopics}`);
    console.log(`Total Goals: ${stats.totalGoals}`);
    console.log(`Completed Goals: ${stats.totalCompletedGoals}`);
    console.log(`Data Size: ${(stats.dataSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n📈 Distribution:');
    Object.entries(stats.lessonsPerCourse).forEach(([course, count]) => {
      console.log(`  ${course}: ${count} lessons`);
    });
    
    return stats;
  }
  
  /**
   * Validate data integrity after import
   */
  static async validateAfterImport(): Promise<boolean> {
    console.log('\n🔍 POST-IMPORT VALIDATION');
    
    const courses = this.getAllLocalCourses();
    let valid = true;
    
    courses.forEach((course: any) => {
      if (!course.קורס || !course.שיעורים) {
        console.error(`❌ Invalid course structure: ${JSON.stringify(course).slice(0, 100)}...`);
        valid = false;
        return;
      }
      
      const lessonCount = course.שיעורים.length;
      if (lessonCount === 0) {
        console.warn(`⚠️ Course "${course.קורס}" has no lessons`);
      }
      
      // Check for "כימיה אורגנית 1" specifically
      if (course.קורס === "כימיה אורגנית 1") {
        console.log(`\n🎯 Found "כימיה אורגנית 1":`);
        console.log(`  Lessons: ${lessonCount}`);
        
        if (lessonCount !== 10) {
          console.error(`  ❌ CRITICAL: Expected 10 lessons, found ${lessonCount}`);
          valid = false;
        } else {
          console.log(`  ✅ All 10 lessons present`);
        }
        
        // List all lessons
        course.שיעורים.forEach((lesson: any, i: number) => {
          const topicCount = lesson.נושאים?.length || 0;
          console.log(`    ${i + 1}. ${lesson.שם} (${topicCount} topics)`);
        });
      }
    });
    
    return valid;
  }
  
  /**
   * Force deep sync of entire nested structure
   */
  static async forceDeepSync(): Promise<void> {
    console.log('\n🚀 FORCING DEEP SYNC');
    
    if (!auth?.currentUser) {
      console.error('❌ Not authenticated');
      return;
    }
    
    const courses = this.getAllLocalCourses();
    const userId = auth.currentUser.uid;
    
    for (const course of courses) {
      console.log(`\n📤 Syncing: ${course.קורס}`);
      
      // Calculate data size
      const dataSize = new Blob([JSON.stringify(course)]).size;
      console.log(`  Data size: ${(dataSize / 1024).toFixed(2)} KB`);
      
      if (dataSize > 900000) { // 900KB, leaving margin for Firestore metadata
        console.warn(`  ⚠️ Course approaching Firestore limit (1MB)`);
        console.warn(`  Consider splitting into multiple documents`);
      }
      
      try {
        // Use Firebase service for proper sync
        const { firebaseService } = await import('../services/FirebaseService');
        await firebaseService.saveCourse(course);
        
        console.log(`  ✅ Synced successfully`);
        console.log(`  Lessons: ${course.שיעורים?.length || 0}`);
        
        // Verify sync
        const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const savedData = docSnap.data();
          const savedLessons = savedData.שיעורים?.length || 0;
          
          if (savedLessons === course.שיעורים?.length) {
            console.log(`  ✅ Verified: ${savedLessons} lessons in Firebase`);
          } else {
            console.error(`  ❌ SYNC ERROR: Local has ${course.שיעורים?.length} lessons, Firebase has ${savedLessons}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Sync failed:`, error);
      }
    }
  }
  
  /**
   * Trace sync process step by step
   */
  static async traceSync(courseId: number): Promise<void> {
    console.log(`\n🔍 TRACING SYNC FOR COURSE ${courseId}`);
    
    // Step 1: Check localStorage
    console.log('\n1️⃣ Checking localStorage...');
    const localCourse = this.getLocalCourseById(courseId);
    if (!localCourse) {
      console.error('   ❌ Course not found in localStorage');
      return;
    }
    console.log(`   ✅ Found in localStorage: ${localCourse.קורס}`);
    console.log(`   Lessons: ${localCourse.שיעורים?.length || 0}`);
    
    // Step 2: Check Firebase
    console.log('\n2️⃣ Checking Firebase...');
    if (!auth?.currentUser) {
      console.error('   ❌ Not authenticated');
      return;
    }
    
    const userId = auth.currentUser.uid;
    const docRef = doc(db, `users/${userId}/courses`, courseId.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error('   ❌ Course not found in Firebase');
      console.log('   Running forceDeepSync...');
      await this.forceDeepSync();
      return;
    }
    
    const firebaseData = docSnap.data();
    console.log(`   ✅ Found in Firebase`);
    console.log(`   Lessons: ${firebaseData.שיעורים?.length || 0}`);
    
    // Step 3: Compare timestamps
    console.log('\n3️⃣ Comparing timestamps...');
    const localTimestamp = localStorage.getItem(`lastUpdate_course_${courseId}`);
    const firebaseTimestamp = firebaseData.updatedAt?.toDate?.();
    
    console.log(`   Local update: ${localTimestamp ? new Date(parseInt(localTimestamp)) : 'Never'}`);
    console.log(`   Firebase update: ${firebaseTimestamp || 'Never'}`);
    
    // Step 4: Check sync queue
    console.log('\n4️⃣ Checking sync queue...');
    const syncQueue = localStorage.getItem('firebaseSyncQueue');
    if (syncQueue) {
      const queue = JSON.parse(syncQueue);
      const pendingOps = queue.filter((op: any) => 
        op.data?.id === courseId || op.path?.includes(courseId.toString())
      );
      console.log(`   Pending operations: ${pendingOps.length}`);
      if (pendingOps.length > 0) {
        console.log('   Operations:', pendingOps);
      }
    }
    
    // Step 5: Check for conflicts
    console.log('\n5️⃣ Checking for conflicts...');
    if (localCourse.שיעורים?.length !== firebaseData.שיעורים?.length) {
      console.error(`   ❌ CONFLICT: Lesson count mismatch`);
      console.log(`   Local: ${localCourse.שיעורים?.length}, Firebase: ${firebaseData.שיעורים?.length}`);
    } else {
      console.log(`   ✅ No conflicts detected`);
    }
  }
  
  // Helper methods
  private static getLocalCourseById(courseId: number): any {
    const courses = this.getAllLocalCourses();
    return courses.find((c: any) => c.id === courseId);
  }
  
  private static getAllLocalCourses(): any[] {
    const coursesJson = localStorage.getItem('studyDashboardCourses');
    if (!coursesJson) return [];
    
    try {
      return JSON.parse(coursesJson);
    } catch (error) {
      console.error('Failed to parse courses:', error);
      return [];
    }
  }
  
  private static async getAllFirebaseCourses(): Promise<any[]> {
    if (!db || !auth?.currentUser) return [];
    
    try {
      const userId = auth.currentUser.uid;
      const coursesRef = collection(db, `users/${userId}/courses`);
      const snapshot = await getDocs(coursesRef);
      
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Failed to fetch Firebase courses:', error);
      return [];
    }
  }
}

// Export to window for console access
(window as any).deepDiag = {
  auditCourse: (courseId: number) => DeepDataDiagnostics.auditCourseStructure(courseId),
  compareStructure: () => DeepDataDiagnostics.compareFullStructure(),
  getStats: () => DeepDataDiagnostics.getDataStats(),
  validateImport: () => DeepDataDiagnostics.validateAfterImport(),
  forceSync: () => DeepDataDiagnostics.forceDeepSync(),
  traceSync: (courseId: number) => DeepDataDiagnostics.traceSync(courseId),
  
  // Quick check for כימיה אורגנית 1
  checkOrganic: async () => {
    const courses = (window as any).deepDiag.getAllLocalCourses();
    const organic = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
    
    if (!organic) {
      console.error('❌ "כימיה אורגנית 1" not found');
      return;
    }
    
    console.log('📚 כימיה אורגנית 1:');
    console.log(`  ID: ${organic.id}`);
    console.log(`  Lessons: ${organic.שיעורים?.length || 0}`);
    
    if (organic.שיעורים) {
      organic.שיעורים.forEach((lesson: any, i: number) => {
        console.log(`    ${i + 1}. ${lesson.שם}`);
      });
    }
  },
  
  // Internal helper exposed for debugging
  getAllLocalCourses: () => {
    const coursesJson = localStorage.getItem('studyDashboardCourses');
    if (!coursesJson) return [];
    try {
      return JSON.parse(coursesJson);
    } catch (error) {
      console.error('Failed to parse courses:', error);
      return [];
    }
  }
};

console.log(`
🔬 DEEP DATA DIAGNOSTICS LOADED 🔬

Commands for investigating data loss:

📊 Quick Stats & Overview:
  deepDiag.getStats()          - Show complete data statistics
  deepDiag.checkOrganic()      - Quick check for כימיה אורגנית 1

🔍 Detailed Analysis:
  deepDiag.auditCourse(ID)     - Deep audit of specific course
  deepDiag.compareStructure()  - Compare ALL courses localStorage vs Firebase
  deepDiag.validateImport()    - Validate data after import

🚀 Sync Operations:
  deepDiag.forceSync()         - Force deep sync of all nested data
  deepDiag.traceSync(ID)       - Trace sync process step-by-step

💡 For כימיה אורגנית 1:
  1. Run deepDiag.checkOrganic() to find the course ID
  2. Run deepDiag.auditCourse(ID) with that ID for full analysis
  3. Run deepDiag.traceSync(ID) to see sync status
`);