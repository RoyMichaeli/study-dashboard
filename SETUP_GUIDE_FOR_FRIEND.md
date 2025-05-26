# 📚 מדריך מפורט להתקנת Study Dashboard

## 🎯 מה זה Study Dashboard?

מערכת לימודים חכמה עם:

- ✅ ניהול שיעורים ומטרות לימוד
- ✅ מעקב התקדמות בזמן אמת
- ✅ סנכרון אוטומטי בין מכשירים
- ✅ עבודה במצב לא מקוון
- ✅ התחברות עם Google או כאורח
- ✅ טיימר פומודורו מובנה

---

## 🛠️ דרישות מערכת

### 1. Node.js (חובה)

```bash
# בדוק אם יש לך Node.js:
node --version
npm --version

# אם המספרים מתחת ל-18, הורד מ:
# https://nodejs.org/ (בחר LTS version)
```

### 2. Git (מומלץ)

```bash
# בדוק אם יש לך Git:
git --version

# אם אין, הורד מ:
# https://git-scm.com/
```

### 3. דפדפן מודרני

Chrome, Firefox, Safari, או Edge (גרסאות עדכניות)

---

## 📥 הורדה והתקנה

### אופציה 1: GitHub Clone (מומלץ)

```bash
# 1. שכפול הפרויקט
git clone https://github.com/RoyMichaeli/study-dashboard.git

# 2. כניסה לתיקייה
cd study-dashboard

# 3. התקנת dependencies
npm install

# 4. הפעלה
npm run dev
```

### אופציה 2: הורדה כקובץ ZIP

1. הורד את `study-dashboard.zip`
2. חלץ לתיקייה
3. פתח Terminal/CMD בתיקייה
4. רץ:

```bash
npm install
npm run dev
```

---

## 🔥 הגדרת Firebase (אופציונלי אבל מומלץ)

### למה Firebase?

- 🔄 סנכרון אוטומטי בין מכשירים
- 💾 גיבוי אוטומטי לענן
- 👤 התחברות עם Google
- 🌐 גישה מכל מקום

### צעד 1: יצירת פרויקט Firebase

1. **כנס ל-Firebase Console**: https://console.firebase.google.com
2. **לחץ "Create a project"**
3. **שם הפרויקט**: `study-dashboard-[השם שלך]` (למשל: `study-dashboard-david`)
4. **Google Analytics**: Enable (מומלץ)
5. **לחץ "Create project"**

### צעד 2: הפעלת Firestore Database

1. **במתפריט השמאלי**: Build → Firestore Database
2. **לחץ "Create database"**
3. **בחר "Start in test mode"** (נשנה אחר כך)
4. **בחר מיקום**: `eur3 (europe-west)` או הקרוב אליך
5. **לחץ "Done"**

### צעד 3: הפעלת Authentication

1. **במתפריט השמאלי**: Build → Authentication
2. **לחץ "Get started"**
3. **לשונית "Sign-in method"**
4. **הפעל את:**
   - **Email/Password**: Enable
   - **Google**: Enable (הוסף את המייל שלך בהגדרות)
   - **Anonymous**: Enable

### צעד 4: קבלת הגדרות Firebase

1. **Project Settings** (גלגל השיניים למעלה)
2. **גלול למטה ל"Your apps"**
3. **לחץ על הסמל של Web** `</>`
4. **רשום את האפליקציה**: App nickname: `Study Dashboard`
5. **העתק את firebaseConfig** (האובייקט שמתחיל ב-`const firebaseConfig = {`)

### צעד 5: יצירת קובץ Environment Variables

צור קובץ בשם `.env.local` בתיקיית הפרויקט עם התוכן הבא:

