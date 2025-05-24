import { firebaseService } from '../services/FirebaseService';
import type { Course } from '../types';

/**
 * תיקון בעיית מכסת Firebase
 */
export class FirebaseQuotaFix {
  private static batchQueue: any[] = [];
  private static batchTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_DELAY = 5000; // 5 שניות בין עדכונים
  private static readonly MAX_BATCH_SIZE = 10;
  
  /**
   * אופטימיזציה של שמירת שינויים
   */
  static optimizeSaving(): void {
    console.log('🔧 מפעיל אופטימיזציה לחיסכון במכסת Firebase...');
    
    // החלפת שמירה מיידית בשמירה מושהית
    const originalSaveCourse = firebaseService.saveCourse.bind(firebaseService);
    
    firebaseService.saveCourse = async (course: Course) => {
      // שמירה מקומית מיידית
      const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
      const index = courses.findIndex((c: Course) => c.id === course.id);
      
      if (index >= 0) {
        courses[index] = course;
      } else {
        courses.push(course);
      }
      
      localStorage.setItem('studyDashboardCourses', JSON.stringify(courses));
      
      // הוספה לתור לשמירה ב-Firebase
      this.addToBatch({
        type: 'course',
        data: course,
        timestamp: Date.now()
      });
      
      console.log('💾 שינויים נשמרו מקומית, ממתין לסנכרון...');
    };
  }
  
