import { useEffect, useState, useCallback } from 'react';
import { firebaseService } from '../services/FirebaseService';
import type { Course, StudySession, SyncState } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

export const useCloudSync = () => {
  const [user] = isFirebaseConfigured && auth ? useAuthState(auth) : [null];
  const [courses, setCourses] = useState<Course[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [syncQueueStatus, setSyncQueueStatus] = useState<{ pending: number; items: any[] }>({ pending: 0, items: [] });
  
  // Load initial data from localStorage only if not authenticated
  useEffect(() => {
    // If user is authenticated, data will be loaded from Firebase
    if (isFirebaseConfigured && user) {
      return;
    }
    
    const localCourses = localStorage.getItem('studyDashboardCourses');
    if (localCourses) {
      try {
        const parsed = JSON.parse(localCourses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCourses(parsed);
          return;
        }
      } catch (error) {
        console.error('Failed to parse local courses:', error);
      }
    }
    
    // Load sample courses if no valid data found
    loadSampleCourses();
  }, [user]);

  const loadSampleCourses = () => {
    // נתונים לדוגמה מה-App.tsx המקורי
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
                completedGoals: ["הגדרת אלקאנים והנוסחה הכללית CₙH₂ₙ₊₂"]
              }
            ]
          },
          {
            שם: "שיעור אלקאנים ב'",
            מצגת: "אלקאנים חלק ב'",
            נושאים: [
              {
                כותרת: "נומנקלטורה של אלקאנים",
                מטרות: [
                  "שמות 12 האלקאנים הראשונים ונוסחאותיהם",
                  "נוסחה כללית של קבוצת אלקיל: CₙH₂ₙ₊₁",
                  "הכרת קבוצות אלקיל נפוצות"
                ],
                completedGoals: []
              }
            ]
          }
        ]
      },
      {
        id: 2,
        קורס: "מבני נתונים ואלגוריתמים",
        שיעורים: [
          {
            שם: "מערכים ורשימות",
            מצגת: "מבני נתונים בסיסיים",
            נושאים: [
              {
                כותרת: "מערכים",
                מטרות: [
                  "הגדרת מערך",
                  "פעולות על מערכים",
                  "מורכבות זמן"
                ],
                completedGoals: ["הגדרת מערך"]
              }
            ]
          }
        ]
      }
    ];
    
    setCourses(sampleCourses);
    localStorage.setItem('studyDashboardCourses', JSON.stringify(sampleCourses));
  };
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: isFirebaseConfigured ? null : 'Firebase לא מוגדר - עובד במצב מקומי',
    isOffline: !navigator.onLine
  });
  
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

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOffline: false }));
      // Sync when coming back online
      syncPendingData();
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
  }, []);

  // Set up real-time sync only if Firebase is configured and user is authenticated
  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true }));

    // Migrate local data to cloud on first login
    firebaseService.migrateFromLocalStorage().catch(console.error);

    // First, load existing data from cloud
    const loadInitialData = async () => {
      try {
        const cloudCourses = await firebaseService.getCourses();
        const cloudSessions = await firebaseService.getAllStudySessions();
        
        // Set cloud data
        setCourses(cloudCourses);
        setStudySessions(cloudSessions);
        
        // Update local storage with cloud data
        localStorage.setItem('studyDashboardCourses', JSON.stringify(cloudCourses));
        localStorage.setItem('studyDashboardSessions', JSON.stringify(cloudSessions));
        
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          error: null
        }));
      } catch (error) {
        console.error('Failed to load initial data from cloud:', error);
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: 'Failed to load data from cloud'
        }));
      }
    };
    
    loadInitialData();
    
    // Then subscribe to real-time updates for courses
    const unsubscribeCourses = firebaseService.subscribeToCourses((cloudCourses) => {
      setCourses(cloudCourses);
      // Update local storage with cloud data
      localStorage.setItem('studyDashboardCourses', JSON.stringify(cloudCourses));
      // Update local storage timestamps for conflict resolution
      cloudCourses.forEach(course => {
        localStorage.setItem(`lastUpdate_courses_${course.id}`, new Date().toISOString());
      });
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    });
    
    // Subscribe to real-time updates for study sessions
    const unsubscribeSessions = firebaseService.subscribeToStudySessions((cloudSessions) => {
      setStudySessions(cloudSessions);
      // Update local storage
      localStorage.setItem('studyDashboardSessions', JSON.stringify(cloudSessions));
      cloudSessions.forEach(session => {
        localStorage.setItem(`lastUpdate_studySessions_${session.id}`, new Date().toISOString());
      });
    });

    return () => {
      unsubscribeCourses();
      unsubscribeSessions();
      firebaseService.cleanup();
    };
  }, [user]);

  // Save functions with automatic retry
  const saveCourses = useCallback(async (newCourses: Course[]) => {
    try {
      if (isFirebaseConfigured && user) {
        setSyncState(prev => ({ ...prev, isSyncing: true }));
      }
      
      // שמירה מקומית מיידית (תמיד)
      setCourses(newCourses);
      localStorage.setItem('studyDashboardCourses', JSON.stringify(newCourses));
      
      // Update local timestamps for conflict resolution
      newCourses.forEach(course => {
        localStorage.setItem(`lastUpdate_courses_${course.id}`, new Date().toISOString());
      });
      
      // שמירה בענן רק אם Firebase מוגדר ומחובר
      if (isFirebaseConfigured && user) {
        await firebaseService.saveAllCourses(newCourses);
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date(),
          error: null
        }));
      }
    } catch (error) {
      console.error('Sync error:', error);
      if (isFirebaseConfigured && user) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: 'Failed to sync. Data saved locally and queued for retry.'
        }));
      }
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
      localStorage.setItem(`lastUpdate_studySessions_${session.id}`, new Date().toISOString());
      
      // Update local state
      setStudySessions(prev => [...prev, session]);

      // Save to cloud if Firebase is configured and authenticated
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

  // Sync pending data when coming online or logging in
  const syncPendingData = useCallback(async () => {
    if (!isFirebaseConfigured || !user) return;

    try {
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

  // Trigger sync when user logs in
  useEffect(() => {
    if (user) {
      syncPendingData();
    }
  }, [user, syncPendingData]);

  // Delete functions
  const deleteCourse = useCallback(async (courseId: number) => {
    try {
      // Remove from local state and storage
      const updatedCourses = courses.filter(c => c.id !== courseId);
      setCourses(updatedCourses);
      localStorage.setItem('studyDashboardCourses', JSON.stringify(updatedCourses));
      
      // Delete from cloud
      if (isFirebaseConfigured && user) {
        await firebaseService.deleteCourse(courseId);
      }
    } catch (error) {
      console.error('Failed to delete course:', error);
      setSyncState(prev => ({
        ...prev,
        error: 'Failed to delete course. It will be retried automatically.'
      }));
    }
  }, [courses, user]);
  
  const deleteStudySession = useCallback(async (sessionId: string) => {
    try {
      // Remove from local state and storage
      const updatedSessions = studySessions.filter(s => s.id !== sessionId);
      setStudySessions(updatedSessions);
      localStorage.setItem('studyDashboardSessions', JSON.stringify(updatedSessions));
      
      // Delete from cloud
      if (isFirebaseConfigured && user) {
        await firebaseService.deleteStudySession(sessionId);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      setSyncState(prev => ({
        ...prev,
        error: 'Failed to delete session. It will be retried automatically.'
      }));
    }
  }, [studySessions, user]);
  
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
      await firebaseService.forceSync();
      
      // Reload data from cloud
      const cloudCourses = await firebaseService.getCourses();
      const cloudSessions = await firebaseService.getAllStudySessions();
      
      setCourses(cloudCourses);
      setStudySessions(cloudSessions);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Manual sync failed. Please try again.'
      }));
    }
  }, [user]);
  
  return {
    courses,
    studySessions,
    saveCourses,
    saveStudySession,
    deleteCourse,
    deleteStudySession,
    syncState,
    syncPendingData,
    syncQueueStatus,
    forceSync,
    user
  };
};