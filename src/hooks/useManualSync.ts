import { useState, useCallback, useEffect } from 'react';
import { firebaseService } from '../services/FirebaseService';
import { auth } from '../config/firebase';
import type { Course } from '../types';

interface SyncState {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  error: string | null;
  quotaExceeded: boolean;
}

export const useManualSync = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    error: null,
    quotaExceeded: false
  });

  // סימון שינויים מקומיים
  const markLocalChange = useCallback(() => {
    localStorage.setItem('lastLocalUpdate', new Date().toISOString());
    
    // עדכון מספר השינויים הממתינים
    const localData = localStorage.getItem('studyDashboardCourses');
    if (localData) {
      const courses = JSON.parse(localData);
      setSyncState(prev => ({ ...prev, pendingChanges: courses.length }));
    }
  }, []);

  // שמירת קורס מקומית בלבד
  const saveLocalOnly = useCallback((courses: Course[]) => {
    // שמירה ב-localStorage
    localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
    
    // סימון שיש שינוי מקומי
    markLocalChange();
    
    console.log('💾 נשמר מקומית. לחץ על כפתור הסנכרון לשמירה בענן');
  }, [markLocalChange]);

  // סנכרון ידני לענן
  const syncToCloud = useCallback(async () => {
    if (!auth?.currentUser) {
      setSyncState(prev => ({ 
        ...prev, 
        error: 'יש להתחבר כדי לסנכרן',
        isSyncing: false 
      }));
      return false;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const localData = localStorage.getItem('studyDashboardCourses');
      if (!localData) {
        setSyncState(prev => ({ 
          ...prev, 
          error: 'אין נתונים לסנכרן',
          isSyncing: false 
        }));
        return false;
      }

      const courses = JSON.parse(localData);
      let syncedCount = 0;
      const errors: string[] = [];

      // סנכרון עם בקרת קצב
      for (let i = 0; i < courses.length; i++) {
        try {
          await firebaseService.saveCourse(courses[i]);
          syncedCount++;
          
          // הצגת התקדמות
          console.log(`📤 ${syncedCount}/${courses.length} קורסים סונכרנו`);
          
          // השהיה בין קורסים
          if (i < courses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          if (error.code === 'resource-exhausted') {
            setSyncState(prev => ({ 
              ...prev, 
              quotaExceeded: true,
              error: `חריגה ממכסה. סונכרנו ${syncedCount}/${courses.length} קורסים` 
            }));
            break;
          }
          errors.push(`שגיאה בקורס ${courses[i].קורס}: ${error.message}`);
        }
      }

      if (syncedCount === courses.length) {
        // סנכרון מלא הצליח
        const now = new Date();
        localStorage.setItem('lastCloudSync', now.toISOString());
        
        setSyncState(prev => ({ 
          ...prev, 
          isSyncing: false,
          lastSync: now,
          pendingChanges: 0,
          error: null 
        }));
        
        console.log('✅ כל הקורסים סונכרנו בהצלחה!');
        return true;
      } else {
        // סנכרון חלקי
        setSyncState(prev => ({ 
          ...prev, 
          isSyncing: false,
          error: errors.length > 0 ? errors.join(', ') : prev.error
        }));
        return false;
      }

    } catch (error: any) {
      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false,
        error: error.message || 'שגיאה בסנכרון'
      }));
      console.error('❌ שגיאת סנכרון:', error);
      return false;
    }
  }, []);

  // בדיקת מצב המכסה
  const checkQuota = useCallback(async () => {
    try {
      const testData = { test: true, timestamp: new Date().toISOString() };
      await firebaseService.testConnection();
      
      setSyncState(prev => ({ ...prev, quotaExceeded: false }));
      return true;
    } catch (error: any) {
      if (error.code === 'resource-exhausted') {
        setSyncState(prev => ({ ...prev, quotaExceeded: true }));
        console.warn('⚠️ חריגה ממכסת Firebase');
      }
      return false;
    }
  }, []);

  // טעינת מצב סנכרון אחרון
  useEffect(() => {
    const lastSync = localStorage.getItem('lastCloudSync');
    if (lastSync) {
      setSyncState(prev => ({ ...prev, lastSync: new Date(lastSync) }));
    }

    // בדיקת שינויים ממתינים
    const checkPending = () => {
      const lastLocal = localStorage.getItem('lastLocalUpdate');
      const lastCloud = localStorage.getItem('lastCloudSync');
      
      if (lastLocal && (!lastCloud || new Date(lastLocal) > new Date(lastCloud))) {
        const localData = localStorage.getItem('studyDashboardCourses');
        if (localData) {
          const courses = JSON.parse(localData);
          setSyncState(prev => ({ ...prev, pendingChanges: courses.length }));
        }
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000); // כל 10 שניות

    return () => clearInterval(interval);
  }, []);

  return {
    syncState,
    saveLocalOnly,
    syncToCloud,
    markLocalChange,
    checkQuota
  };
};