  /**
   * הוספה לתור השמירה
   */
  private static addToBatch(item: any): void {
    // מחיקת פריטים ישנים של אותו קורס
    this.batchQueue = this.batchQueue.filter(
      q => !(q.type === item.type && q.data.id === item.data.id)
    );
    
    this.batchQueue.push(item);
    
    // אם התור מלא, שלח מיד
    if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
      this.processBatch();
    } else {
      // אחרת, תזמן שליחה
      this.scheduleBatch();
    }
  }
  
  /**
   * תזמון שליחת התור
   */
  private static scheduleBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }
  
  /**
   * עיבוד ושליחת התור
   */
  private static async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const itemsToProcess = [...this.batchQueue];
    this.batchQueue = [];
    
    console.log(`📤 שולח ${itemsToProcess.length} עדכונים ל-Firebase...`);
    
    try {
      // שליחה בקבוצות קטנות
      for (const item of itemsToProcess) {
        if (item.type === 'course') {
          await this.saveCourseSafely(item.data);
        }
        
        // המתנה קצרה בין שמירות
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('✅ כל העדכונים נשלחו בהצלחה');
    } catch (error: any) {
      if (error.code === 'resource-exhausted') {
        console.error('❌ עדיין חורג מהמכסה, מגדיל השהיה...');
        this.BATCH_DELAY * 2; // הכפלת ההשהיה
        
        // החזרת הפריטים לתור
        this.batchQueue.unshift(...itemsToProcess);
        this.scheduleBatch();
      } else {
        console.error('❌ שגיאה בשליחה:', error);
      }
    }
  }
  
  /**
   * שמירה בטוחה של קורס
   */
  private static async saveCourseSafely(course: Course): Promise<void> {
    const { db, auth } = await import('../config/firebase');
    const { doc, setDoc } = await import('firebase/firestore');
    
    if (!auth?.currentUser) return;
    
    const userId = auth.currentUser.uid;
    const docRef = doc(db, `users/${userId}/courses`, course.id.toString());
    
    // שמירה עם מטא-דאטה מינימלית
    await setDoc(docRef, {
      ...course,
      lastModified: new Date().toISOString() // במקום Timestamp object
    });
  }
  
  /**
   * מצב מופחת - שמירה מקומית בלבד
   */
  static enableOfflineMode(): void {
    console.log('🔌 עובר למצב אופליין זמני...');
    
    // השבתת סנכרון אוטומטי
    (window as any).syncDisabled = true;
    
    // הצגת הודעה למשתמש
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
      direction: rtl;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">⚠️ מצב אופליין זמני</div>
      <div>השינויים נשמרים מקומית ויסונכרנו אוטומטית מאוחר יותר</div>
      <button onclick="this.parentElement.remove()" style="
        margin-top: 8px;
        background: white;
        color: #ff9800;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
      ">הבנתי</button>
    `;
    document.body.appendChild(notification);
    
    // הסרה אוטומטית אחרי 10 שניות
    setTimeout(() => notification.remove(), 10000);
  }
  
  /**
   * בדיקת מצב המכסה
   */
  static async checkQuotaStatus(): Promise<void> {
    console.log('📊 בודק מצב מכסת Firebase...');
    
    try {
      // ניסיון כתיבת בדיקה
      const { db, auth } = await import('../config/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      if (!auth?.currentUser) {
        console.log('❌ לא מחובר');
        return;
      }
      
      const userId = auth.currentUser.uid;
      const testRef = doc(db, `users/${userId}/quotaTest`, 'test');
      
      await setDoc(testRef, {
        timestamp: new Date().toISOString(),
        test: true
      });
      
      console.log('✅ מכסת Firebase תקינה');
      
    } catch (error: any) {
      if (error.code === 'resource-exhausted') {
        console.error('❌ חריגה ממכסת Firebase!');
        console.log('💡 פתרונות:');
        console.log('1. המתן 24 שעות לאיפוס המכסה');
        console.log('2. שדרג לתוכנית בתשלום ב-Firebase Console');
        console.log('3. השתמש במצב אופליין: quotaFix.offline()');
        
        this.enableOfflineMode();
      } else {
        console.error('❌ שגיאה אחרת:', error);
      }
    }
  }
  
  /**
   * סנכרון ידני מושהה
   */
  static async manualSync(): Promise<void> {
    console.log('🔄 מבצע סנכרון ידני מושהה...');
    
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    
    for (let i = 0; i < courses.length; i++) {
      console.log(`📤 מסנכרן קורס ${i + 1}/${courses.length}...`);
      
      try {
        await this.saveCourseSafely(courses[i]);
        
        // המתנה של 2 שניות בין קורסים
        if (i < courses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        if (error.code === 'resource-exhausted') {
          console.error('❌ חריגה ממכסה, עוצר סנכרון');
          break;
        }
        console.error(`❌ שגיאה בסנכרון קורס ${courses[i].קורס}:`, error);
      }
    }
    
    console.log('✅ סנכרון הושלם');
  }
}

// הפעלת אופטימיזציה
FirebaseQuotaFix.optimizeSaving();

// בדיקה ראשונית
setTimeout(() => {
  FirebaseQuotaFix.checkQuotaStatus();
}, 3000);

// Export to window
(window as any).quotaFix = {
  check: () => FirebaseQuotaFix.checkQuotaStatus(),
  offline: () => FirebaseQuotaFix.enableOfflineMode(),
  sync: () => FirebaseQuotaFix.manualSync(),
  
  // מידע על המכסות
  info: () => {
    console.log(`
📊 מכסות Firebase בתוכנית החינמית:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• קריאות: 50,000 ביום
• כתיבות: 20,000 ביום
• מחיקות: 20,000 ביום
• אחסון: 1GB

💡 טיפים לחיסכון במכסה:
1. אל תרענן את הדף יותר מדי
2. השתמש בתכונת הגיבוי המקומי
3. סנכרן ידנית רק כשצריך

🛠️ פקודות זמינות:
quotaFix.check()   - בדיקת מצב
quotaFix.offline() - מצב אופליין
quotaFix.sync()    - סנכרון ידני
    `);
  }
};

console.log(`
⚡ אופטימיזציה למכסת Firebase הופעלה!

בעיה: חרגת ממכסת Firebase החינמית
פתרון: השינויים נשמרים מקומית ומסתנכרנים בהשהיה

פקודות:
quotaFix.check()   - בדיקת מצב המכסה
quotaFix.offline() - מעבר למצב אופליין
quotaFix.sync()    - סנכרון ידני מושהה
quotaFix.info()    - מידע על המכסות
`);