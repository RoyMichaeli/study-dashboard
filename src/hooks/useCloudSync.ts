import { useEffect, useState, useCallback } from 'react';
import { firebaseService } from '../services/FirebaseService';
import type { Course, StudySession, SyncState } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

export const useCloudSync = () => {
  const [user] = isFirebaseConfigured && auth ? useAuthState(auth) : [null];
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Load initial data from localStorage
  useEffect(() => {
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
  }, []);

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

    // Subscribe to real-time updates
    const unsubscribe = firebaseService.subscribeToCourses((cloudCourses) => {
      setCourses(cloudCourses);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    });

    return () => {
      unsubscribe();
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
          error: 'Failed to sync. Data saved locally.'
        }));
        
        // Retry after 5 seconds if online
        if (navigator.onLine) {
          setTimeout(() => saveCourses(newCourses), 5000);
        }
      }
    }
  }, [user]);

  const saveStudySession = useCallback(async (session: StudySession) => {
    try {
      // Always save to localStorage first
      const sessions = JSON.parse(localStorage.getItem('studyDashboardSessions') || '[]');
      sessions.push(session);
      localStorage.setItem('studyDashboardSessions', JSON.stringify(sessions));

      // Save to cloud if Firebase is configured and authenticated
      if (isFirebaseConfigured && user) {
        await firebaseService.saveStudySession(session);
      } else if (isFirebaseConfigured) {
        // Store in pending queue for later sync only if Firebase is configured
        const pendingSessions = JSON.parse(
          localStorage.getItem('pendingSessions') || '[]'
        );
        pendingSessions.push(session);
        localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      if (isFirebaseConfigured) {
        // Store in localStorage for later sync only if Firebase is configured
        const pendingSessions = JSON.parse(
          localStorage.getItem('pendingSessions') || '[]'
        );
        pendingSessions.push(session);
        localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
      }
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

  return {
    courses,
    saveCourses,
    saveStudySession,
    syncState,
    syncPendingData,
    user
  };
};