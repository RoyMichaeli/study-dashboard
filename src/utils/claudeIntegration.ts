/**
 * אינטגרציה עם Claude AI
 */

export class ClaudeIntegration {
  /**
   * יצירת Bookmarklet לשיתוף נתונים עם Claude
   */
  static createBookmarklet(): string {
    return `javascript:(function(){
      const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
      const currentCourse = courses.find(c => window.location.hash.includes(c.id));
      
      if (!currentCourse) {
        alert('בחר קורס תחילה');
        return;
      }
      
      const prompt = \`
אני לומד את הקורס "\${currentCourse.קורס}".

הנושאים שאני לומד כרגע:
\${currentCourse.שיעורים.map(lesson => 
  \`\\n• \${lesson.שם}: \${lesson.נושאים.map(t => t.כותרת).join(', ')}\`
).join('')}

ההתקדמות שלי:
\${currentCourse.שיעורים.map(lesson => {
  const completed = lesson.נושאים.reduce((sum, t) => sum + (t.completedGoals?.length || 0), 0);
  const total = lesson.נושאים.reduce((sum, t) => sum + (t.מטרות?.length || 0), 0);
  return \`\\n• \${lesson.שם}: \${completed}/\${total} מטרות הושלמו\`;
}).join('')}

תן לי עצות איך להמשיך ללמוד ביעילות.
      \`;
      
      // פתיחת Claude עם הפרומפט
      window.open(\`https://claude.ai/new?q=\${encodeURIComponent(prompt)}\`, '_blank');
    })();`;
  }

  /**
   * יצירת דוח למידה ל-Claude
   */
  static generateLearningReport(): string {
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    const sessions = JSON.parse(localStorage.getItem('studyDashboardSessions') || '[]');
    
    // חישוב סטטיסטיקות
    const totalGoals = courses.reduce((sum: number, course: any) => 
      sum + course.שיעורים.reduce((s: number, l: any) => 
        s + l.נושאים.reduce((ts: number, t: any) => 
          ts + (t.מטרות?.length || 0), 0), 0), 0);
    
    const completedGoals = courses.reduce((sum: number, course: any) => 
      sum + course.שיעורים.reduce((s: number, l: any) => 
        s + l.נושאים.reduce((ts: number, t: any) => 
          ts + (t.completedGoals?.length || 0), 0), 0), 0);
    
    const totalStudyTime = sessions.reduce((sum: number, s: any) => 
      sum + (s.duration || 0), 0) / 3600; // שעות
    
    return `
# דוח למידה - דשבורד לימודים

## סיכום כללי
- **קורסים פעילים**: ${courses.length}
- **מטרות כוללות**: ${completedGoals}/${totalGoals} (${Math.round(completedGoals/totalGoals*100)}%)
- **זמן למידה מצטבר**: ${totalStudyTime.toFixed(1)} שעות
- **סשנים**: ${sessions.length}

## פירוט לפי קורסים
${courses.map((course: any) => {
  const courseGoals = course.שיעורים.reduce((sum: number, l: any) => 
    sum + l.נושאים.reduce((s: number, t: any) => 
      s + (t.מטרות?.length || 0), 0), 0);
  
  const courseCompleted = course.שיעורים.reduce((sum: number, l: any) => 
    sum + l.נושאים.reduce((s: number, t: any) => 
      s + (t.completedGoals?.length || 0), 0), 0);
  
  return `
### ${course.קורס}
- התקדמות: ${courseCompleted}/${courseGoals} מטרות (${Math.round(courseCompleted/courseGoals*100)}%)
- שיעורים: ${course.שיעורים.length}

**שיעורים:**
${course.שיעורים.map((lesson: any) => 
  `- ${lesson.שם}: ${lesson.נושאים.length} נושאים`
).join('\\n')}
`;
}).join('\\n')}

## בקשה ל-Claude
בהתבסס על הנתונים האלה, אנא:
1. נתח את דפוסי הלמידה שלי
2. זהה נקודות חוזק וחולשה
3. המלץ על אסטרטגיות למידה
4. הצע לו"ז אופטימלי להשלמת הקורסים
    `;
  }

