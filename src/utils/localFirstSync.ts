import type { Course } from '../types';

/**
 * מצב Local-First - localStorage כמקור האמת העיקרי
 */
export class LocalFirstSync {
  private static syncEnabled = true;
  private static lastSyncTime: Date | null = null;
  private static pendingChanges: Set<number> = new Set();
  
  /**
   * הפעלת מצב Local-First
   */
  static enable(): void {
    console.log('🏠 מפעיל מצב Local-First...');
    
    // שמירת הגדרה
    localStorage.setItem('syncMode', 'local-first');
    
    // האזנה לשינויים
    this.setupListeners();
    
    // הצגת סטטוס
    this.showStatus();
  }
  
  /**
   * הגדרת מאזינים לשינויים
   */
  private static setupListeners(): void {
    // האזנה לשינויים ב-localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.call(localStorage, key, value);
      
      if (key === 'studyDashboardCourses') {
        LocalFirstSync.onLocalChange();
      }
    };
    
    // האזנה לשינויים בין טאבים
    window.addEventListener('storage', (e) => {
      if (e.key === 'studyDashboardCourses' && e.newValue) {
        console.log('🔄 זוהה שינוי מטאב אחר');
        this.notifyChange();
      }
    });
  }
  
  /**
   * טיפול בשינוי מקומי
   */
  private static onLocalChange(): void {
    console.log('💾 שינוי מקומי נשמר');
    
    // סימון שיש שינויים ממתינים
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    courses.forEach((course: Course) => {
      this.pendingChanges.add(course.id);
    });
    
    // תזמון סנכרון עתידי
    this.scheduleFutureSync();
  }
  
  /**
   * תזמון סנכרון עתידי
   */
  private static scheduleFutureSync(): void {
    // סנכרון כל 30 שניות אם יש שינויים
    setTimeout(() => {
      if (this.pendingChanges.size > 0 && this.syncEnabled) {
        this.syncPendingChanges();
      }
    }, 30000);
  }
  
  /**
   * סנכרון שינויים ממתינים
   */
  private static async syncPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;
    
    console.log(`📤 מסנכרן ${this.pendingChanges.size} שינויים...`);
    
    try {
      const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
      const { firebaseService } = await import('../services/FirebaseService');
      
      for (const courseId of this.pendingChanges) {
        const course = courses.find((c: Course) => c.id === courseId);
        if (course) {
          try {
            await firebaseService.saveCourse(course);
            this.pendingChanges.delete(courseId);
            
            // המתנה בין שמירות למניעת חריגה ממכסה
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error: any) {
            if (error.code === 'resource-exhausted') {
              console.error('❌ חריגה ממכסה, דוחה סנכרון');
              break;
            }
          }
        }
      }
      
      this.lastSyncTime = new Date();
      console.log('✅ סנכרון הושלם');
      
    } catch (error) {
      console.error('❌ שגיאת סנכרון:', error);
    }
    
    // תזמון הסנכרון הבא
    this.scheduleFutureSync();
  }
  
  /**
   * הצגת סטטוס
   */
  static showStatus(): void {
    const status = document.createElement('div');
    status.id = 'local-first-status';
    status.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      direction: rtl;
      font-size: 14px;
    `;
    
    const updateStatus = () => {
      const pendingCount = this.pendingChanges.size;
      const lastSync = this.lastSyncTime 
        ? `לפני ${Math.round((Date.now() - this.lastSyncTime.getTime()) / 60000)} דקות`
        : 'טרם בוצע';
      
      status.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">📱 מצב Local-First</div>
        <div>שינויים ממתינים: ${pendingCount}</div>
        <div>סנכרון אחרון: ${lastSync}</div>
        ${pendingCount > 0 ? '<div style="margin-top: 4px; font-size: 12px;">🔄 סנכרון אוטומטי בקרוב...</div>' : ''}
      `;
    };
    
    updateStatus();
    setInterval(updateStatus, 5000);
    
    document.body.appendChild(status);
  }
  
  /**
   * יידוע על שינוי
   */
  private static notifyChange(): void {
    // רענון ה-UI אם צריך
    const event = new CustomEvent('localDataChanged', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }
  
  /**
   * סנכרון ידני מיידי
   */
  static async syncNow(): Promise<void> {
    console.log('🔄 מבצע סנכרון ידני...');
    
    this.syncEnabled = true;
    await this.syncPendingChanges();
  }
  
  /**
   * השבתת סנכרון
   */
  static disableSync(): void {
    console.log('⏸️ סנכרון אוטומטי הושבת');
    this.syncEnabled = false;
  }
  
  /**
   * הפעלת סנכרון
   */
  static enableSync(): void {
    console.log('▶️ סנכרון אוטומטי הופעל');
    this.syncEnabled = true;
    this.scheduleFutureSync();
  }
  
  /**
   * ניקוי נתונים ישנים מ-Firebase
   */
  static async cleanupFirebase(): Promise<void> {
    console.log('🧹 מנקה נתונים ישנים מ-Firebase...');
    
    try {
      const { db, auth } = await import('../config/firebase');
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      
      if (!auth?.currentUser) {
        console.error('❌ לא מחובר');
        return;
      }
      
      const userId = auth.currentUser.uid;
      
      // מחיקת נתוני בדיקות
      const testDocs = await getDocs(collection(db, `users/${userId}/quotaTest`));
      for (const docSnap of testDocs.docs) {
        await deleteDoc(doc(db, `users/${userId}/quotaTest`, docSnap.id));
      }
      
      console.log('✅ ניקוי הושלם');
      
    } catch (error) {
      console.error('❌ שגיאה בניקוי:', error);
    }
  }
}

// Export to window
(window as any).localFirst = {
  enable: () => LocalFirstSync.enable(),
  sync: () => LocalFirstSync.syncNow(),
  pause: () => LocalFirstSync.disableSync(),
  resume: () => LocalFirstSync.enableSync(),
  cleanup: () => LocalFirstSync.cleanupFirebase(),
  
  status: () => {
    console.log(`
📱 מצב Local-First
━━━━━━━━━━━━━━━━━━━
המערכת עובדת במצב שבו:
• כל השינויים נשמרים מיידית במחשב שלך
• סנכרון לענן קורה אוטומטית ברקע
• אין תלות ברשת לעבודה רגילה
• שינויים מסתנכרנים בין מכשירים בהדרגה

יתרונות:
✅ מהירות מרבית
✅ עבודה אופליין
✅ אין חריגה ממכסות
✅ אמינות גבוהה

פקודות:
localFirst.sync()   - סנכרון ידני
localFirst.pause()  - השהיית סנכרון
localFirst.resume() - חידוש סנכרון
    `);
  }
};

// הפעלה אוטומטית אם יש בעיית מכסה
setTimeout(() => {
  const lastError = localStorage.getItem('lastFirebaseError');
  if (lastError && lastError.includes('resource-exhausted')) {
    console.log('🔧 זוהתה בעיית מכסה קודמת, מפעיל Local-First');
    LocalFirstSync.enable();
  }
}, 2000);

console.log(`
🏠 מצב Local-First זמין!

לחץ בכפתור למטה להפעלה:
localFirst.enable()
`);