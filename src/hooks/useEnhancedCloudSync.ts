import { useEffect, useState, useCallback, useRef } from 'react';
import { enhancedFirebaseService } from '../services/EnhancedFirebaseService';
import { firebaseService } from '../services/FirebaseService';
import type { Course, StudySession, SyncState } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { migrateCorruptedData, validateDataIntegrity } from '../utils/dataIntegrity';

/**
 * Enhanced Cloud Sync Hook with Firebase-first loading
 * This hook can be used as a drop-in replacement for useCloudSync
 */
export const useEnhancedCloudSync = () => {
  const [user, authLoading] = isFirebaseConfigured && auth ? useAuthState(auth) : [null, false];
  const [courses, setCourses] = useState<Course[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [syncQueueStatus, setSyncQueueStatus] = useState<{ pending: number; items: any[] }>({ pending: 0, items: [] });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const previousUserId = useRef<string | null>(null);
  
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: isFirebaseConfigured ? null : 'Firebase לא מוגדר - עובד במצב מקומי',
    isOffline: !navigator.onLine
  });
  
  // Loading states for UI
  const [loadingStates, setLoadingStates] = useState({
    courses: true,
    sessions: false,
    realtime: false
  });
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOffline: false }));
      // Sync when coming back online
      if (user) {
        syncPendingData();
        enhancedFirebaseService.updateDeviceActivity();
      }
    };
    
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);
  
  // Update sync queue status periodically
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    
    const updateQueueStatus = () => {
      const status = firebaseService.getSyncQueueStatus();
      setSyncQueueStatus(status);
    };
    
    updateQueueStatus();
    const interval = setInterval(updateQueueStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Listen to loading state changes
  useEffect(() => {
    const handleLoadingState = (event: any) => {
      const { key, loading, error } = event.detail;
      
      if (key === 'courses') {
        setLoadingStates(prev => ({ ...prev, courses: loading }));
        if (error) {
          setSyncState(prev => ({ ...prev, error: error.message }));
        }
      }
    };
    
    window.addEventListener('firebase-loading-state', handleLoadingState);
    return () => window.removeEventListener('firebase-loading-state', handleLoadingState);
  }, []);
  
  // Main data loading effect - Firebase first approach
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    // Handle user changes
    if (user?.uid !== previousUserId.current) {
      console.log(`👤 User changed: ${previousUserId.current} → ${user?.uid}`);
      previousUserId.current = user?.uid || null;
      setIsInitialLoad(true);
      
      // Clear local state when user changes
      if (!user) {
        setCourses([]);
        setStudySessions([]);
      }
    }
    
    const loadData = async () => {
      // For authenticated users: Firebase first
      if (isFirebaseConfigured && user) {
        try {
          console.log('🚀 Loading data for authenticated user:', user.email);
          setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
          
          // Load from Firebase
          const cloudCourses = await enhancedFirebaseService.loadUserCourses({
            forceRefresh: isInitialLoad,
            includeLocalFallback: true
          });
          
          // Migrate and validate
          const migratedCourses = migrateCorruptedData(cloudCourses);
          const validation = validateDataIntegrity(migratedCourses);
          
          if (!validation.valid) {
            console.warn('⚠️ Data integrity issues:', validation.errors);
          }
          
          setCourses(migratedCourses);
          
          // Update device activity
          enhancedFirebaseService.updateDeviceActivity();
          
          // Persist session
          enhancedFirebaseService.persistSession();
          
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            lastSync: new Date(),
            error: null
          }));
          
          setIsInitialLoad(false);
          
        } catch (error: any) {
          console.error('❌ Error loading from Firebase:', error);
          setSyncState(prev => ({
            ...prev,
            isSyncing: false,
            error: `שגיאה בטעינת נתונים: ${error.message}`
          }));
          
          // Fall back to localStorage on error
          loadLocalData();
        }
      } else {
        // Not authenticated: localStorage only
        loadLocalData();
      }
    };
    
    const loadLocalData = () => {
      console.log('💾 Loading from localStorage (unauthenticated or fallback)');
      
      const localCourses = localStorage.getItem('studyDashboardCourses');
      if (localCourses) {
        try {
          const parsed = JSON.parse(localCourses);
          const migrated = migrateCorruptedData(parsed);
          setCourses(migrated);
        } catch (error) {
          console.error('Failed to parse local courses:', error);
          loadSampleCourses();
        }
      } else {
        loadSampleCourses();
      }
      
      setLoadingStates(prev => ({ ...prev, courses: false }));
    };
    
    loadData();
  }, [user, authLoading, isInitialLoad]);
  
  // Set up real-time sync for authenticated users
  useEffect(() => {
    if (!isFirebaseConfigured || !user || authLoading) return;
    
    console.log('🔄 Setting up real-time sync for user:', user.email);
    setLoadingStates(prev => ({ ...prev, realtime: true }));
    
    // Subscribe to real-time updates
    const unsubscribeCourses = enhancedFirebaseService.subscribeToUserCourses((cloudCourses) => {
      const migratedCourses = migrateCorruptedData(cloudCourses);
      setCourses(migratedCourses);
      
      setSyncState(prev => ({
        ...prev,
        lastSync: new Date(),
        error: null
      }));
    });
    
    // Subscribe to study sessions
    const unsubscribeSessions = firebaseService.subscribeToStudySessions((cloudSessions) => {
      setStudySessions(cloudSessions);
    });
    
    setLoadingStates(prev => ({ ...prev, realtime: false }));
    
    return () => {
      unsubscribeCourses();
      unsubscribeSessions();
      enhancedFirebaseService.cleanup();
    };
  }, [user, authLoading]);
  
  // Save functions with optimistic updates
  const saveCourses = useCallback(async (newCourses: Course[]) => {
    try {
      // Mark local change
      localStorage.setItem('lastLocalChange', new Date().toISOString());
      
      // Validate and migrate
      const migratedCourses = migrateCorruptedData(newCourses);
      
      // Optimistic update
      setCourses(migratedCourses);
      
      if (isFirebaseConfigured && user) {
        setSyncState(prev => ({ ...prev, isSyncing: true }));
        
        await enhancedFirebaseService.saveUserCourses(migratedCourses, {
          optimistic: false // We already did the optimistic update
        });
        
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          error: null
        }));
      } else {
        // Just save to localStorage
        localStorage.setItem('studyDashboardCourses', JSON.stringify(migratedCourses));
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Failed to sync. Data saved locally.'
      }));
    }
  }, [user]);
  
  const saveStudySession = useCallback(async (session: StudySession) => {
    try {
      // Ensure session has an ID
      if (!session.id) {
        session.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Always save to localStorage first
      const sessions = JSON.parse(localStorage.getItem('studyDashboardSessions') || '[]');
      sessions.push(session);
      localStorage.setItem('studyDashboardSessions', JSON.stringify(sessions));
      
      // Update local state
      setStudySessions(prev => [...prev, session]);

      // Save to cloud if authenticated
      if (isFirebaseConfigured && user) {
        await firebaseService.saveStudySession(session);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      setSyncState(prev => ({
        ...prev,
        error: 'Failed to sync session. It will be retried automatically.'
      }));
    }
  }, [user]);
  
  // Delete functions
  const deleteCourse = useCallback(async (courseId: number) => {
    try {
      const updatedCourses = courses.filter(c => c.id !== courseId);
      await saveCourses(updatedCourses);
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  }, [courses, saveCourses]);
  
  const deleteStudySession = useCallback(async (sessionId: string) => {
    try {
      const updatedSessions = studySessions.filter(s => s.id !== sessionId);
      setStudySessions(updatedSessions);
      localStorage.setItem('studyDashboardSessions', JSON.stringify(updatedSessions));
      
      if (isFirebaseConfigured && user) {
        await firebaseService.deleteStudySession(sessionId);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [studySessions, user]);
  
  // Sync pending data
  const syncPendingData = useCallback(async () => {
    if (!isFirebaseConfigured || !user) return;

    try {
      // Call the sync pending data method if it exists
      const pendingSessions = JSON.parse(
        localStorage.getItem('pendingSessions') || '[]'
      );
      
      if (pendingSessions.length > 0) {
        for (const session of pendingSessions) {
          await firebaseService.saveStudySession(session);
        }
        localStorage.removeItem('pendingSessions');
        console.log(`✅ Synced ${pendingSessions.length} pending sessions`);
      }
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    }
  }, [user]);
  
  // Manual sync trigger
  const forceSync = useCallback(async () => {
    if (!isFirebaseConfigured || !user) {
      setSyncState(prev => ({
        ...prev,
        error: 'Cannot sync: Not logged in or Firebase not configured'
      }));
      return;
    }
    
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
      
      // Force refresh from cloud
      const cloudCourses = await enhancedFirebaseService.loadUserCourses({
        forceRefresh: true,
        includeLocalFallback: false
      });
      
      const migratedCourses = migrateCorruptedData(cloudCourses);
      setCourses(migratedCourses);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: `Manual sync failed: ${error.message}`
      }));
    }
  }, [user]);
  
  // Get sync metadata
  const getSyncMetadata = useCallback(() => {
    return enhancedFirebaseService.getSyncStatus();
  }, []);
  
  const loadSampleCourses = () => {
    const sampleCourses = [
      {
        id: 1,
        קורס: "כימיה אורגנית 1",
        שיעורים: [
          {
            שם: "שיעור אלקאנים א'",
            מצגת: "אלקאנים חלק א'",
            נושאים: [
              {
                כותרת: "מושגי יסוד וטרמינולוגיה",
                מטרות: [
                  "הגדרת אלקאנים והנוסחה הכללית CₙH₂ₙ₊₂",
                  "הבנה שאלקאנים הם פחמימנים רוויים",
                  "הכרת המבנה הטטראדרלי סביב כל אטום פחמן"
                ],
                completedGoals: []
              }
            ]
          }
        ]
      }
    ];
    
    setCourses(sampleCourses);
    localStorage.setItem('studyDashboardCourses', JSON.stringify(sampleCourses));
  };
  
  return {
    // Data
    courses,
    studySessions,
    
    // Actions
    saveCourses,
    saveStudySession,
    deleteCourse,
    deleteStudySession,
    forceSync,
    
    // State
    syncState,
    syncQueueStatus,
    loadingStates,
    
    // User info
    user,
    
    // Metadata
    getSyncMetadata,
    
    // Legacy compatibility
    syncPendingData
  };
};