  /**
   * יצירת שאלות חזרה אוטומטיות
   */
  static generateReviewQuestions(courseName: string, lessonName: string): string {
    const courses = JSON.parse(localStorage.getItem('studyDashboardCourses') || '[]');
    const course = courses.find((c: any) => c.קורס === courseName);
    
    if (!course) return '';
    
    const lesson = course.שיעורים.find((l: any) => l.שם === lessonName);
    if (!lesson) return '';
    
    return `
אני לומד ${courseName} - ${lessonName}.

הנושאים בשיעור:
${lesson.נושאים.map((topic: any) => `
**${topic.כותרת}**
מטרות הלמידה:
${topic.מטרות.map((g: any) => `- ${typeof g === 'string' ? g : g.text}`).join('\\n')}
`).join('\\n')}

בבקשה:
1. צור 10 שאלות חזרה מגוונות על החומר
2. כלול שאלות ברמות קושי שונות
3. הוסף שאלות יישומיות
4. ספק תשובות מפורטות
    `;
  }

  /**
   * בקשת עזרה בנושא ספציפי
   */
  static getTopicHelp(courseName: string, topicTitle: string): string {
    return `
אני לומד ${courseName} ומתקשה בנושא: ${topicTitle}.

תוכל בבקשה:
1. להסביר את הנושא בצורה פשוטה וברורה
2. לתת דוגמאות מעשיות
3. להציע דרכי זכירה (מנמוניקה)
4. לספק תרגילים לתרגול
5. להמליץ על משאבי למידה נוספים
    `;
  }
}

// פקודות לקונסול
(window as any).claude = {
  // יצירת bookmarklet
  createBookmark: () => {
    const code = ClaudeIntegration.createBookmarklet();
    console.log(`
📌 הוסף את הקוד הבא כ-Bookmark בדפדפן:

${code}

איך להוסיף:
1. לחץ Ctrl+D (או Cmd+D במק)
2. תן שם: "שאל את Claude"
3. בכתובת URL הדבק את הקוד למעלה
4. שמור

שימוש:
- היכנס לקורס בדשבורד
- לחץ על ה-Bookmark
- Claude ייפתח עם כל המידע על הקורס!
    `);
  },
  
  // יצירת דוח למידה
  report: () => {
    const report = ClaudeIntegration.generateLearningReport();
    console.log(report);
    
    // העתקה ללוח
    navigator.clipboard.writeText(report).then(() => {
      console.log('✅ הדוח הועתק! הדבק ב-Claude');
    });
  },
  
  // יצירת שאלות חזרה
  review: (courseName: string, lessonName: string) => {
    const questions = ClaudeIntegration.generateReviewQuestions(courseName, lessonName);
    console.log(questions);
    
    navigator.clipboard.writeText(questions).then(() => {
      console.log('✅ הבקשה הועתקה! הדבק ב-Claude');
    });
  },
  
  // עזרה בנושא
  help: (courseName: string, topicTitle: string) => {
    const help = ClaudeIntegration.getTopicHelp(courseName, topicTitle);
    
    navigator.clipboard.writeText(help).then(() => {
      console.log('✅ הבקשה הועתקה! הדבק ב-Claude');
    });
  },
  
  // הוראות
  info: () => {
    console.log(`
🤖 אינטגרציה עם Claude AI
═════════════════════════════

פקודות זמינות:
━━━━━━━━━━━━━━━
claude.createBookmark() - יצירת כפתור מהיר
claude.report()         - דוח למידה מלא
claude.review(קורס, שיעור) - שאלות חזרה
claude.help(קורס, נושא)   - עזרה בנושא

דוגמאות:
━━━━━━━━
claude.review("כימיה אורגנית 1", "מבוא לכימיה אורגנית")
claude.help("כימיה אורגנית 1", "ייצוג מולקולות")

💡 טיפ: השתמש ב-Bookmark לגישה מהירה!
    `);
  }
};

console.log(`
🤖 Claude Integration Ready!
Type: claude.info() for help
`);