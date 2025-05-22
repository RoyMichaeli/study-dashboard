import { useEffect, useState, useCallback } from 'react';
import { firebaseService } from '../services/FirebaseService';
import type { Course, StudySession, SyncState } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';

export const useCloudSync = () => {
  const [user] = useAuthState(auth);
  const [courses, setCourses] = useState<Course[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
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

  // Load initial data and set up real-time sync
  useEffect(() => {
    if (!user) {
      // Load from localStorage if not authenticated
      const localCourses = localStorage.getItem('studyDashboardCourses');
      if (localCourses) {
        try {
          setCourses(JSON.parse(localCourses));
        } catch (error) {
          console.error('Failed to parse local courses:', error);
        }
      }
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
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      
      // שמירה מקומית מיידית
      setCourses(newCourses);
      localStorage.setItem('studyDashboardCourses', JSON.stringify(newCourses));
      
      // שמירה בענן אם מחובר
      if (user) {
        await firebaseService.saveAllCourses(newCourses);
      }
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        error: null
      }));
    } catch (error) {
      console.error('Sync error:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Failed to sync. Data saved locally.'
      }));
      
      // Retry after 5 seconds if online
      if (navigator.onLine && user) {
        setTimeout(() => saveCourses(newCourses), 5000);
      }
    }
  }, [user]);

  const saveStudySession = useCallback(async (session: StudySession) => {
    try {
      // Always save to localStorage first
      const sessions = JSON.parse(localStorage.getItem('studyDashboardSessions') || '[]');
      sessions.push(session);
      localStorage.setItem('studyDashboardSessions', JSON.stringify(sessions));

      // Save to cloud if authenticated
      if (user) {
        await firebaseService.saveStudySession(session);
      } else {
        // Store in pending queue for later sync
        const pendingSessions = JSON.parse(
          localStorage.getItem('pendingSessions') || '[]'
        );
        pendingSessions.push(session);
        localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      // Store in localStorage for later sync
      const pendingSessions = JSON.parse(
        localStorage.getItem('pendingSessions') || '[]'
      );
      pendingSessions.push(session);
      localStorage.setItem('pendingSessions', JSON.stringify(pendingSessions));
    }
  }, [user]);

  // Sync pending data when coming online or logging in
  const syncPendingData = useCallback(async () => {
    if (!user) return;

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