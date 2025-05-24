import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Course } from '../types';

interface BackupMetadata {
  timestamp: string;
  courseCount: number;
  totalLessons: number;
  totalTopics: number;
  totalGoals: number;
  version: string;
  source: 'manual' | 'auto' | 'import';
}

/**
 * Comprehensive Data Backup Manager
 * מנהל גיבויים מקיף לשמירת כל הנתונים
 */
export class DataBackupManager {
  private static readonly BACKUP_KEYS = {
    primary: 'studyDashboardCourses',
    backup1: 'studyDashboardCoursesBackup',
    backup2: 'studyDashboardCoursesBackup2',
    backup3: 'studyDashboardCoursesBackup3',
    metadata: 'studyDashboardBackupMetadata',
    lastGood: 'lastKnownGoodCourses',
    importBackup: 'importedDataBackup'
  };

  /**
   * יצירת גיבוי מלא של כל הנתונים
   */
  static async createFullBackup(source: 'manual' | 'auto' | 'import' = 'manual'): Promise<void> {
    console.log('🔒 יוצר גיבוי מלא של כל הנתונים...');
    
    try {
      // קריאת הנתונים הנוכחיים
      const currentData = localStorage.getItem(this.BACKUP_KEYS.primary);
      if (!currentData) {
        console.error('❌ אין נתונים לגבות');
        return;
      }

      const courses = JSON.parse(currentData) as Course[];
      
      // חישוב סטטיסטיקות
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        courseCount: courses.length,
        totalLessons: 0,
        totalTopics: 0,
        totalGoals: 0,
        version: '1.0',
        source
      };

      // ספירת כל האלמנטים
      courses.forEach(course => {
        metadata.totalLessons += course.שיעורים?.length || 0;
        course.שיעורים?.forEach(lesson => {
          metadata.totalTopics += lesson.נושאים?.length || 0;
          lesson.נושאים?.forEach(topic => {
            metadata.totalGoals += topic.מטרות?.length || 0;
          });
        });
      });

      console.log(`📊 מגבה ${metadata.courseCount} קורסים עם ${metadata.totalLessons} שיעורים`);

      // רוטציה של גיבויים קיימים
      const backup2 = localStorage.getItem(this.BACKUP_KEYS.backup1);
      const backup3 = localStorage.getItem(this.BACKUP_KEYS.backup2);
      
      if (backup3) {
        localStorage.setItem(this.BACKUP_KEYS.backup3, backup3);
      }
      if (backup2) {
        localStorage.setItem(this.BACKUP_KEYS.backup2, backup2);
      }

      // שמירת הגיבוי החדש
      localStorage.setItem(this.BACKUP_KEYS.backup1, currentData);
      localStorage.setItem(this.BACKUP_KEYS.metadata, JSON.stringify(metadata));

      // אם זה import, שמור גם בגיבוי מיוחד
      if (source === 'import') {
        localStorage.setItem(this.BACKUP_KEYS.importBackup, currentData);
        localStorage.setItem('importBackupMetadata', JSON.stringify(metadata));
      }

      // גיבוי ל-Firebase
      if (auth?.currentUser) {
        await this.backupToFirebase(courses, metadata);
      }

      console.log('✅ גיבוי הושלם בהצלחה!');
      
      // בדיקת כימיה אורגנית
      const organicChem = courses.find(c => c.קורס === "כימיה אורגנית 1");
      if (organicChem) {
        console.log(`✅ "כימיה אורגנית 1" נשמר עם ${organicChem.שיעורים?.length} שיעורים`);
      }

    } catch (error) {
      console.error('❌ שגיאה ביצירת גיבוי:', error);
    }
  }

  /**
   * גיבוי ל-Firebase
   */
  private static async backupToFirebase(courses: Course[], metadata: BackupMetadata): Promise<void> {
    if (!db || !auth?.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      
      // שמירת מטא-דאטה
      const metaRef = doc(db, `users/${userId}/backups`, 'metadata');
      await setDoc(metaRef, {
        ...metadata,
        backupDate: new Date()
      });

      // שמירת כל קורס בנפרד
      for (const course of courses) {
        const courseRef = doc(db, `users/${userId}/courses`, course.id.toString());
        await setDoc(courseRef, {
          ...course,
          lastBackup: new Date(),
          backupVersion: metadata.version
        });

        // אם הקורס גדול, שמור גם בגיבוי מיוחד
        const dataSize = new Blob([JSON.stringify(course)]).size;
        if (dataSize > 500000) { // 500KB
          const backupRef = doc(db, `users/${userId}/backups/courses`, course.id.toString());
          await setDoc(backupRef, {
            ...course,
            backupTimestamp: new Date(),
            originalSize: dataSize
          });
        }
      }

      console.log('☁️ גיבוי ל-Firebase הושלם');
    } catch (error) {
      console.error('⚠️ שגיאה בגיבוי ל-Firebase:', error);
    }
  }

  /**
   * שחזור מגיבוי
   */
  static async restoreFromBackup(backupKey: string = 'backup1'): Promise<boolean> {
    console.log(`🔄 משחזר מגיבוי ${backupKey}...`);

    try {
      const backupData = localStorage.getItem(
        this.BACKUP_KEYS[backupKey as keyof typeof this.BACKUP_KEYS] || backupKey
      );

      if (!backupData) {
        console.error('❌ לא נמצא גיבוי');
        return false;
      }

      const courses = JSON.parse(backupData);
      
      // בדיקת תקינות
      if (!Array.isArray(courses) || courses.length === 0) {
        console.error('❌ נתוני גיבוי לא תקינים');
        return false;
      }

      // שמירת הנתונים הנוכחיים כגיבוי חירום
      const currentData = localStorage.getItem(this.BACKUP_KEYS.primary);
      if (currentData) {
        localStorage.setItem('emergencyBackup', currentData);
      }

      // שחזור הנתונים
      localStorage.setItem(this.BACKUP_KEYS.primary, backupData);
      
      console.log(`✅ שוחזרו ${courses.length} קורסים מגיבוי`);
      
      // בדיקת כימיה אורגנית
      const organicChem = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
      if (organicChem) {
        console.log(`✅ "כימיה אורגנית 1" שוחזר עם ${organicChem.שיעורים?.length} שיעורים`);
      }

      // טריגר סנכרון
      window.dispatchEvent(new Event('storage'));
      
      return true;

    } catch (error) {
      console.error('❌ שגיאה בשחזור:', error);
      return false;
    }
  }

  /**
   * רשימת כל הגיבויים הזמינים
   */
  static listAvailableBackups(): void {
    console.log('\n📋 גיבויים זמינים:');
    
    Object.entries(this.BACKUP_KEYS).forEach(([key, storageKey]) => {
      const data = localStorage.getItem(storageKey);
      if (data && key !== 'metadata') {
        try {
          const courses = JSON.parse(data);
          if (Array.isArray(courses)) {
            const organic = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
            console.log(`\n${key}: ${courses.length} קורסים`);
            if (organic) {
              console.log(`  - כימיה אורגנית 1: ${organic.שיעורים?.length} שיעורים`);
            }
          }
        } catch (e) {
          // Skip invalid data
        }
      }
    });

    // בדיקת מטא-דאטה
    const metadata = localStorage.getItem(this.BACKUP_KEYS.metadata);
    if (metadata) {
      try {
        const meta = JSON.parse(metadata);
        console.log(`\nגיבוי אחרון: ${new Date(meta.timestamp).toLocaleString('he-IL')}`);
        console.log(`מקור: ${meta.source}`);
      } catch (e) {
        // Skip
      }
    }
  }

  /**
   * וידוא שהנתונים נשמרים בכל מקום
   */
  static async ensureDataEverywhere(): Promise<void> {
    console.log('\n🔄 מוודא שהנתונים שמורים בכל מקום...');

    const currentData = localStorage.getItem(this.BACKUP_KEYS.primary);
    if (!currentData) {
      console.error('❌ אין נתונים לסנכרן');
      return;
    }

    const courses = JSON.parse(currentData);
    
    // 1. יצירת גיבוי מקומי
    await this.createFullBackup('auto');

    // 2. סנכרון ל-Firebase
    if (auth?.currentUser) {
      console.log('☁️ מסנכרן ל-Firebase...');
      const { firebaseService } = await import('../services/FirebaseService');
      
      for (const course of courses) {
        await firebaseService.saveCourse(course);
      }
      
      console.log('✅ סנכרון ל-Firebase הושלם');
    }

    // 3. שמירה כ"last known good"
    const organic = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
    if (organic && organic.שיעורים?.length === 10) {
      localStorage.setItem(this.BACKUP_KEYS.lastGood, currentData);
      console.log('✅ נשמר כ"last known good" configuration');
    }

    console.log('\n✅ הנתונים שמורים ומגובים בכל מקום!');
  }

  /**
   * הגדרת גיבוי אוטומטי
   */
  static setupAutoBackup(): void {
    // גיבוי כל 5 דקות
    setInterval(() => {
      this.createFullBackup('auto');
    }, 5 * 60 * 1000);

    // גיבוי בכל שינוי
    window.addEventListener('storage', (e) => {
      if (e.key === this.BACKUP_KEYS.primary && e.newValue) {
        setTimeout(() => {
          this.createFullBackup('auto');
        }, 1000); // delay קטן למניעת לולאות
      }
    });

    console.log('⏰ גיבוי אוטומטי הופעל');
  }
}

// Export to window
(window as any).backup = {
  create: () => DataBackupManager.createFullBackup('manual'),
  restore: (key?: string) => DataBackupManager.restoreFromBackup(key),
  list: () => DataBackupManager.listAvailableBackups(),
  ensure: () => DataBackupManager.ensureDataEverywhere(),
  auto: () => DataBackupManager.setupAutoBackup(),
  
  // Quick backup after import
  afterImport: () => {
    console.log('📥 מגבה נתונים לאחר ייבוא...');
    DataBackupManager.createFullBackup('import').then(() => {
      DataBackupManager.ensureDataEverywhere();
    });
  }
};

// Auto-setup
DataBackupManager.setupAutoBackup();

console.log(`
🔒 מנהל גיבויים הופעל! 🔒

פקודות זמינות:
backup.create()      - יצירת גיבוי ידני
backup.restore()     - שחזור מגיבוי
backup.list()        - רשימת גיבויים
backup.ensure()      - וידוא שמירה בכל מקום
backup.afterImport() - גיבוי לאחר ייבוא

גיבוי אוטומטי: כל 5 דקות
`);