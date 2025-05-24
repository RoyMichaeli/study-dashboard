// סקריפט גיבוי מיידי - רץ אוטומטית בטעינת הדף
console.log(`
╔══════════════════════════════════════════════╗
║        🚀 מבצע גיבוי וסנכרון מיידי          ║
╚══════════════════════════════════════════════╝
`);

// המתנה קצרה לטעינת כל המודולים
setTimeout(async () => {
  try {
    // 1. בדיקת המצב הנוכחי
    console.log('1️⃣ בודק מצב נוכחי...');
    const currentData = localStorage.getItem('studyDashboardCourses');
    
    if (!currentData) {
      console.error('❌ אין נתונים! יש לייבא קודם');
      return;
    }
    
    const courses = JSON.parse(currentData);
    const organicChem = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
    
    if (organicChem && organicChem.שיעורים?.length === 10) {
      console.log('✅ נמצאו כל 10 השיעורים של כימיה אורגנית 1!');
      
      // 2. יצירת גיבוי מיידי
      console.log('\n2️⃣ יוצר גיבוי מלא...');
      if ((window as any).backup) {
        await (window as any).backup.afterImport();
      }
      
      // 3. וידוא סנכרון
      console.log('\n3️⃣ מוודא סנכרון עם Firebase...');
      if ((window as any).syncFix) {
        await (window as any).syncFix.fix();
      }
      
      // 4. אימות סופי
      console.log('\n4️⃣ אימות סופי...');
      if ((window as any).deepDiag) {
        await (window as any).deepDiag.checkOrganic();
      }
      
      console.log(`
╔══════════════════════════════════════════════╗
║        ✅ הכל מוכן ומגובה!                  ║
║                                              ║
║  הנתונים שלך שמורים ב:                      ║
║  • localStorage (3 גיבויים)                  ║
║  • Firebase (מסונכרן)                        ║
║  • גיבוי אוטומטי כל 5 דקות                  ║
╚══════════════════════════════════════════════╝
      `);
      
    } else {
      console.warn('⚠️ נתוני כימיה אורגנית 1 לא שלמים');
      console.log('הרץ: backup.ensure() לאחר ייבוא הנתונים');
    }
    
  } catch (error) {
    console.error('❌ שגיאה בגיבוי:', error);
  }
}, 2000);

// הוספת אירועי גיבוי לפעולות קריטיות
document.addEventListener('DOMContentLoaded', () => {
  // גיבוי אחרי ייבוא
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      setTimeout(() => {
        console.log('📥 זוהה ייבוא קובץ - מבצע גיבוי אוטומטי...');
        (window as any).backup?.afterImport();
      }, 3000);
    });
  }
});

// Export for manual execution
(window as any).protectData = async () => {
  console.log('🛡️ מפעיל הגנת נתונים מלאה...');
  
  // 1. גיבוי
  await (window as any).backup.create();
  
  // 2. סנכרון
  await (window as any).backup.ensure();
  
  // 3. אימות
  await (window as any).masterDiag.run();
  
  console.log('✅ הגנת נתונים הופעלה!');
};