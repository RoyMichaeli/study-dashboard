/**
 * הגדרות סנכרון ידני
 */
export class ManualSyncConfig {
  private static isEnabled = false;
  
  /**
   * הפעלת מצב סנכרון ידני
   */
  static enable(): void {
    console.log('🔄 מפעיל מצב סנכרון ידני...');
    
    this.isEnabled = true;
    localStorage.setItem('syncMode', 'manual');
    
    // השבתת סנכרון אוטומטי
    this.disableAutoSync();
    
    // הצגת הודעה
    this.showNotification();
    
    console.log(`
✅ מצב סנכרון ידני הופעל!
━━━━━━━━━━━━━━━━━━━━━━━━━━
• כל השינויים נשמרים מקומית מיידית
• סנכרון לענן רק בלחיצה על כפתור
• מניעת חריגה ממכסת Firebase
• שליטה מלאה על תזמון הסנכרון
    `);
  }
  
  /**
   * השבתת סנכרון אוטומטי
   */
  private static disableAutoSync(): void {
    // השבתת Firebase real-time listeners
    const { firebaseService } = require('../services/FirebaseService');
    if (firebaseService.disableAutoSync) {
      firebaseService.disableAutoSync();
    }
    
    // סימון במערכת
    (window as any).autoSyncDisabled = true;
    
    // עדכון הגדרות
    localStorage.setItem('autoSyncEnabled', 'false');
  }
  
  /**
   * הצגת הודעה למשתמש
   */
  private static showNotification(): void {
    const notification = document.createElement('div');
    notification.id = 'manual-sync-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      direction: rtl;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="flex-shrink: 0;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 7l-5-5-5 5M17 17l-5 5-5-5"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <h3 style="font-weight: bold; margin: 0 0 8px 0; font-size: 18px;">
            מצב סנכרון ידני הופעל
          </h3>
          <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">
            מעכשיו כל השינויים נשמרים מקומית באופן מיידי. 
            לסנכרון עם הענן, לחץ על כפתור הסנכרון.
          </p>
          <div style="display: flex; gap: 8px;">
            <button onclick="
              document.getElementById('manual-sync-notification').remove();
            " style="
              background: white;
              color: #2563eb;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
            ">הבנתי</button>
            <button onclick="
              manualSync.info();
              document.getElementById('manual-sync-notification').remove();
            " style="
              background: transparent;
              color: white;
              border: 1px solid white;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
            ">מידע נוסף</button>
          </div>
        </div>
      </div>
    `;
    
    // הוספת אנימציה
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // הסרה אוטומטית אחרי 15 שניות
    setTimeout(() => {
      const elem = document.getElementById('manual-sync-notification');
      if (elem) elem.remove();
    }, 15000);
  }
  
  /**
   * בדיקה האם מצב ידני פעיל
   */
  static isManualMode(): boolean {
    return this.isEnabled || localStorage.getItem('syncMode') === 'manual';
  }
  
  /**
   * חזרה לסנכרון אוטומטי
   */
  static disable(): void {
    console.log('🔄 חוזר למצב סנכרון אוטומטי...');
    
    this.isEnabled = false;
    localStorage.setItem('syncMode', 'auto');
    localStorage.setItem('autoSyncEnabled', 'true');
    
    // הפעלת סנכרון אוטומטי מחדש
    (window as any).autoSyncDisabled = false;
    
    console.log('✅ סנכרון אוטומטי הופעל מחדש');
    
    // רענון הדף לטעינת ההגדרות החדשות
    setTimeout(() => {
      if (confirm('יש לרענן את הדף להפעלת סנכרון אוטומטי. לרענן עכשיו?')) {
        window.location.reload();
      }
    }, 1000);
  }
  
  /**
   * מידע על המצב הנוכחי
   */
  static getInfo(): void {
    const isManual = this.isManualMode();
    const lastSync = localStorage.getItem('lastCloudSync');
    const lastLocal = localStorage.getItem('lastLocalUpdate');
    
    console.log(`
📊 מצב סנכרון נוכחי
━━━━━━━━━━━━━━━━━━━━
מצב: ${isManual ? '🔄 ידני' : '🔁 אוטומטי'}
סנכרון אחרון לענן: ${lastSync ? new Date(lastSync).toLocaleString('he-IL') : 'טרם בוצע'}
עדכון מקומי אחרון: ${lastLocal ? new Date(lastLocal).toLocaleString('he-IL') : 'אין'}

${isManual ? `
יתרונות מצב ידני:
✅ שליטה מלאה על הסנכרון
✅ חיסכון במכסת Firebase
✅ מהירות מקסימלית
✅ עבודה אופליין מלאה

פקודות:
• לסנכרון: לחץ על כפתור הסנכרון
• למצב אוטומטי: manualSync.disable()
` : `
מצב אוטומטי:
• סנכרון מיידי לענן
• עדכון בזמן אמת בין מכשירים
• עלול לחרוג ממכסת Firebase

למצב ידני: manualSync.enable()
`}
    `);
  }
}

// Export to window
(window as any).manualSync = {
  enable: () => ManualSyncConfig.enable(),
  disable: () => ManualSyncConfig.disable(),
  info: () => ManualSyncConfig.getInfo(),
  isEnabled: () => ManualSyncConfig.isManualMode()
};

// הפעלה אוטומטית אם הוגדר קודם
if (localStorage.getItem('syncMode') === 'manual') {
  setTimeout(() => {
    ManualSyncConfig.enable();
  }, 1000);
}

console.log(`
🎯 סנכרון ידני זמין!

להפעלה: manualSync.enable()
למידע: manualSync.info()
`);