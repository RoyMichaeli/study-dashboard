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
  Timestamp,
  deleteDoc,
  // updateDoc,
  // getDoc
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import type { Course, StudySession } from '../types';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'courses' | 'studySessions';
  data?: any;
  timestamp: Date;
  retryCount: number;
}

export class FirebaseService {
  private userId: string | null = null;
  private unsubscribers: (() => void)[] = [];
  private syncQueue: SyncQueueItem[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    // Load sync queue from storage
    this.loadSyncQueueFromStorage();
    
    // Listen to auth state changes only if Firebase is configured
    if (isFirebaseConfigured && auth) {
      auth.onAuthStateChanged((user) => {
        this.userId = user?.uid || null;
        
        // Process sync queue when user logs in
        if (user && navigator.onLine) {
          this.processSyncQueue();
        }
      });
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online, processing sync queue...');
      this.processSyncQueue();
    });
  }

  // ========== COURSES METHODS ==========
  
  async saveCourse(course: Course): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    // Validate data before saving
    this.validateCourse(course);
    
    const courseRef = doc(db!, `users/${this.userId}/courses`, course.id.toString());
    
    try {
      // שמירה עם timestamp אוטומטי
      await setDoc(courseRef, {
        ...course,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      });
    } catch (error) {
      // Add to sync queue for retry
      this.addToSyncQueue('update', 'courses', course);
      throw error;
    }
  }

  async saveAllCourses(courses: Course[]): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    // Debug logging
    console.log('📤 Saving courses to Firebase:', courses.length);
    courses.forEach((course, index) => {
      console.log(`Course ${index}:`, {
        id: course.id,
        name: course.קורס,
        lessonsCount: course.שיעורים?.length || 0,
        firstLesson: course.שיעורים?.[0]?.שם || 'No lessons'
      });
    });
    
    // Validate all courses
    courses.forEach(course => this.validateCourse(course));
    
    // Batch write לביצועים טובים יותר
    const batch = writeBatch(db);
    
    courses.forEach(course => {
      const courseRef = doc(db!, `users/${this.userId}/courses`, course.id.toString());
      const dataToSave = {
        ...course,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      };
      console.log(`💾 Saving course ${course.id} with lessons:`, dataToSave.שיעורים?.length || 0);
      batch.set(courseRef, dataToSave);
    });
    
    try {
      await batch.commit();
      console.log('✅ Batch commit successful');
    } catch (error) {
      console.error('❌ Batch commit failed:', error);
      // Add all courses to sync queue
      courses.forEach(course => {
        this.addToSyncQueue('update', 'courses', course);
      });
      throw error;
    }
  }

  async getCourses(): Promise<Course[]> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const coursesRef = collection(db!, `users/${this.userId}/courses`);
    const snapshot = await getDocs(coursesRef);
    
    console.log('📥 Retrieved courses from Firebase:', snapshot.docs.length);
    
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Course ${doc.id}:`, {
        hasLessons: data.שיעורים !== undefined,
        lessonsCount: data.שיעורים?.length || 0,
        dataKeys: Object.keys(data)
      });
      return {
        ...data as Course
      };
    });
    
    return courses;
  }

  // Real-time listener לסנכרון אוטומטי with conflict resolution
  subscribeToCourses(callback: (courses: Course[]) => void): () => void {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const coursesRef = collection(db!, `users/${this.userId}/courses`);
    const q = query(coursesRef, orderBy('id'));
    
    // Track sync operations to prevent infinite loops
    const syncInProgress = new Set<number>();
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('🔔 Real-time update received, processing', snapshot.docs.length, 'courses');
      const courses: Course[] = [];
      
      for (const doc of snapshot.docs) {
        const cloudData = doc.data() as Course & { updatedAt?: any, syncedAt?: any };
        
        // Clean up any embedded session data
        if ((cloudData as any).sessions || (cloudData as any).studySessions) {
          console.log(`🧹 Cleaning embedded session data from course ${cloudData.id}`);
          delete (cloudData as any).sessions;
          delete (cloudData as any).studySessions;
        }
        
        console.log(`📋 Processing course ${doc.id}:`, {
          hasLessons: cloudData.שיעורים !== undefined,
          lessonsCount: cloudData.שיעורים?.length || 0,
          dataKeys: Object.keys(cloudData)
        });
        
        // Check if we're already syncing this course
        if (syncInProgress.has(cloudData.id)) {
          console.log(`⏭️ Skipping course ${cloudData.id} - sync already in progress`);
          courses.push(cloudData);
          continue;
        }
        
        const localData = this.getLocalCourse(cloudData.id);
        
        // Enhanced conflict resolution with loop prevention
        if (localData && this.shouldUseLocalData(localData, cloudData)) {
          // Additional check: prevent sync if data is essentially the same
          const localCopy = { ...localData };
          const cloudCopy = { ...cloudData };
          
          // Remove timestamp fields for comparison
          delete (localCopy as any).updatedAt;
          delete (localCopy as any).syncedAt;
          delete (cloudCopy as any).updatedAt;
          delete (cloudCopy as any).syncedAt;
          
          // Check if the actual content is different
          if (JSON.stringify(localCopy) === JSON.stringify(cloudCopy)) {
            console.log(`✅ Course ${cloudData.id} content is identical, skipping sync`);
            courses.push(cloudData);
            continue;
          }
          
          // Local data is newer and different, push to cloud
          console.log(`⬆️ Local data newer for course ${cloudData.id}, pushing to cloud`);
          
          // Mark as syncing to prevent loops
          syncInProgress.add(cloudData.id);
          
          try {
            await this.saveCourse(localData);
            courses.push(localData);
          } catch (error) {
            console.error(`Failed to sync course ${cloudData.id}:`, error);
            courses.push(cloudData);
          } finally {
            // Remove from syncing set after a delay
            setTimeout(() => syncInProgress.delete(cloudData.id), 5000);
          }
        } else {
          console.log(`⬇️ Using cloud data for course ${cloudData.id}`);
          courses.push(cloudData);
        }
      }
      
      console.log('📊 Final courses to callback:', courses.length);
      callback(courses);
    }, (error) => {
      console.error('Error syncing courses:', error);
      // Continue with offline mode
    });
    
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // ========== STUDY SESSIONS METHODS ==========
  
  async saveStudySession(session: StudySession): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    // Validate session data
    this.validateStudySession(session);
    
    const sessionRef = session.id 
      ? doc(db!, `users/${this.userId}/studySessions`, session.id)
      : doc(collection(db!, `users/${this.userId}/studySessions`));
    
    try {
      await setDoc(sessionRef, {
        ...session,
        id: sessionRef.id,
        timestamp: serverTimestamp(),
        syncedAt: serverTimestamp()
      });
    } catch (error) {
      // Add to sync queue for retry
      this.addToSyncQueue('create', 'studySessions', session);
      throw error;
    }
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

  // ========== REAL-TIME STUDY SESSIONS ==========
  
  subscribeToStudySessions(callback: (sessions: StudySession[]) => void): () => void {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const sessionsRef = collection(db!, `users/${this.userId}/studySessions`);
    const q = query(sessionsRef, orderBy('startTime', 'desc'));
    
    // Track sync operations to prevent infinite loops
    const syncInProgress = new Set<string>();
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessions: StudySession[] = [];
      
      for (const doc of snapshot.docs) {
        const cloudData = doc.data() as StudySession & { syncedAt?: any };
        
        // Check if we're already syncing this session
        if (syncInProgress.has(cloudData.id)) {
          sessions.push(cloudData);
          continue;
        }
        
        const localData = this.getLocalStudySession(cloudData.id);
        
        // Conflict resolution with loop prevention
        if (localData && this.shouldUseLocalData(localData, cloudData)) {
          // Mark as syncing to prevent loops
          syncInProgress.add(cloudData.id);
          
          try {
            await this.saveStudySession(localData);
            sessions.push(localData);
          } catch (error) {
            console.error(`Failed to sync session ${cloudData.id}:`, error);
            sessions.push(cloudData);
          } finally {
            // Remove from syncing set after a delay
            setTimeout(() => syncInProgress.delete(cloudData.id), 5000);
          }
        } else {
          sessions.push(cloudData);
        }
      }
      
      callback(sessions);
    }, (error) => {
      console.error('Error syncing study sessions:', error);
    });
    
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // ========== DELETE OPERATIONS ==========
  
  async deleteCourse(courseId: number): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const courseRef = doc(db!, `users/${this.userId}/courses`, courseId.toString());
    
    try {
      await deleteDoc(courseRef);
    } catch (error) {
      this.addToSyncQueue('delete', 'courses', { id: courseId });
      throw error;
    }
  }
  
  async deleteStudySession(sessionId: string): Promise<void> {
    if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured');
    if (!this.userId) throw new Error('User not authenticated');
    
    const sessionRef = doc(db!, `users/${this.userId}/studySessions`, sessionId);
    
    try {
      await deleteDoc(sessionRef);
    } catch (error) {
      this.addToSyncQueue('delete', 'studySessions', { id: sessionId });
      throw error;
    }
  }

  // ========== SYNC QUEUE MANAGEMENT ==========
  
  private addToSyncQueue(type: 'create' | 'update' | 'delete', collection: 'courses' | 'studySessions', data: any): void {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      collection,
      data,
      timestamp: new Date(),
      retryCount: 0
    };
    
    this.syncQueue.push(item);
    this.saveSyncQueueToStorage();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }
  
  private saveSyncQueueToStorage(): void {
    try {
      // Limit queue size to prevent quota issues
      if (this.syncQueue.length > 100) {
        console.warn('⚠️ Sync queue too large, trimming to 100 items');
        this.syncQueue = this.syncQueue.slice(-100);
      }
      
      localStorage.setItem('firebaseSyncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('❌ localStorage quota exceeded! Attempting cleanup...');
        this.handleQuotaExceeded();
      } else {
        console.error('Failed to save sync queue:', error);
      }
    }
  }
  
  private loadSyncQueueFromStorage(): void {
    const saved = localStorage.getItem('firebaseSyncQueue');
    if (saved) {
      try {
        this.syncQueue = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load sync queue:', error);
        this.syncQueue = [];
      }
    }
  }
  
  async processSyncQueue(): Promise<void> {
    if (!isFirebaseConfigured || !db || !this.userId) return;
    
    const itemsToProcess = [...this.syncQueue];
    
    for (const item of itemsToProcess) {
      try {
        await this.processSyncItem(item);
        // Remove from queue on success
        this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        
        // Increment retry count
        const index = this.syncQueue.findIndex(i => i.id === item.id);
        if (index !== -1) {
          this.syncQueue[index].retryCount++;
          
          // Remove if exceeded max retries
          if (this.syncQueue[index].retryCount >= this.maxRetries) {
            console.error(`Giving up on sync item ${item.id} after ${this.maxRetries} retries`);
            this.syncQueue.splice(index, 1);
          } else {
            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, this.syncQueue[index].retryCount);
            setTimeout(() => this.processSyncQueue(), delay);
          }
        }
      }
    }
    
    this.saveSyncQueueToStorage();
  }
  
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'create':
      case 'update':
        if (item.collection === 'courses') {
          await this.saveCourse(item.data);
        } else {
          await this.saveStudySession(item.data);
        }
        break;
      case 'delete':
        if (item.collection === 'courses') {
          await this.deleteCourse(item.data.id);
        } else {
          await this.deleteStudySession(item.data.id);
        }
        break;
    }
  }
  
  getSyncQueueStatus(): { pending: number; items: SyncQueueItem[] } {
    return {
      pending: this.syncQueue.length,
      items: [...this.syncQueue]
    };
  }

  // ========== CONFLICT RESOLUTION ==========
  
  private shouldUseLocalData(localData: any, cloudData: any): boolean {
    // First check: if cloud data has embedded session data, always use cloud data
    if (cloudData.sessions || cloudData.studySessions) {
      console.log(`🚫 Cloud data has embedded sessions, using cloud data to prevent loops`);
      return false;
    }
    
    // If cloud data doesn't have proper timestamps, check if content is actually different
    if (!cloudData.updatedAt || !cloudData.syncedAt) {
      // Compare actual content (excluding timestamps)
      const localCopy = { ...localData };
      const cloudCopy = { ...cloudData };
      
      // Remove all timestamp and metadata fields
      ['updatedAt', 'syncedAt', 'timestamp', 'sessions', 'studySessions'].forEach(field => {
        delete localCopy[field];
        delete cloudCopy[field];
      });
      
      // If content is identical, don't sync
      if (JSON.stringify(localCopy) === JSON.stringify(cloudCopy)) {
        return false;
      }
      
      // Content is different and cloud has no timestamps, use local
      return true;
    }
    
    // Get local timestamp from localStorage metadata
    const localTimestamp = this.getLocalTimestamp(localData.id, cloudData.קורס ? 'courses' : 'studySessions');
    if (!localTimestamp) return false;
    
    // Compare timestamps with a grace period to prevent micro-second differences
    const cloudTimestamp = cloudData.updatedAt.toDate ? cloudData.updatedAt.toDate() : new Date(cloudData.updatedAt);
    const timeDiff = localTimestamp.getTime() - cloudTimestamp.getTime();
    
    // Only consider local newer if difference is more than 1 second
    return timeDiff > 1000;
  }
  
  private getLocalCourse(courseId: number): Course | null {
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    return courses.find((c: Course) => c.id === courseId) || null;
  }
  
  private getLocalStudySession(sessionId: string): StudySession | null {
    const sessions = JSON.parse(localStorage.getItem('studyDashboardSessions') || '[]');
    return sessions.find((s: StudySession) => s.id === sessionId) || null;
  }
  
  private getLocalTimestamp(id: string | number, type: 'courses' | 'studySessions'): Date | null {
    const key = `lastUpdate_${type}_${id}`;
    const timestamp = localStorage.getItem(key);
    return timestamp ? new Date(timestamp) : null;
  }

  // ========== DATA VALIDATION ==========
  
  private validateCourse(course: Course): void {
    if (!course.id || typeof course.id !== 'number') {
      throw new Error('Course must have a valid numeric ID');
    }
    if (!course.קורס || typeof course.קורס !== 'string') {
      throw new Error('Course must have a valid name');
    }
    if (!Array.isArray(course.שיעורים)) {
      throw new Error('Course must have a lessons array');
    }
    
    // Validate each lesson
    course.שיעורים.forEach((lesson, index) => {
      if (!lesson.שם || !lesson.מצגת || !Array.isArray(lesson.נושאים)) {
        throw new Error(`Invalid lesson at index ${index}`);
      }
    });
  }
  
  private validateStudySession(session: StudySession): void {
    if (!session.duration || typeof session.duration !== 'number') {
      throw new Error('Session must have a valid duration');
    }
    if (!session.startTime) {
      throw new Error('Session must have a start time');
    }
    if (!['work', 'break'].includes(session.type)) {
      throw new Error('Session type must be either "work" or "break"');
    }
  }

  // ========== MANUAL SYNC ==========
  
  async forceSync(): Promise<void> {
    if (!isFirebaseConfigured || !db || !this.userId) {
      throw new Error('Cannot sync: Firebase not configured or user not authenticated');
    }
    
    // Process any pending items in the sync queue
    await this.processSyncQueue();
    
    // Force refresh from cloud
    const courses = await this.getCourses();
    const sessions = await this.getAllStudySessions();
    
    // Update local storage
    localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
    localStorage.setItem('studyDashboardSessions', JSON.stringify(sessions));
    
    console.log('✅ Manual sync completed');
  }

  // ========== CLEANUP ==========
  
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.saveSyncQueueToStorage();
  }
  
  // ========== EMERGENCY FIXES ==========
  
  private handleQuotaExceeded(): void {
    console.log('🧹 Handling quota exceeded error...');
    
    // Clean up Firebase cache
    const keysToRemove: string[] = [];
    Object.keys(localStorage).forEach(key => {
      // Remove non-critical Firebase data
      if (key.includes('firestore') && !key.includes('mutations') && !key.includes('target')) {
        keysToRemove.push(key);
      }
      
      // Remove old timestamps
      if (key.startsWith('lastUpdate_') && !key.includes('courses')) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`Removed: ${key}`);
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    
    // Try to clear IndexedDB Firebase data
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name && db.name.includes('firestore') && !db.name.includes('mutations')) {
            const deleteRequest = indexedDB.deleteDatabase(db.name);
            deleteRequest.onsuccess = () => {
              console.log(`Cleared IndexedDB: ${db.name}`);
            };
          }
        });
      });
    }
    
    console.log('✅ Quota cleanup complete');
  }
  
  async cleanupEmbeddedSessions(): Promise<void> {
    if (!isFirebaseConfigured || !db || !this.userId) {
      throw new Error('Cannot cleanup: Firebase not configured or user not authenticated');
    }
    
    console.log('🧹 Starting cleanup of embedded session data...');
    
    const coursesRef = collection(db!, `users/${this.userId}/courses`);
    const snapshot = await getDocs(coursesRef);
    const batch = writeBatch(db!);
    let cleanupCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if course has embedded session data
      if (data.sessions || data.studySessions) {
        console.log(`🔧 Cleaning course ${data.id} (${data.קורס})`);
        
        // Create clean copy without session data
        const cleanData = { ...data };
        delete cleanData.sessions;
        delete cleanData.studySessions;
        
        // Update with clean data
        batch.set(doc.ref, {
          ...cleanData,
          updatedAt: serverTimestamp(),
          syncedAt: serverTimestamp(),
          cleanedAt: serverTimestamp()
        });
        
        cleanupCount++;
      }
    }
    
    if (cleanupCount > 0) {
      await batch.commit();
      console.log(`✅ Cleaned ${cleanupCount} courses with embedded session data`);
    } else {
      console.log('✅ No courses with embedded session data found');
    }
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();