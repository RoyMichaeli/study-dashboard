import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  type Unsubscribe
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import type { Course } from '../types';
import { firebaseService } from './FirebaseService';

/**
 * Enhanced Firebase Service with improved user-specific data handling
 * This is an adapter layer that enhances the existing FirebaseService
 */
export class EnhancedFirebaseService {
  private static instance: EnhancedFirebaseService;
  private userId: string | null = null;
  private userDataCache: Map<string, any> = new Map();
  private loadingStates: Map<string, boolean> = new Map();
  private errorStates: Map<string, Error | null> = new Map();
  private lastSyncTime: Date | null = null;
  private unsubscribers: Unsubscribe[] = [];
  
  private constructor() {
    // Listen to auth state changes
    if (isFirebaseConfigured && auth) {
      auth.onAuthStateChanged((user) => {
        const previousUserId = this.userId;
        this.userId = user?.uid || null;
        
        // Clear cache and localStorage when user changes
        if (previousUserId !== this.userId) {
          this.clearCache();
          this.clearLocalStorage(); // Clear localStorage when switching users
          console.log(`🔄 User changed from ${previousUserId} to ${this.userId}`);
        }
      });
    }
  }
  
  // Clear localStorage when switching users (Firebase-first mode)
  private clearLocalStorage(): void {
    localStorage.removeItem('studyDashboardCourses');
    localStorage.removeItem('studyDashboardSessions');
    console.log('🧹 Cleared localStorage - Firebase is now single source of truth');
  }
  
  static getInstance(): EnhancedFirebaseService {
    if (!EnhancedFirebaseService.instance) {
      EnhancedFirebaseService.instance = new EnhancedFirebaseService();
    }
    return EnhancedFirebaseService.instance;
  }
  
  // ========== USER-SPECIFIC DATA PATHS ==========
  
  private getUserPath(subPath: string): string {
    if (!this.userId) throw new Error('No authenticated user');
    return `users/${this.userId}/${subPath}`;
  }
  
  // Commented out - not currently used
  // private getUserDocRef(collection: string, docId: string): DocumentReference {
  //   if (!db) throw new Error('Firebase not configured');
  //   return doc(db, this.getUserPath(collection), docId);
  // }
  
  // ========== LOADING STATE MANAGEMENT ==========
  
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  getError(key: string): Error | null {
    return this.errorStates.get(key) || null;
  }
  