```bash
# Firebase Configuration - החלף עם הערכים שלך
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=study-dashboard-שמך.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=study-dashboard-שמך
VITE_FIREBASE_STORAGE_BUCKET=study-dashboard-שמך.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**איך למצוא את הערכים:**
מה-firebaseConfig שהעתקת, קח את הערכים:

```javascript
const firebaseConfig = {
  apiKey: "זה הולך ל-VITE_FIREBASE_API_KEY",
  authDomain: "זה הולך ל-VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "זה הולך ל-VITE_FIREBASE_PROJECT_ID",
  storageBucket: "זה הולך ל-VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "זה הולך ל-VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "זה הולך ל-VITE_FIREBASE_APP_ID"
};
```

### צעד 6: העלאת כללי האבטחה

1. **התקן Firebase CLI**:

```bash
npm install -g firebase-tools
```

2. **התחבר לחשבון**:

```bash
firebase login
```

3. **הגדר את הפרויקט**:

```bash
firebase init firestore
```

- בחר את הפרויקט שיצרת
- קבל את ברירות המחדל

4. **העלה את הכללים**:

```bash
firebase deploy --only firestore:rules
```

---

## 🚀 הפעלה ובדיקה

### הפעלת השרת

```bash
npm run dev
```

תראה הודעה כמו:

```
VITE v6.3.5  ready in 157 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### פתח דפדפן

כנס לכתובת: `http://localhost:5173`

### מה אתה אמור לראות:

#### עם Firebase מוגדר:

- 🔵 מסך התחברות עם אפשרויות Google ואורח
- ☁️ חיווי סנכרון עם ענן

#### בלי Firebase:

- 🔶 המערכת תעבוד במצב מקומי
- 💾 שמירה ב-localStorage של הדפדפן

---

## 📱 איך להשתמש במערכת

### 1. התחברות

- **Google**: חיבור מלא עם סנכרון
- **אורח**: גישה מהירה ללא רישום
- **מקומי**: אם אין Firebase

### 2. יצירת קורס

- לחץ "הוסף קורס"
- הדבק JSON בפורמט הנכון (ראה JSON_GUIDE.md)

### 3. הוספת שיעורים

- בתוך קורס, לחץ "הוסף שיעור"
- הדבק JSON של שיעור

### 4. מעקב התקדמות

- סמן מטרות שהשלמת
- צפה בגרפים והתקדמות
- השתמש בטיימר פומודורו

---

## 🔧 פתרון בעיות נפוצות

### שגיאה: "Cannot resolve dependency"

```bash
rm -rf node_modules package-lock.json
npm install
```

### שגיאה: "Firebase App already exists"

נקה cache של הדפדפן (Ctrl+Shift+Del)

### שגיאה: "Missing permissions"

בדוק ש:

- Firebase rules הועלו נכון
- אתה מחובר למערכת
- Project ID נכון ב-.env.local

### השיעורים לא נשמרים

- בדוק שיש חיבור לאינטרנט
- בדוק את console של הדפדפן (F12) לשגיאות
- ודא שה-.env.local נכון

### אין סנכרון בין מכשירים

- ודא שאתה מחובר עם אותו חשבון Google
- בדוק חיווי הסנכרון בפינה השמאלית עליונה

---

## 📄 קבצים חשובים

### `.env.local`

מכיל הגדרות Firebase - **אל תשתף עם אחרים!**

### `JSON_GUIDE.md`

מדריך מפורט לכתיבת JSON תקין לשיעורים

### `firestore.rules`

כללי אבטחה למסד הנתונים

---

## 🆘 קבלת עזרה

### בעיות טכניות:

1. בדוק console של הדפדפן (F12)
2. חפש שגיאות במסוף
3. נסה במצב incognito

### שאלות על שימוש:

- ראה את `JSON_GUIDE.md` להוספת תוכן
- בדוק דוגמאות ב-`corrected_lesson.json`

### עזרה נוספת:

צור קשר עם [שם השולח] לעזרה טכנית

---

## 🎉 מוכן!

אם הכל עבד, אתה אמור לראות:

- ✅ מסך התחברות/ברכה
- ✅ אפשרות ליצור קורסים
- ✅ חיווי סנכרון (אם Firebase מוגדר)
- ✅ שמירה אוטומטית של התקדמות

**תהנה מהלמידה! 📚✨**

---

## 🔄 עדכונים עתידיים

כדי לקבל עדכונים:

```bash
git pull origin development
npm install
```

או הורד גרסה חדשה מ-GitHub.
