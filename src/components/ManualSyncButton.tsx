import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, CloudSync, Check, AlertCircle } from 'lucide-react';
import { firebaseService } from '../services/FirebaseService';
import { auth } from '../config/firebase';

export const ManualSyncButton: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'offline'>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // בדיקת שינויים ממתינים
  useEffect(() => {
    const checkPendingChanges = () => {
      const lastLocalUpdate = localStorage.getItem('lastLocalUpdate');
      const lastCloudSync = localStorage.getItem('lastCloudSync');
      
      if (lastLocalUpdate && (!lastCloudSync || new Date(lastLocalUpdate) > new Date(lastCloudSync))) {
        // יש שינויים שלא סונכרנו
        const localData = localStorage.getItem('studyDashboardCourses');
        if (localData) {
          const courses = JSON.parse(localData);
          setPendingChanges(courses.length);
        }
      } else {
        setPendingChanges(0);
      }
    };

    // בדיקה ראשונית
    checkPendingChanges();

    // בדיקה כל פעם שיש שינוי
    window.addEventListener('storage', checkPendingChanges);
    
    // בדיקה תקופתית
    const interval = setInterval(checkPendingChanges, 5000);

    return () => {
      window.removeEventListener('storage', checkPendingChanges);
      clearInterval(interval);
    };
  }, []);

  // טעינת זמן סנכרון אחרון
  useEffect(() => {
    const lastSync = localStorage.getItem('lastCloudSync');
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }
  }, []);

  const handleSync = async () => {
    // בדיקת חיבור
    if (!auth?.currentUser) {
      setSyncStatus('offline');
      setErrorMessage('יש להתחבר כדי לסנכרן');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }

    setSyncStatus('syncing');
    setErrorMessage('');

    try {
      // קריאת נתונים מקומיים
      const localData = localStorage.getItem('studyDashboardCourses');
      if (!localData) {
        setSyncStatus('error');
        setErrorMessage('אין נתונים לסנכרן');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return;
      }

      const courses = JSON.parse(localData);
      console.log(`🔄 מסנכרן ${courses.length} קורסים לענן...`);

      // סנכרון כל קורס עם השהיה קטנה
      let syncedCount = 0;
      for (const course of courses) {
        try {
          await firebaseService.saveCourse(course);
          syncedCount++;
          
          // השהיה קטנה בין קורסים למניעת חריגה ממכסה
          if (courses.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error: any) {
          if (error.code === 'resource-exhausted') {
            setErrorMessage(`סונכרנו ${syncedCount}/${courses.length} קורסים. חריגה ממכסה יומית`);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
            return;
          }
          throw error;
        }
      }

      // עדכון זמני סנכרון
      const now = new Date();
      localStorage.setItem('lastCloudSync', now.toISOString());
      setLastSyncTime(now);
      setPendingChanges(0);

      setSyncStatus('success');
      console.log('✅ סנכרון הושלם בהצלחה!');
      
      // חזרה למצב רגיל אחרי 3 שניות
      setTimeout(() => setSyncStatus('idle'), 3000);

    } catch (error: any) {
      console.error('❌ שגיאת סנכרון:', error);
      setSyncStatus('error');
      setErrorMessage(error.message || 'שגיאה בסנכרון');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // חישוב זמן מאז סנכרון אחרון
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return 'טרם סונכרן';
    
    const diff = Date.now() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `לפני ${days} ימים`;
    if (hours > 0) return `לפני ${hours} שעות`;
    if (minutes > 0) return `לפני ${minutes} דקות`;
    return 'לפני רגע';
  };

  // בחירת אייקון וצבע לפי מצב
  const getButtonContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <CloudSync className="w-5 h-5 animate-spin" />,
          text: 'מסנכרן...',
          className: 'bg-blue-500 hover:bg-blue-600 cursor-wait'
        };
      case 'success':
        return {
          icon: <Check className="w-5 h-5" />,
          text: 'סונכרן בהצלחה!',
          className: 'bg-green-500 hover:bg-green-600'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'שגיאה',
          className: 'bg-red-500 hover:bg-red-600'
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-5 h-5" />,
          text: 'לא מחובר',
          className: 'bg-gray-500 hover:bg-gray-600'
        };
      default:
        return {
          icon: <Cloud className="w-5 h-5" />,
          text: pendingChanges > 0 ? `סנכרן (${pendingChanges})` : 'סנכרן',
          className: pendingChanges > 0 
            ? 'bg-orange-500 hover:bg-orange-600 animate-pulse' 
            : 'bg-indigo-600 hover:bg-indigo-700'
        };
    }
  };

  const { icon, text, className } = getButtonContent();

  return (
    <div className="relative inline-block">
      <button
        onClick={handleSync}
        disabled={syncStatus === 'syncing'}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium
          transition-all duration-200 transform hover:scale-105
          disabled:opacity-70 disabled:cursor-not-allowed
          ${className}
        `}
        title={`סנכרון אחרון: ${getTimeSinceSync()}`}
      >
        {icon}
        <span>{text}</span>
      </button>

      {/* הודעת שגיאה */}
      {errorMessage && syncStatus === 'error' && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-100 text-red-700 p-2 rounded-lg text-sm whitespace-nowrap">
          {errorMessage}
        </div>
      )}

      {/* אינדיקטור שינויים ממתינים */}
      {pendingChanges > 0 && syncStatus === 'idle' && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-bounce">
          {pendingChanges}
        </div>
      )}

      {/* טולטיפ עם מידע נוסף */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div>סנכרון אחרון: {getTimeSinceSync()}</div>
          {pendingChanges > 0 && (
            <div className="text-orange-300 mt-1">יש {pendingChanges} שינויים ממתינים</div>
          )}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    </div>
  );
};