  private setLoadingState(key: string, loading: boolean, error: Error | null = null) {
    this.loadingStates.set(key, loading);
    this.errorStates.set(key, error);
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('firebase-loading-state', {
      detail: { key, loading, error }
    }));
  }
  
  // ========== ENHANCED COURSE OPERATIONS ==========
  
  async loadUserCourses(options: {
    forceRefresh?: boolean;
    includeLocalFallback?: boolean;
  } = {}): Promise<Course[]> {
    const { forceRefresh = false, includeLocalFallback = true } = options;
    
    this.setLoadingState('courses', true);
    
    try {
      // Check cache first
      if (!forceRefresh && this.userDataCache.has('courses')) {
        const cached = this.userDataCache.get('courses');
        console.log('📦 Returning cached courses:', cached.length);
        return cached;
      }
      
      // Load from Firebase first
      if (isFirebaseConfigured && this.userId) {
        console.log('☁️ Loading courses from Firebase for user:', this.userId);
        
        const courses = await firebaseService.getCourses();
        this.userDataCache.set('courses', courses);
        this.lastSyncTime = new Date();
        
        // Update localStorage as backup
        localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
        localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
        
        this.setLoadingState('courses', false);
        return courses;
      }
      
      // Fallback to localStorage if not authenticated or Firebase not available
      if (includeLocalFallback) {
        console.log('💾 Falling back to localStorage');
        const local = localStorage.getItem('studyDashboardCourses');
        if (local) {
          const courses = JSON.parse(local);
          this.setLoadingState('courses', false);
          return courses;
        }
      }
      
      this.setLoadingState('courses', false);
      return [];
      
    } catch (error) {
      console.error('❌ Error loading courses:', error);
      this.setLoadingState('courses', false, error as Error);
      
      // Try localStorage fallback on error
      if (includeLocalFallback) {
        const local = localStorage.getItem('studyDashboardCourses');
        if (local) {
          console.log('💾 Using localStorage after Firebase error');
          return JSON.parse(local);
        }
      }
      
      throw error;
    }
  }
  
  async saveUserCourses(courses: Course[], options: {
    optimistic?: boolean;
    skipLocalSave?: boolean;
  } = {}): Promise<void> {
    const { optimistic = true, skipLocalSave = false } = options;
    
    // Optimistic update
    if (optimistic) {
      this.userDataCache.set('courses', courses);
      window.dispatchEvent(new CustomEvent('courses-updated', { detail: courses }));
    }
    
    // Save to localStorage immediately
    if (!skipLocalSave) {
      localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
    }
    
    // Save to Firebase
    if (isFirebaseConfigured && this.userId) {
      try {
        await firebaseService.saveAllCourses(courses);
        this.lastSyncTime = new Date();
        localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
      } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        
        // Revert optimistic update on error
        if (optimistic) {
          const previous = await this.loadUserCourses({ forceRefresh: true });
          this.userDataCache.set('courses', previous);
          window.dispatchEvent(new CustomEvent('courses-updated', { detail: previous }));
        }
        
        throw error;
      }
    }
  }
  
  // ========== REAL-TIME SYNC WITH USER CONTEXT ==========
  
  subscribeToUserCourses(callback: (courses: Course[]) => void): () => void {
    if (!isFirebaseConfigured || !db || !this.userId) {
      console.warn('⚠️ Cannot subscribe: Firebase not configured or user not authenticated');
      return () => {};
    }
    
    console.log('👁️ Setting up real-time sync for user:', this.userId);
    
    const coursesRef = collection(db, this.getUserPath('courses'));
    const q = query(coursesRef, orderBy('id'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const courses: Course[] = [];
        snapshot.docs.forEach(doc => {
          courses.push(doc.data() as Course);
        });
        
        console.log('🔔 Real-time update:', courses.length, 'courses');
        
        // Update cache
        this.userDataCache.set('courses', courses);
        this.lastSyncTime = new Date();
        
        // Update localStorage
        localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
        localStorage.setItem('lastCloudSync', this.lastSyncTime.toISOString());
        
        // Notify callback
        callback(courses);
      },
      (error) => {
        console.error('❌ Real-time sync error:', error);
        this.setLoadingState('courses-realtime', false, error);
      }
    );
    
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }
  
  // ========== SESSION PERSISTENCE ==========
  
  async persistSession(): Promise<void> {
    if (!auth?.currentUser) return;
    
    // Store session info
    const sessionData = {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      lastActive: new Date().toISOString()
    };
    
    localStorage.setItem('userSession', JSON.stringify(sessionData));
  }
  
  async restoreSession(): Promise<boolean> {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) return false;
    
    try {
      const session = JSON.parse(sessionData);
      console.log('🔐 Found stored session for:', session.email);
      
      // Check if session is still valid (less than 7 days old)
      const lastActive = new Date(session.lastActive);
      const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActive > 7) {
        console.log('⏰ Session expired');
        localStorage.removeItem('userSession');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      return false;
    }
  }
  
  // ========== SYNC STATUS ==========
  
  getSyncStatus(): {
    lastSync: Date | null;
    isOnline: boolean;
    hasLocalChanges: boolean;
    userId: string | null;
  } {
    const lastSyncStr = localStorage.getItem('lastCloudSync');
    const lastLocalChange = localStorage.getItem('lastLocalChange');
    
    const hasLocalChanges = lastLocalChange && lastSyncStr
      ? new Date(lastLocalChange) > new Date(lastSyncStr)
      : false;
    
    return {
      lastSync: this.lastSyncTime,
      isOnline: navigator.onLine,
      hasLocalChanges,
      userId: this.userId
    };
  }
  
  // ========== CROSS-DEVICE AWARENESS ==========
  
  async getDeviceActivity(): Promise<{
    devices: Array<{
      deviceId: string;
      lastActive: Date;
      browser: string;
    }>;
  }> {
    if (!isFirebaseConfigured || !db || !this.userId) {
      return { devices: [] };
    }
    
    try {
      const deviceRef = doc(db, this.getUserPath('metadata'), 'devices');
      const deviceDoc = await getDoc(deviceRef);
      
      if (deviceDoc.exists()) {
        const data = deviceDoc.data();
        return {
          devices: Object.entries(data.devices || {}).map(([id, info]: [string, any]) => ({
            deviceId: id,
            lastActive: info.lastActive?.toDate() || new Date(),
            browser: info.browser || 'Unknown'
          }))
        };
      }
      
      return { devices: [] };
    } catch (error) {
      console.error('❌ Error fetching device activity:', error);
      return { devices: [] };
    }
  }
  
  async updateDeviceActivity(): Promise<void> {
    if (!isFirebaseConfigured || !db || !this.userId) return;
    
    try {
      const deviceId = this.getDeviceId();
      const deviceRef = doc(db, this.getUserPath('metadata'), 'devices');
      
      await setDoc(deviceRef, {
        devices: {
          [deviceId]: {
            lastActive: serverTimestamp(),
            browser: navigator.userAgent,
            platform: navigator.platform
          }
        }
      }, { merge: true });
    } catch (error) {
      console.error('❌ Error updating device activity:', error);
    }
  }
  
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }
  
  // ========== CLEANUP ==========
  
  clearCache(): void {
    this.userDataCache.clear();
    this.loadingStates.clear();
    this.errorStates.clear();
    this.lastSyncTime = null;
  }
  
  cleanup(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.clearCache();
  }
}

// Export singleton instance
export const enhancedFirebaseService = EnhancedFirebaseService.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).enhancedFirebase = enhancedFirebaseService;
}