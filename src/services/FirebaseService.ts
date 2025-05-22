import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import type { Course, StudySession } from '../types';

export class FirebaseService {
  private userId: string | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    // Listen to auth state changes only if Firebase is configured
    if (isFirebaseConfigured && auth) {
      auth.onAuthStateChanged((user) => {
        this.userId = user?.uid || null;
      });
    }
  }

  // ========== COURSES METHODS ==========
  
  async saveCourse(course: Course): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const courseRef = doc(db!, `users/${this.userId}/courses`, course.id.toString());
    
    // שמירה עם timestamp אוטומטי
    await setDoc(courseRef, {
      ...course,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async saveAllCourses(courses: Course[]): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    // Batch write לביצועים טובים יותר
    const batch = writeBatch(db);
    
    courses.forEach(course => {
      const courseRef = doc(db!, `users/${this.userId}/courses`, course.id.toString());
      batch.set(courseRef, {
        ...course,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
    
    await batch.commit();
  }

  async getCourses(): Promise<Course[]> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const coursesRef = collection(db!, `users/${this.userId}/courses`);
    const snapshot = await getDocs(coursesRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data() as Course
    }));
  }

  // Real-time listener לסנכרון אוטומטי
  subscribeToCourses(callback: (courses: Course[]) => void): () => void {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const coursesRef = collection(db!, `users/${this.userId}/courses`);
    const q = query(coursesRef, orderBy('id'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(doc => doc.data() as Course);
      callback(courses);
    }, (error) => {
      console.error('Error syncing courses:', error);
    });
    
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // ========== STUDY SESSIONS METHODS ==========
  
  async saveStudySession(session: StudySession): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const sessionRef = doc(collection(db!, `users/${this.userId}/studySessions`));
    
    await setDoc(sessionRef, {
      ...session,
      timestamp: serverTimestamp()
    });
  }

  async getTodayStudySessions(): Promise<StudySession[]> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionsRef = collection(db!, `users/${this.userId}/studySessions`);
    const q = query(
      sessionsRef,
      where('startTime', '>=', Timestamp.fromDate(today)),
      orderBy('startTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as StudySession);
  }

  async getAllStudySessions(): Promise<StudySession[]> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const sessionsRef = collection(db!, `users/${this.userId}/studySessions`);
    const snapshot = await getDocs(sessionsRef);
    
    return snapshot.docs.map(doc => doc.data() as StudySession);
  }

  // ========== SYNC & BACKUP METHODS ==========
  
  async performFullBackup(): Promise<string> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const courses = await this.getCourses();
    const sessions = await this.getAllStudySessions();
    
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      userId: this.userId,
      data: {
        courses,
        sessions
      }
    };
    
    // שמירת גיבוי ב-Firestore
    const backupRef = doc(collection(db!, `users/${this.userId}/backups`));
    await setDoc(backupRef, backup);
    
    return backupRef.id;
  }

  // ========== MIGRATION FROM LOCALSTORAGE ==========
  
  async migrateFromLocalStorage(): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    // Migrate courses
    const localCourses = localStorage.getItem('studyDashboardCourses');
    if (localCourses) {
      try {
        const courses = JSON.parse(localCourses);
        await this.saveAllCourses(courses);
        console.log('✅ Migrated courses from localStorage');
      } catch (error) {
        console.error('Failed to migrate courses:', error);
      }
    }

    // Migrate sessions
    const localSessions = localStorage.getItem('studyDashboardSessions');
    if (localSessions) {
      try {
        const sessions = JSON.parse(localSessions);
        const batch = writeBatch(db!);
        
        sessions.forEach((session: any) => {
          const sessionRef = doc(collection(db!, `users/${this.userId}/studySessions`));
          batch.set(sessionRef, {
            ...session,
            timestamp: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log('✅ Migrated sessions from localStorage');
      } catch (error) {
        console.error('Failed to migrate sessions:', error);
      }
    }
  }

  // ========== CLEANUP ==========
  
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();